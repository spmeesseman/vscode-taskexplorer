
import { IExplorerApi } from "./explorer";

export interface TaskExplorerTestsApi
{
    explorer: IExplorerApi | undefined;
    fileCache: any; // for tests use only
    log: any;
}
