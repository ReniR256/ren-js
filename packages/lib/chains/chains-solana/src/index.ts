import {
    AbiItem,
    BurnDetails,
    ContractCall,
    getRenNetworkDetails,
    LockAndMintTransaction,
    Logger,
    MintChain,
    ChainStatic,
    RenNetwork,
    RenNetworkDetails,
    RenNetworkString,
} from "@renproject/interfaces";
import { EventEmitter } from "events";
import BigNumber from "bignumber.js";
import { Connection } from "@solana/web3.js";

export type SolTransaction = string;
export type SolAddress = string;

export interface SolConfig {
    name: string;
    chain: string;
    isTestnet: boolean;
    networkID: number;
    chainLabel: string;
    etherscan: string;
    addresses: {
        GatewayRegistry: string;
        BasicAdapter: string;
    };
}

interface SolanaProvider<Transaction> {
    connection: Connection;
    wallet: {
        publicKey: string;
        signTransaction: (transaction: Transaction) => Promise<Transaction>;
    };
}

const renMainnet: SolConfig = {
    name: "mainnet",
    chain: "mainnet",
    isTestnet: false,
    networkID: 1,
    chainLabel: "",
    etherscan: "",
    addresses: {
        GatewayRegistry: "",
        BasicAdapter: "",
    },
};

const resolveNetwork = (
    renNetwork: RenNetwork | RenNetworkString | RenNetworkDetails | SolConfig,
) => {
    return renMainnet;
};

export class Solana
    implements MintChain<SolTransaction, SolAddress, SolConfig> {
    constructor(
        readonly provider: SolanaProvider<SolTransaction>,
        renNetwork?:
            | RenNetwork
            | RenNetworkString
            | RenNetworkDetails
            | SolConfig,
    ) {
        if (renNetwork) {
            // this.renNetworkDetails = resolveNetwork(renNetwork);
        }
    }

    public utils = {
        resolveChainNetwork: resolveNetwork,
        addressIsValid: (a) => true,
        addressExplorerLink: (
            address: SolAddress,
            network:
                | RenNetwork
                | RenNetworkString
                | RenNetworkDetails
                | SolConfig,
        ): string =>
            `${
                (this.utils.resolveChainNetwork(network) || renMainnet)
                    .etherscan
            }/address/${address}`,

        transactionExplorerLink: (
            transaction: SolTransaction,
            network:
                | RenNetwork
                | RenNetworkString
                | RenNetworkDetails
                | SolConfig = renMainnet,
        ): string =>
            `${
                (this.utils.resolveChainNetwork(network) || renMainnet)
                    .etherscan
            }/tx/${transaction}`,
    };

    /**
     * Should be set by `constructor` or `initialize`.
     */
    renNetwork?: RenNetworkDetails;
    /**
     * `initialize` allows RenJS to pass in parameters after the user has
     * initialized the Chain. This allows the user to pass in network
     * parameters such as the network only once.
     *
     * If the Chain's constructor has an optional network parameter and the
     * user has explicitly initialized it, the Chain should ignore the
     * network passed in to `initialize`. This is to allow different network
     * combinations, such as working with testnet Bitcoin and a local Ethereum
     * chain - whereas the default `testnet` configuration would use testnet
     * Bitcoin and Ethereum's Kovan testnet.
     */
    initialize = (
        network: RenNetwork | RenNetworkString | RenNetworkDetails,
    ) => {
        return this;
    };

    withProvider = (...args: any[]) => {
        return this;
    };

    assetIsNative = (asset: string) => {
        return asset === "SOL";
    };
    /**
     * `assetIsSupported` should return true if the the asset is native to the
     * chain or if the asset can be minted onto the chain.
     *
     * ```ts
     * ethereum.assetIsSupported = asset => asset === "ETH" || asset === "BTC" || ...;
     * ```
     */
    assetIsSupported = (asset: string) => {
        // FIXME: need to figure out how to get a list of supported assets from the program
        return asset === "SOL";
    };

    assetDecimals = (asset: string) => {
        return 16;
    };

    transactionID = (transaction: SolTransaction) => {
        // TODO: use the transaction signature for both?
        return transaction;
    };

    transactionConfidence = async (transaction: SolTransaction) => {
        // NOTE: Solana has a built in submit and wait until target confirmations
        // function; so it might not make sense to use this?
        const tx = await this.provider.connection.getConfirmedTransaction(
            transaction,
        );
        tx.blockTime;
        this.provider.connection.getBlockTime(0);
        return {
            current: 0,
            target: 0,
        };
    };

    transactionRPCFormat = (transaction: SolTransaction, v2?: boolean) => {
        return {
            txid: Buffer.from(transaction),
            txindex: "",
        };
    };

    transactionFromID = (
        txid: string | Buffer,
        txindex: string,
        reversed?: boolean,
    ) => {
        return String(txid);
    };

    name: "solana";
    resolveTokenGatewayContract: (asset: string) => "";

    /**
     * `submitMint` should take the completed mint transaction from RenVM and
     * submit its signature to the mint chain to finalize the mint.
     */

    submitMint = (
        asset: string,
        contractCalls: ContractCall[],
        mintTx: LockAndMintTransaction,
        eventEmitter: EventEmitter,
    ) => {
        return "";
    };
    findTransaction: (asset: string, nHash: Buffer, sigHash?: Buffer) => "";
    /**
     * Read a burn reference from an Ethereum transaction - or submit a
     * transaction first if the transaction details have been provided.
     */
    findBurnTransaction = (
        asset: string,
        burn: {
            transaction?: SolTransaction;
            burnNonce?: Buffer | string | number;
            contractCalls?: ContractCall[];
        },
        eventEmitter: EventEmitter,
        logger: Logger,
        networkDelay?: number,
    ) => {
        const x: BurnDetails<SolTransaction> = {
            transaction: "",
            amount: new BigNumber(0),
            to: "",
            nonce: new BigNumber(0),
        };
        return x;
    };
    /**
     * Fetch the mint and burn fees for an asset.
     */
    getFees(asset: string) {
        return { burn: 0, mint: 0 };
    }
    /**
     * Fetch the addresses' balance of the asset's representation on the chain.
     */
    getBalance(asset: string, address: SolAddress) {
        return new BigNumber(0);
    }

    getMintParams = (asset: string) => {
        return undefined;
        //SyncOrPromise<OverwritableLockAndMintParams | undefined>;
    };

    getBurnParams?: (
        asset: string,
        burnPayload?: string,
    ) => {
        //SyncOrPromise<OverwritableBurnAndReleaseParams | undefined>;
    };
}
