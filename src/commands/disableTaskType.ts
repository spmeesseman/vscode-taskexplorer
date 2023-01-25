
import log from "../lib/log/log";
import constants from "../lib/constants";
import { testPattern } from "../lib/utils/utils";
import { commands, ExtensionContext, Uri } from "vscode";
import { configuration } from "../lib/utils/configuration";


const disableTaskType = async(uri: Uri) =>
{
    log.methodStart("disable task type file explorer command", 1, "", true, [[ "path", uri.fsPath ]]);
    const globKey = Object.keys(constants).find((k => k.startsWith("GLOB_") && testPattern(uri.path, constants[k]))) as string;
    const taskType = globKey.replace("GLOB_", "").toLowerCase();
    await configuration.update("enabledTasks." + taskType, false);
    log.methodDone("disable task type file explorer command", 1, "");
};


const registerDisableTaskTypeCommand = (context: ExtensionContext) =>
{
	context.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.disableTaskType", async (uri: Uri) => { await disableTaskType(uri); })
    );
};


export default registerDisableTaskTypeCommand;
