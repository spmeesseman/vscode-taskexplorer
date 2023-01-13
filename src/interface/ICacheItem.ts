
import { WorkspaceFolder, Uri } from "vscode";

export interface ICacheItem
{
    uri: Uri;
    folder: WorkspaceFolder;
    timestamp?: Date;
}
