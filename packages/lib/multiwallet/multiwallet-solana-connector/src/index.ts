import { RenNetwork } from "@renproject/interfaces";
import {
    ConnectorEmitter,
    ConnectorInterface,
    ConnectorUpdate,
} from "@renproject/multiwallet-base-connector";
import Wallet from "@project-serum/sol-wallet-adapter";
import { Connection, clusterApiUrl } from "@solana/web3.js";

export interface SolanaConnectorOptions {
    debug?: boolean;
    network: RenNetwork;
    providerURL: string;
}

const renNetworkToSolanaNetwork: { [k in RenNetwork]: string } = {
    [RenNetwork.DevnetVDot3]: clusterApiUrl("devnet"),
    [RenNetwork.Mainnet]: clusterApiUrl("mainnet-beta"),
    [RenNetwork.Testnet]: clusterApiUrl("testnet"),
    [RenNetwork.TestnetVDot3]: clusterApiUrl("testnet"),
    [RenNetwork.MainnetVDot3]: clusterApiUrl("mainnet-beta"),
};

interface SolanaProvider {
    connection: Connection;
    wallet: typeof Wallet;
}

export class SolanaConnector
    implements ConnectorInterface<SolanaProvider, string> {
    readonly debug?: boolean;
    supportsTestnet = true;
    emitter: ConnectorEmitter<SolanaProvider, string>;
    network: RenNetwork;
    connection: Connection;
    wallet: typeof Wallet;
    providerURL: string;
    constructor({
        debug = false,
        network,
        providerURL,
    }: SolanaConnectorOptions) {
        this.debug = debug;
        this.network = network;
        this.connection = new Connection(
            renNetworkToSolanaNetwork[this.network]
        );
        this.providerURL = providerURL;
        this.emitter = new ConnectorEmitter<SolanaProvider, string>(debug);
    }

    handleUpdate = (args: any) => {
        this.getStatus()
            .then((...args) => {
                this.emitter.emitUpdate(...args);
            })
            .catch(async () => this.deactivate());
    };

    async activate() {
        this.wallet = new Wallet(
            this.providerURL,
            this.connection._rpcEndpoint
        );
        this.wallet.on("connect", this.handleUpdate);
        // when disconnecting inside an external window,
        // you need to manually bind the function
        this.wallet.on("disconnect", this.deactivate.bind(this));
        await this.wallet.connect();
        return {
            provider: { connection: this.connection, wallet: this.wallet },
            renNetwork: this.network,
        };
    }
    async getProvider() {
        return { connection: this.connection, wallet: this.wallet };
    }

    async deactivate() {
        if (!this.emitter) return;
        this.emitter.emitDeactivate();
        this.wallet.disconnect();
    }

    // Get the complete connector status in one call
    async getStatus(): Promise<ConnectorUpdate<SolanaProvider, string>> {
        if (this.debug) console.debug("getting status");
        return {
            account: await this.getAccount(),
            renNetwork: await this.getRenNetwork(),
            provider: await this.getProvider(),
        };
    }

    // Get default wallet pubkey
    async getAccount() {
        if (this.debug) console.debug("getting account");
        const account = (await this.getProvider()).wallet.publicKey.toBase58();
        if (!account) {
            throw new Error("Not activated");
        }
        return account;
    }
    // Provide network selected during construction
    async getRenNetwork() {
        if (this.debug) console.debug("getting chain");
        return this.network;
    }
}
