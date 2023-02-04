import { Uri } from "vscode";
import { getTaskTreeManager } from "../extension";

export const refreshTree = (taskType: string | boolean | undefined, uri: Uri | false | undefined, logPad: string) => getTaskTreeManager().refresh(taskType, uri, logPad);
