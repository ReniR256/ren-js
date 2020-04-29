import * as React from "react";

import { TxStatus } from "@renproject/interfaces";
import { Loading } from "@renproject/react-components";
import styled from "styled-components";
import { lighten } from "polished";

import { ReactComponent as BurnIcon } from "../../../images/icons/burn.svg";
import { _catchInteractionErr_ } from "../../../lib/errors";
import { Token } from "../../../state/generalTypes";
import { Popup } from "../Popup";
import { Mini } from "./Mini";

const renderTxStatus = (status: TxStatus | null) => {
    switch (status) {
        case TxStatus.TxStatusNil:
            return "Submitting";
        case TxStatus.TxStatusConfirming:
            return "Checking for confirmations";
        case TxStatus.TxStatusPending:
            return "Executing";
        case TxStatus.TxStatusExecuting:
            return "Executing";
        case TxStatus.TxStatusDone:
            return "Done";
        case TxStatus.TxStatusReverted:
            return "Reverted";
        default:
            return "Submitting";
    }
};

const TransparentButton = styled.button`
        position: relative;
        opacity: 1;
        &:disabled {
            color: rgba(255, 255, 255, 1.0);
            background-color: ${p => lighten(0.5, p.theme.primaryColor)};
            opacity: 1 !important;
        }
    `;
const TransparentLoading = styled(Loading)`
        position: absolute;
        margin-left: 20px;
        margin-top: 3px;
        display: inline-block;
        border-color: rgba(255, 255, 255, 0.5) transparent rgba(255, 255, 255, 0.5) transparent;
    `;

export const SubmitBurnToRenVM: React.StatelessComponent<{
    mini: boolean;
    token: Token;
    txHash: string | null;
    renVMStatus: TxStatus | null;
    submitDeposit: () => Promise<unknown>;
}> = ({ mini, token, renVMStatus, txHash, submitDeposit }) => {
    const [error, setError] = React.useState(null as Error | null);
    const [submitting, setSubmitting] = React.useState(true);

    const onClick = React.useCallback(async () => {
        setError(null);
        setSubmitting(true);
        if (submitDeposit) {
            try {
                await submitDeposit();
            } catch (error) {
                setError(error);
                _catchInteractionErr_(error, "Error in DepositReceived: submitDeposit");
            }
        }
        setSubmitting(false);
    }, [submitDeposit]);

    // useEffect replaces `componentDidMount` and `componentDidUpdate`.
    // To limit it to running once, we use the initialized hook.
    const [initialized, setInitialized] = React.useState(false);
    React.useEffect(() => {
        if (!initialized) {
            setInitialized(true);
            // if (txHash) {
            onClick().catch(console.error);
            // }
        }
    }, [initialized, txHash, onClick]);

    if (mini) {
        return <Mini token={token} message={submitting ? "Submitting to RenVM" : "Submit to RenVM"} />;
    }

    return <Popup mini={mini}>
        <div className="burn-popup submit-to-ethereum">
            <div className="popup--body">
                <>
                    <div className="popup--body--header"></div>
                    <div className="popup--body--icon"><BurnIcon /></div>
                </>
                <div className="popup--body--message">
                    {/* {token ? <TokenIcon className="token-icon" token={token} /> : null} */}
                    {submitting ? <>Status: {renderTxStatus(renVMStatus)}</> : <></>}
                    {error ? <>
                        <div className="submitting-to-renvm--body">
                            <p style={{ marginTop: "20px", fontSize: "16px" }} className="red">Unable to submit to RenVM</p>
                            <p style={{ lineBreak: "anywhere" }} className="red">{error.message || error}</p>
                        </div>
                    </> : <></>}
                </div>
            </div>
        </div>
        <div className="deposit-address">
            <div className="popup--body--actions">
                <div className="popup--buttons">
                    <TransparentButton className="button open--confirm" disabled={submitting} onClick={onClick}>
                        {submitting ? <>Submitting to RenVM <TransparentLoading alt={true} /></> : <>Submit to RenVM</>}
                    </TransparentButton>
                </div>
            </div>
        </div>
    </Popup>;
};