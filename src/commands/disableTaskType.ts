
import log from "../lib/log/log";
import constants from "../lib/constants";
import { loadMessageBundle } from "vscode-nls";
import { testPattern } from "../lib/utils/utils";
import { configuration } from "../lib/utils/configuration";
import { commands, ExtensionContext, Uri, window } from "vscode";

const localize = loadMessageBundle();


const disableTaskType = async(uri: Uri) =>
{
    log.methodStart("disable task type file explorer command", 1, "", true, [[ "path", uri.fsPath ]]);
    const globKey = Object.keys(constants).find((k => k.startsWith("GLOB_") && testPattern(uri.path, constants[k])));
    if (globKey)
    {
        const taskType = globKey.replace("GLOB_", "").toLowerCase();
        await configuration.update("enabledTasks." + taskType, false);
    }
    else{
        const msg = "This file does not appear to be associated to any known task type";
        log.write(msg, 1, "");
        window.showInformationMessage(localize("messages.noAssociatedTaskType", msg));
    }
    log.methodDone("disable task type file explorer command", 1, "");
};


const registerDisableTaskTypeCommand = (context: ExtensionContext) =>
{
	context.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.disableTaskType", async (uri: Uri) => { await disableTaskType(uri); })
    );
};


export default registerDisableTaskTypeCommand;
