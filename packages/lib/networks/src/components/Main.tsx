import * as React from "react";

import { Case, caseFn, Format, formatFn } from "../lib/layouts";
import { NetworkData, networks } from "../lib/networks";
import Network from "./Network";

interface MainState {
    format: Format;
    nameCase: Case;
}

interface MainProps {
}

class Main extends React.Component<MainProps, MainState> {
    constructor(props: MainProps) {
        super(props);
        this.state = {
            format: Format.TABLE,
            nameCase: Case.DEFAULT_CASE,
        };
    }
    public render() {
        const { format, nameCase } = this.state;

        return (
            <div className="Main">
                <div className="network controls">
                    <h1>Contract Index</h1>
                    <table>
                        Format
                        <tr>
                            {formatFn.map((_, formatOpt: Format) =>
                                <td key={formatOpt}><input type="radio"
                                    name="format"
                                    value={formatOpt}
                                    checked={format === formatOpt}
                                    onChange={this.handleInput}
                                />
                                    {formatOpt}
                                </td>
                            ).toArray()}
                        </tr>
                    </table>
                    {format === Format.JSON ?
                        <table>
                            Case
                                < tr >
                                {
                                    caseFn.keySeq().toJS().map((nameCaseOpt: Case) =>
                                        <td key={nameCaseOpt}><input type="radio"
                                            name="nameCase"
                                            value={nameCaseOpt}
                                            checked={nameCase === nameCaseOpt}
                                            onChange={this.handleInput}
                                        />
                                            {nameCaseOpt}
                                        </td>
                                    )
                                }
                            </tr></table> : null
                    }
                </div>
                {networks.map((network: NetworkData) =>
                    <Network
                        key={network.name}
                        nameCase={format === Format.JSON ? caseFn.get(nameCase) : caseFn.get(Case.DEFAULT_CASE)}
                        format={formatFn.get(format)}
                        networkData={network}
                    />)
                }
            </div >
        );
    }

    private handleInput = (event: React.FormEvent<HTMLInputElement>): void => {
        const element = (event.target as HTMLInputElement);
        this.setState((state) => ({ ...state, [element.name]: element.value }));
    }

}

export default Main;