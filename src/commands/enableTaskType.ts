
import { log } from "../lib/log/log";
import { Globs } from "../lib/constants";
import { loadMessageBundle } from "vscode-nls";
import { testPattern } from "../lib/utils/utils";
import { ExtensionContext, Uri, window } from "vscode";
import { configuration } from "../lib/utils/configuration";
import { Commands, registerCommand } from "../lib/command";

const localize = loadMessageBundle();


const enableTaskType = async(uri: Uri) =>
{
    log.methodStart("enable task type file explorer command", 1, "", true, [[ "path", uri.fsPath ]]);
    const globKey = Object.keys(Globs).find((k => k.startsWith("GLOB_") && testPattern(uri.path, Globs[k])));
    if (globKey)
    {
        const taskType = globKey.replace("GLOB_", "").toLowerCase();
        await configuration.update("enabledTasks." + taskType, true);
    }
    else{
        const msg = "This file does not appear to be associated to any known task type";
        log.write(msg, 1, "");
        window.showInformationMessage(localize("messages.noAssociatedTaskType", msg));
    }
    log.methodDone("enable task type file explorer command", 1, "");
};


export const registerEnableTaskTypeCommand = (context: ExtensionContext) =>
{
	context.subscriptions.push(
        registerCommand(Commands.EnableTaskType, async (uri: Uri) => { await enableTaskType(uri); })
    );
};
