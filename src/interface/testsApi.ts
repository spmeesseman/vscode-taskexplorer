
import { IExplorerApi } from "./explorer";
import { ILogApi } from "./logApi";

export interface TaskExplorerTestsApi
{
    explorer: IExplorerApi | undefined;
    fileCache: any; // for tests use only
    log: ILogApi;
}
