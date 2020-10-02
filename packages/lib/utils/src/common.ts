import { AbiItem, EthArgs } from "@renproject/interfaces";

import { assertType } from "./assert";

/**
 * Represents 1 second for functions that accept a parameter in milliseconds.
 */
export const SECONDS = 1000;

/**
 * Pauses the thread for the specified number of milliseconds.
 * @param ms The number of milliseconds to pause for.
 */
export const sleep = async (ms: number): Promise<void> =>
    // tslint:disable-next-line: no-string-based-set-timeout
    new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Remove 0x prefix from a hex string. If the input doesn't have a 0x prefix,
 * it's returned unchanged.
 * @param hex The hex value to be prefixed.
 */
export const strip0x = (hex: string) => {
    // Type validation
    assertType("string", { hex });

    return hex.substring(0, 2) === "0x" ? hex.slice(2) : hex;
};

/**
 * Add a 0x prefix to a hex value, converting to a string first. If the input
 * is already prefixed, it's returned unchanged.
 * @param hex The hex value to be prefixed.
 */
export const Ox = (hex: Buffer | string, { prefix } = { prefix: "0x" }) => {
    const hexString = typeof hex === "string" ? hex : hex.toString("hex");
    return hexString.substring(0, 2) === prefix
        ? hexString
        : `${prefix}${hexString}`;
};

export const fromHex = (hex: Buffer | string): Buffer => {
    assertType<Buffer | string>("Buffer | string", { hex });
    return Buffer.isBuffer(hex) ? hex : Buffer.from(strip0x(hex), "hex");
};

export const fromBase64 = (base64: Buffer | string): Buffer => {
    assertType<Buffer | string>("Buffer | string", { base64 });
    return Buffer.isBuffer(base64)
        ? base64
        : Buffer.from(strip0x(base64), "base64");
};

export const toBase64 = (input: Buffer) => {
    assertType("Buffer", { input });
    return input.toString("base64");
};

export const pad0x = (hex: Buffer | string) => {
    // Normalize:
    let hexString = Ox(hex, { prefix: "" });
    // If length is odd, add leading 0.
    if (hexString.length % 2) {
        hexString = "0" + hexString;
    }
    return Ox(hexString);
};

// Unpadded alternate base64 encoding defined in RFC 4648, commonly used in
// URLs.
export const toURLBase64 = (input: Buffer | string) => {
    assertType<Buffer | string>("Buffer | string", { input });

    return (Buffer.isBuffer(input) ? input : fromHex(input))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/\=+$/, "");
};

/**
 * Returns a hex string filled with zeroes (prefixed with '0x').
 * @param bytes The number of bytes.
 */
export const NULL = (bytes: number) => Ox("00".repeat(bytes));

export const unzip = (zip: EthArgs) => [
    zip.map((param) => param.type),
    zip.map((param) => param.value),
];

// tslint:disable-next-line: no-any
export const ignorePromiEventError = (error: any): boolean => {
    try {
        return (
            error &&
            error.message &&
            (error.message.match(/Invalid block number/) ||
                error.message.match(
                    /Timeout exceeded during the transaction confirmation process./
                ))
        );
    } catch (error) {
        return false;
    }
};

// tslint:disable-next-line: no-any
export const extractError = (error: any): string => {
    if (typeof error === "object") {
        if (error.response) {
            return extractError(error.response);
        }
        if (error.data) {
            return extractError(error.data);
        }
        if (error.error) {
            return extractError(error.error);
        }
        if (error.message) {
            return extractError(error.message);
        }
        if (error.statusText) {
            return extractError(error.statusText);
        }
    }
    try {
        if (typeof error === "string") {
            if (error.slice(0, 7) === "Error: ") {
                error = error.slice(7);
            }
            return error;
        }
        return JSON.stringify(error);
    } catch (error) {
        // Ignore JSON error
    }
    return String(error);
};

export const retryNTimes = async <T>(
    fnCall: () => Promise<T>,
    retries: number
): Promise<T> => {
    let returnError;
    for (let i = 0; retries === -1 || i < retries; i++) {
        try {
            return await fnCall();
        } catch (error) {
            const errorMessage = extractError(error);
            if (errorMessage.match(/timeout of .* exceeded/)) {
                returnError = error;
            } else {
                if (errorMessage) {
                    error.message += ` (${errorMessage})`;
                }
                returnError = error;
            }
        }
    }
    throw returnError;
};

/**
 * Generates a random hex string (prefixed with '0x').
 * @param bytes The number of bytes to generate.
 */
export const randomBytes = (bytes: number): Buffer => {
    try {
        // @ts-ignore
        if (window) {
            const uints = new Uint32Array(bytes / 4); // 4 bytes (32 bits)
            // @ts-ignore
            window.crypto.getRandomValues(uints);
            let str = "";
            for (const uint of uints) {
                str +=
                    "0".repeat(8 - uint.toString(16).length) +
                    uint.toString(16);
            }
            return fromHex(str);
        }
    } catch (error) {
        // Ignore error
    }
    // tslint:disable-next-line: no-shadowed-variable
    const crypto = require("crypto");
    return crypto.randomBytes(bytes);
};

/**
 * Converts an Ethereum ABI and values to the parameters expected by RenJS
 * for minting.
 * @param options The ABI of the function, or ABI of the contract and the
 *                function name.
 * @param args The values of the parameters - one per function input.
 */
// tslint:disable-next-line: no-any
export const abiToParams = <ABI extends AbiItem>(
    options: { fnABI: ABI } | { contractABI: ABI[]; fnName: string },
    ...args: Array<{}>
): EthArgs => {
    const { fnABI, contractABI, fnName } = options as {
        fnABI?: ABI;
        contractABI?: ABI[];
        fnName?: string;
    };

    const abi =
        fnABI ||
        (contractABI
            ? contractABI.filter(
                  (x) => x.type === "function" && x.name === fnName
              )[0]
            : undefined);

    if (!abi) {
        throw new Error(
            fnName
                ? `Unable to find ABI for function ${fnName}.`
                : `Invalid ABI passed in.`
        );
    }

    const inputs = abi.inputs || [];

    if (inputs.length !== args.length) {
        throw new Error(
            `Mismatched parameter count. Expected ${inputs.length} but got ${args.length} inputs.`
        );
    }

    return inputs.map((input, i) => ({
        name: input.name,
        value: args[i],
        type: input.type,
    }));
};