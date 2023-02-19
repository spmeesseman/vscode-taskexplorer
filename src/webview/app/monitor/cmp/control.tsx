
import { State } from "../../../common/state";
import React, { createElement, useEffect, useMemo, useRef, useState } from "react";
import { InternalNotificationType, IpcNotificationType } from "src/webview/common/ipc";
import { TeReactTaskTimer } from "./timer";


export class TeTaskControl extends React.Component<any, State, State>
{
    nonce?: string;

    constructor(props: any)
    {
        super(props);
        this.state = props.state;

        // const controlRef = useRef<TeTaskControl>(null);

        // // const [subscription, setSubscription] = useState<Subscription | undefined>(state.subscription);
	    // // const [ context, setContext ] = useState(props.state.context);
        // // const [ isLoading, setIsLoading ] = useState(props.state.loading);

        // const updateState = (
        //     state: State,
        //     type?: IpcNotificationType<any> | InternalNotificationType
        // ) => {};

        // useEffect(() => props.subscribe?.(updateState), []);

        // useEffect(() => {
        //     window.addEventListener("keydown", this.handleKeyDown);

        //     return () => {
        //         window.removeEventListener("keydown", this.handleKeyDown);
        //     };
        // }, [ null ]);
    }


    override componentDidMount()
    {
        // eslint-disable-next-line @typescript-eslint/tslint/config
        // this.interval = setInterval(() => this.tick(), 1000);
    }


    override componentWillUnmount()
    {
        // clearInterval(this.interval as NodeJS.Timeout);
    }


    handleKeyDown = (e: KeyboardEvent) =>
    {
		if (e.key === "Enter" || e.key === " ")
        {
		}
	};


    override render()
    {
        return (
            <div className="te-monitor-control-container">
                <table width="100%" cellPadding="0" cellSpacing="0">
                    <tbody>
                        <tr className="te-monitor-control-row te-monitor-control-top-row">
                            <td className="te-monitor-control-icon-column">
                                <img src={this.state.webroot + "/img/sources/" + this.state.taskType + ".svg"} height="70" />
                            </td>
                            <td className="te-monitor-control-content-column">
                                <span className="te-monitor-control-content-container">
                                    Content
                                </span>
                            </td>
                            <td className="te-monitor-control-timer-column">
                                <TeReactTaskTimer state={this.state} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

}
