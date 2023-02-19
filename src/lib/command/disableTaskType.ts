
import { log } from "../lib/log/log";
import { Globs } from "../lib/constants";
import { Disposable, Uri } from "vscode";
import { testPattern } from "../lib/utils/utils";
import { configuration } from "../lib/utils/configuration";
import { Commands, registerCommand } from "../lib/command";


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
