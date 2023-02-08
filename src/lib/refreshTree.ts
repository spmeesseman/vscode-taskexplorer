import { Uri } from "vscode";
import { TeWrapper } from "./wrapper";

export const refreshTree = (taskType: string | boolean | undefined, uri: Uri | false | undefined, logPad: string) => TeWrapper.instance.treeManager.refresh(taskType, uri, logPad);
