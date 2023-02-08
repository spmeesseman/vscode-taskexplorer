
import log from "../lib/log/log";
import { ExtensionContext, Uri } from "vscode";
import { registerCommand } from "../lib/command";
import { testPattern } from "../lib/utils/utils";
import { Globs, Commands } from "../lib/constants";
import { configuration } from "../lib/utils/configuration";


const disableTaskType = async(uri: Uri) =>
{
    log.methodStart("disable task type file explorer command", 1, "", true, [[ "path", uri.fsPath ]]);
    const globKey = Object.keys(Globs).find((k => k.startsWith("GLOB_") && testPattern(uri.path, Globs[k]))) as string;
    const taskType = globKey.replace("GLOB_", "").toLowerCase();
    await configuration.update("enabledTasks." + taskType, false);
    log.methodDone("disable task type file explorer command", 1, "");
};


export const registerDisableTaskTypeCommand = (context: ExtensionContext) =>
{
	context.subscriptions.push(
        registerCommand(Commands.DisableTaskType, async (uri: Uri) => { await disableTaskType(uri); })
    );
};
