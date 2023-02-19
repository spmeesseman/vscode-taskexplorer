
import { log } from "../log/log";
import { Globs } from "../constants";
import { Disposable, Uri } from "vscode";
import { testPattern } from "../utils/utils";
import { Commands, registerCommand } from "./command";
import { configuration } from "../utils/configuration";


const disableTaskType = async(uri: Uri) =>
{
    log.methodStart("disable task type file explorer command", 1, "", true, [[ "path", uri.fsPath ]]);
    const globKey = Object.keys(Globs).find((k => k.startsWith("GLOB_") && testPattern(uri.path, Globs[k]))) as string;
    const taskType = globKey.replace("GLOB_", "").toLowerCase();
    await configuration.update("enabledTasks." + taskType, false);
    log.methodDone("disable task type file explorer command", 1, "");
};


export const registerDisableTaskTypeCommand = (disposables: Disposable[]) =>
{
	disposables.push(
        registerCommand(Commands.DisableTaskType, async (uri: Uri) => { await disableTaskType(uri); })
    );
};
