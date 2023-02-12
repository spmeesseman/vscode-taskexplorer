
import { log } from "./log/log";
import { TeWrapper } from "./wrapper";
import { executeCommand, registerCommand } from "./command";
import { ContextKeys, setContext } from "./context";
import { IExternalProvider, ITaskExplorerApi, ITaskTreeView } from "../interface";
import { Commands } from "./constants";


export class TeApi implements ITaskExplorerApi
{
    private _tests: boolean;


    constructor(private readonly _wrapper: TeWrapper)
    {
        this._tests = this._wrapper.tests;
        /* istanbul ignore else */
        if (this._tests) {
            void setContext(ContextKeys.Tests, true);
        }
        this._wrapper.context.subscriptions.push(registerCommand("vscode-taskexplorer.getApi", () => this, this));
    }


    get providers() {
        return this._wrapper.providers;
    }


    get wrapper()  {
        return this._tests ? this._wrapper : undefined;
    }


    refreshExternalProvider = async(providerName: string) =>
    {
        if (this.providers[providerName])
        {
            await executeCommand(Commands.Refresh, providerName);
        }
    };


    register = async(providerName: string, provider: IExternalProvider, logPad: string) =>
    {
        this.providers[providerName] = provider;
        await executeCommand(Commands.Refresh, providerName, undefined, logPad);
    };


    unregister = async(providerName: string, logPad: string) =>
    {
        delete this.providers[providerName];
        await executeCommand(Commands.Refresh, providerName, undefined, logPad);
    };

}
