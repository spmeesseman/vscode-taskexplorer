
import { TeWrapper } from "./wrapper";
import { ContextKeys } from "./context";
import { IExternalProvider, ITaskExplorerApi } from "../interface";
import { executeCommand, registerCommand, Commands } from "./command";


export class TeApi implements ITaskExplorerApi
{
    private _tests: boolean;


    constructor(private readonly _wrapper: TeWrapper)
    {
        this._tests = this._wrapper.tests;
        /* istanbul ignore else */
        if (this._tests) {
            void _wrapper.contextTe.setContext(ContextKeys.Tests, true);
        }
        this._wrapper.context.subscriptions.push(registerCommand("taskexplorer.getApi", () => this, this));
    }


    get providers() {
        return this._wrapper.providers;
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
