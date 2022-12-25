
import { ExplorerApi } from "./explorer";

export interface TaskExplorerTestsApi
{
    explorer: ExplorerApi | undefined;
    fileCache: any; // for tests use only
    log: any;
}
