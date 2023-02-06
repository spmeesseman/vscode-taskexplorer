import { Uri } from "vscode";
import { TeContainer } from "./container";

export const refreshTree = (taskType: string | boolean | undefined, uri: Uri | false | undefined, logPad: string) => TeContainer.instance.treeManager.refresh(taskType, uri, logPad);
