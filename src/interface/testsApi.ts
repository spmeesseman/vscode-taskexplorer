
import { IExplorerApi } from "./explorer";
import { IFilesystemApi } from "./fsApi";

export interface TaskExplorerTestsApi
{
    explorer: IExplorerApi;
    fileCache: any; // for tests use only
    fs: IFilesystemApi;
}
