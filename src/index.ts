import { crypto } from "bitcore-lib";
import Web3 from "web3";
import { PromiEvent } from "web3-core";

import { payloadToShiftInABI } from "./abi";
import { Token } from "./assets";
import { Ox, strip0x } from "./blockchain/common";
import { ShiftedInResponse, ShiftedOutResponse, Shifter } from "./lightnode/shifter";
import { Network } from "./networks";
import {
    fixSignature, generateAddress, generateHash, generatePHash, Payload, retrieveDeposits, SECONDS,
    signatureToString, sleep, UTXO,
} from "./utils";

export * from "./lightnode/shifter";
export * from "./blockchain/btc";
export * from "./blockchain/zec";
export * from "./blockchain/common";
export * from "./assets";
export * from "./networks";

export { UTXO } from "./utils";

// Types of RenSDK's methods ///////////////////////////////////////////////////
// tslint:disable-next-line:no-any (FIXME:)
export type SignAndSubmit = PromiEvent<any>;
export interface Submit {
    signAndSubmit: (web3: Web3, from: string) => SignAndSubmit;
    onMessageID: () => Promise<string>;
}
export interface Wait { submit: () => Promise<Submit>; }
export interface Shift {
    addr: () => string;
    wait: (confirmations: number) => Promise<Wait>;
    waitSignSubmit?: (web3: Web3, from: string, confirmations: number) => Promise<SignAndSubmit>;
}

interface ShiftParams {
    sendToken: Token;
    sendTo: string;
    sendAmount: number;
    contractFn: string;
    contractParams: Payload;
    nonce?: string;
}

interface BurnParams {
    web3: Web3;
    sendToken: Token;
    txHash: string;
}

export default class RenSDK {

    // Internal state
    private readonly network: Network;
    private readonly shifter: Shifter;

    // Takes the address of the adapter smart contract
    constructor(network: Network) {
        this.network = network;
        this.shifter = new Shifter(network.lightnodeURL);
    }

    // Submits the commitment and transaction to the darknodes, and then submits
    // the signature to the adapter address
    public burnDetails = async (params: BurnParams): Promise<ShiftedOutResponse> => {
        const { web3, sendToken, txHash } = params;

        const receipt = await web3.eth.getTransactionReceipt(txHash);

        if (!receipt.logs) {
            throw Error("No events found in transaction");
        }

        let ref;
        for (const [, event] of Object.entries(receipt.logs)) {
            if (event.topics[0] === "0x2275318eaeb892d338c6737eebf5f31747c1eab22b63ccbc00cd93d4e785c116") {
                ref = event.topics[1] as string;
                // const log = web3.eth.abi.decodeParameters(["bytes", "uint256", "uint256", "bytes32"], event.data);
                // ref = log.ref;
                break;
            }
        }

        if (!ref) {
            throw Error("No reference ID found in logs");
        }

        const messageID = await this.shifter.submitWithdrawal(sendToken, ref);

        const response = await this._checkForResponse(messageID) as ShiftedOutResponse;

        return response;
    }

    // Submits the commitment and transaction to the darknodes, and then submits
    // the signature to the adapter address
    public shift = (params: ShiftParams): Shift => {
        const { sendToken, contractFn, contractParams, sendAmount, sendTo } = params;
        let { nonce } = params;

        if (!nonce) {
            nonce = Ox(crypto.Random.getRandomBuffer(32));
        }

        // TODO: Validate inputs
        const hash = generateHash(contractParams, sendAmount, strip0x(sendTo), sendToken, nonce, this.network);
        const gatewayAddress = generateAddress(sendToken, hash, this.network);
        const waitAfterShift = this._waitAfterShift(sendToken, strip0x(sendTo), sendAmount, nonce, contractFn, contractParams, gatewayAddress, hash);
        const result: Shift = {
            addr: () => gatewayAddress,
            wait: waitAfterShift,
        };
        return {
            ...result,
            waitSignSubmit: this._waitSignSubmit(result),
        };
    }

    private readonly _waitSignSubmit = (shift: Shift) =>
        async (web3: Web3, from: string, confirmations: number): Promise<SignAndSubmit> => {
            const deposit = await shift.wait(confirmations);
            const signature = await deposit.submit();
            return signature.signAndSubmit(web3, from);
        }

    private readonly _waitAfterShift = (shiftAction: Token, to: string, amount: number, nonce: string, contractFn: string, contractParams: Payload, gatewayAddress: string, hash: string) =>
        async (confirmations: number): Promise<Wait> => {
            let deposits: UTXO[] = [];
            const depositedAmount = (): number => {
                return deposits.map(item => item.utxo.amount).reduce((prev, next) => prev + next);
            };
            while (deposits.length === 0 || depositedAmount() < amount) {
                try {
                    deposits = await retrieveDeposits(shiftAction, gatewayAddress, 10, confirmations);
                } catch (error) {
                    console.error(error);
                    continue;
                }
                if (deposits.length > 0) { break; }
                await sleep(10 * SECONDS);
            }

            return {
                submit: this._submitDepositAfterShift(shiftAction, to, amount, nonce, contractFn, contractParams, hash),
            };
        }

    // tslint:disable-next-line: no-any (FIXME)
    private readonly _submitDepositAfterShift = (shiftAction: Token, to: string, amount: number, nonce: string, contractFn: string, contractParams: Payload, hash: string) =>
        async (): Promise<Submit> => {
            const messageID = await this.shifter.submitDeposits(shiftAction, to, amount, nonce, generatePHash(contractParams), hash, this.network);

            const response = await this._checkForResponse(messageID) as ShiftedInResponse;

            // TODO: Use github.com/primus/eventemitter3
            const onMessageID = async () => {
                return messageID;
            };

            return {
                signAndSubmit: this._signAndSubmitAfterShift(to, contractFn, contractParams, signatureToString(fixSignature(response, this.network)), response.amount, response.nhash),
                onMessageID,
            };
        }

    // tslint:disable-next-line: no-any (FIXME)
    private readonly _signAndSubmitAfterShift = (to: string, contractFn: string, contractParams: Payload, signature: string, amount: number | string, nhash: string) =>
        (web3: Web3, from: string): SignAndSubmit => {
            const params = [
                ...contractParams.map(value => value.value),
                Ox(amount.toString(16)), // _amount: BigNumber
                Ox(nhash), // _nHash: string
                Ox(signature), // _sig: string
            ];

            const ABI = payloadToShiftInABI(contractFn, contractParams);
            const contract = new web3.eth.Contract(ABI, to);

            return contract.methods[contractFn](
                ...params,
            ).send({ from, gas: 1000000 });
        }

    private readonly _checkForResponse = async (messageID: string): Promise<ShiftedInResponse | ShiftedOutResponse> => {
        let response: ShiftedInResponse | ShiftedOutResponse | undefined;
        while (!response) {
            try {
                console.log(`Checking for response...`);
                response = await this.shifter.checkForResponse(messageID) as ShiftedInResponse;
                if (response) {
                    console.log("Response from Lightnode:");
                    console.log(response);
                    break;
                }
            } catch (error) {
                console.log("Retrying in 5 seconds");
                await sleep(5 * SECONDS);
                // TODO: Ignore "result not available",
                // throw otherwise
            }
        }
        return response;
    }
}
