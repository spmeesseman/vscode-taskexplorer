
import { log } from "../lib/log/log";
import { Globs } from "../lib/constants";
import { isDirectory } from "../lib/utils/fs";
import { loadMessageBundle } from "vscode-nls";
import { testPattern } from "../lib/utils/utils";
import { Disposable, Uri, window } from "vscode";
import { removeFromExcludes } from "../lib/addToExcludes";
import { Commands, executeCommand, registerCommand } from "../lib/command";

const localize = loadMessageBundle();


const removeUriFromExcludes = async(uri: Uri) =>
{
    log.methodStart("remove from excludes file explorer command", 1, "", true, [[ "path", uri.fsPath ]]);
    if (!isDirectory(uri.fsPath))
    {
        const globKey = Object.keys(Globs).find((k => k.startsWith("GLOB_") && testPattern(uri.path, Globs[k])));
        if (globKey)
        {
            const taskType = globKey.replace("GLOB_", "").toLowerCase();
            await removeFromExcludes([ uri.path ], "exclude", true, "   ");
            await executeCommand(Commands.Refresh, taskType, uri, "   ");
        }
        else{
            const msg = "This file does not appear to be associated to any known task type";
            log.write(msg, 1, "");
            window.showInformationMessage(localize("messages.noAssociatedTaskType", msg));
        }
    }
    else {
        await removeFromExcludes([ uri.path + "/**" ], "exclude", false, "   ");
    }
    log.methodDone("remove from excludes file explorer command", 1, "");
};


export const registerRemoveFromExcludesCommand = (disposables: Disposable[]) =>
{
	disposables.push(
        registerCommand(Commands.RemovefromExcludes, async (uri: Uri) => { await removeUriFromExcludes(uri); })
    );
};
