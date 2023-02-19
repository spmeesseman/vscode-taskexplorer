import React from "react";
import { State } from "../../../common/state";

export class TeReactTaskTimer extends React.Component<any, State>
{
    private interval: NodeJS.Timeout | undefined;
    nonce?: string;

    constructor(props: any)
    {
        super(props);
        this.state = props.state || {
            seconds: 0
        };
    }

    tick()
    {
        this.setState(state => ({ seconds: (state.seconds || 0) + 1 }));
    }


    override componentDidMount()
    {
        // eslint-disable-next-line @typescript-eslint/tslint/config
        this.interval = setInterval(() => this.tick(), 1000);
    }


    override componentWillUnmount()
    {
        clearInterval(this.interval as NodeJS.Timeout);
    }


    override render()
    {
        return (
            <div>
                Seconds: {this.state?.seconds || 0}
            </div>
        );
    }

}
