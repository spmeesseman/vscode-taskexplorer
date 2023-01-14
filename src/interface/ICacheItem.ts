
import { Uri } from "vscode";

export interface ICacheItem
{
    uri: Uri;
    project: string;
    timestamp?: Date;
}
