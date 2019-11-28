/* Generated by ts-generator ver. 0.0.8 */
/* tslint:disable */

import BN from "bn.js";
import Contract, { contractOptions } from "web3/eth/contract";
import { EventLog, Callback, EventEmitter } from "web3/types";
import { TransactionObject, BlockType } from "web3/eth/types";
import { ContractEvent } from "./types";

interface EventOptions {
  filter?: object;
  fromBlock?: BlockType;
  topics?: string[];
}

export class BTC_DAI_Reserve extends Contract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: contractOptions
  );
  clone(): BTC_DAI_Reserve;
  address: string;
  methods: {
    approve(
      spender: string,
      value: number | string
    ): TransactionObject<boolean>;

    buy(
      _to: string,
      _from: string,
      _baseTokenAmount: number | string
    ): TransactionObject<BN>;

    totalSupply(): TransactionObject<BN>;

    addLiquidity(
      _liquidityProvider: string,
      _maxBaseToken: number | string,
      _tokenAmount: number | string,
      _deadline: number | string
    ): TransactionObject<BN>;

    transferFrom(
      sender: string,
      recipient: string,
      amount: number | string
    ): TransactionObject<boolean>;

    increaseAllowance(
      spender: string,
      addedValue: number | string
    ): TransactionObject<boolean>;

    calculateQuoteTokenValue(
      _liquidity: number | string
    ): TransactionObject<BN>;

    expectedBaseTokenAmount(
      _quoteTokenAmount: number | string
    ): TransactionObject<BN>;

    balanceOf(account: string): TransactionObject<BN>;

    BaseToken(): TransactionObject<string>;

    removeLiquidity(
      _liquidity: number | string
    ): TransactionObject<{
      0: BN;
      1: BN;
    }>;

    decreaseAllowance(
      spender: string,
      subtractedValue: number | string
    ): TransactionObject<boolean>;

    transfer(
      recipient: string,
      amount: number | string
    ): TransactionObject<boolean>;

    calculateSellRcvAmt(_sendAmt: number | string): TransactionObject<BN>;

    calculateBaseTokenValue(_liquidity: number | string): TransactionObject<BN>;

    Token(): TransactionObject<string>;

    sell(
      _to: string,
      _from: string,
      _tokenAmount: number | string
    ): TransactionObject<BN>;

    calculateBuyRcvAmt(_sendAmt: number | string): TransactionObject<BN>;

    allowance(owner: string, spender: string): TransactionObject<BN>;
  };
  events: {
    LogAddLiquidity: ContractEvent<{
      _liquidityProvider: string;
      _tokenAmount: BN;
      _baseTokenAmount: BN;
      0: string;
      1: BN;
      2: BN;
    }>;
    LogDebug: ContractEvent<BN>;
    Transfer: ContractEvent<{
      from: string;
      to: string;
      value: BN;
      0: string;
      1: string;
      2: BN;
    }>;
    Approval: ContractEvent<{
      owner: string;
      spender: string;
      value: BN;
      0: string;
      1: string;
      2: BN;
    }>;
    allEvents: (
      options?: EventOptions,
      cb?: Callback<EventLog>
    ) => EventEmitter;
  };
}
