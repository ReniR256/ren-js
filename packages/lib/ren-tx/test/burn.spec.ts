/* eslint-disable no-console */

import RenJS from "@renproject/ren";
import { EventObject, interpret, State } from "xstate";
import { config as loadDotEnv } from "dotenv";

import {
    burnConfig,
    burnMachine,
    BurnMachineContext,
    BurnMachineSchema,
    GatewaySession,
} from "../src";
import { buildMockLockChain, buildMockMintChain } from "./testutils/mock";
import { SECONDS } from "@renproject/utils";

loadDotEnv();
const providers = {
    testDestChain: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
};

const mintTransaction: GatewaySession = {
    id: "a unique identifier",
    type: "burn",
    network: "testnet",
    sourceAsset: "renBTC",
    sourceChain: "testSourceChain",
    destAddress: "0x0000000000000000000000000000000000000000",
    destChain: "testDestChain",
    targetAmount: 1,
    userAddress: "0x0000000000000000000000000000000000000000",
    expiryTime: new Date().getTime() + 1000 * 60 * 60 * 24,
    transactions: {},
    customParams: {},
};

jest.setTimeout(1000 * 500);
describe("BurnMachine", () => {
    it("should create a burn tx", async () => {
        const fromChainMap = {
            testSourceChain: () => {
                return buildMockMintChain().mockMintChain;
            },
        };

        const toChainMap = {
            testDestChain: () => {
                return buildMockLockChain().mockLockChain;
            },
        };

        const machine = burnMachine.withConfig(burnConfig).withContext({
            tx: mintTransaction,
            sdk: new RenJS("testnet", {
                networkDelay: 1 * SECONDS,
            }),
            autoSubmit: true,
            providers,
            fromChainMap,
            toChainMap,
        });
        let result: any = {};

        const p = new Promise<
            State<BurnMachineContext, EventObject, BurnMachineSchema>
        >((resolve, reject) => {
            const service = interpret(machine)
                .onTransition((state) => {
                    console.log(state.value);
                    if ((state.value as string).includes("error")) {
                        reject(state.value);
                    }
                    if (state.value === "srcSettling") {
                        // we have successfully created a burn tx
                        result = state;
                        service.send({
                            type: "CONFIRMED",
                            data: { sourceTxHash: "123" },
                        } as any);
                    }
                    if (state.value === "srcConfirmed") {
                        service.stop();
                    }
                })
                .onStop(() => {
                    console.log("Interpreter stopped");
                });

            // Start the service
            service.start();
            service.subscribe(((state: any, evt: any) => {
                /* */
            }) as any);
            service.onStop(() => {
                resolve(result);
                console.log("Service stopped");
            });
        });
        return p.then((state) => {
            expect(
                Object.keys(state.context?.tx?.transactions || {}).length,
            ).toBeGreaterThan(0);
        });
    });
});
