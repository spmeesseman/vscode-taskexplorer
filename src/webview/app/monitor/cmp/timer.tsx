
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

    private tick = () => this.setState(state => ({ seconds: (state.seconds || 0) + 1 }));


    override componentDidMount()
    {   // eslint-disable-next-line @typescript-eslint/tslint/config
        this.interval = setInterval(() => this.tick(), 1000);
    }


    override componentWillUnmount = () => clearInterval(this.interval as NodeJS.Timeout);


    override render()
    {
        const tm = this.state?.seconds || 0,
              tmM = Math.floor(tm / 60),
              tmS = Math.floor(tm % 60),
              tmF = `${tmM}:${tmS >= 10 ? tmS : "0" + tmS}`;
        return (
            <span className="te-monitor-control-timer">{tmF}</span>
        );
    }

}
