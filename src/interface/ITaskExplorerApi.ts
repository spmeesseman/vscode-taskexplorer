
import { IExternalProvider } from "./IExternalProvider";
import { ITaskExplorerProvider } from "./ITaskProvider";
import { IDictionary } from "./IDictionary";

export interface ITaskExplorerApi
{
    providers: IDictionary<ITaskExplorerProvider>;
    refreshExternalProvider(taskSource: string, logPad: string): Promise<void>;
    register(taskSource: string, provider: IExternalProvider, logPad: string): Promise<void>;
    unregister(taskSource: string, logPad: string): Promise<void>;
}