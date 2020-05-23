import * as React from "react";

import { TokenIcon } from "@renproject/react-components";
import { Asset } from "@renproject/interfaces";

import { connect, ConnectedProps } from "../../../state/connect";
import { SDKContainer } from "../../../state/sdkContainer";
import { Container } from "../Container";

export const Mini = ({ token, message }: { token: Asset, message: string }) => {
    return <Container mini={true}>
        <div className="side-strip"><TokenIcon token={token} /></div>
        <div className="container--body--details">
            <span>{message}</span>
        </div>
    </Container>;
};

interface Props extends ConnectedProps<[SDKContainer]> {
    message: string;
}

/**
 * OpeningOrder is a visual component for allowing users to open new orders
 */
export const ConnectedMini = connect<Props & ConnectedProps<[SDKContainer]>>([SDKContainer])(
    ({ message, containers: [sdkContainer] }) => {
        const { transfer } = sdkContainer.state;
        if (!transfer) {
            throw new Error(`Unable to load transfer details`);
        }

        const token = transfer.transferParams.sendToken.slice(0, 3) as Asset;

        return <Mini token={token} message={message} />;
    }
);
