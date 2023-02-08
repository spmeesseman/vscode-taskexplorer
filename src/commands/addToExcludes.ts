
import log from "../lib/log/log";
import { isDirectory } from "../lib/utils/fs";
import { loadMessageBundle } from "vscode-nls";
import { refreshTree } from "../lib/refreshTree";
import { testPattern } from "../lib/utils/utils";
import { registerCommand } from "../lib/command";
import { addToExcludes } from "../lib/addToExcludes";
import { ExtensionContext, Uri, window } from "vscode";
import { Globs, Commands } from "../lib/constants";

const localize = loadMessageBundle();


const addUriToExcludes = async(uri: Uri) =>
{
    log.methodStart("add to excludes file explorer command", 1, "", true, [[ "path", uri.fsPath ]]);
    if (!isDirectory(uri.fsPath))
    {
        const globKey = Object.keys(Globs).find((k => k.startsWith("GLOB_") && testPattern(uri.path, Globs[k])));
        if (globKey)
        {
            const taskType = globKey.replace("GLOB_", "").toLowerCase();
            await addToExcludes([ uri.path ], "exclude", true, "   ");
            await refreshTree(taskType, uri, "   ");
        }
        else{
            const msg = "This file does not appear to be associated to any known task type";
            log.write(msg, 1, "");
            window.showInformationMessage(localize("messages.noAssociatedTaskType", msg));
        }
    }
    else {
        await addToExcludes([ uri.path + "/**" ], "exclude", false, "   ");
    }
    log.methodDone("add to excludes file explorer command", 1, "");
};


export const registerAddToExcludesCommand = (context: ExtensionContext) =>
{
	context.subscriptions.push(
        registerCommand(Commands.AddToExcludesMenu, async (uri: Uri) => { await addUriToExcludes(uri); })
    );
};
