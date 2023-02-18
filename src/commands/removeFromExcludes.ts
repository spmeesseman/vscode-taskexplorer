
import { Globs } from "../lib/constants";
import { TeWrapper } from "src/lib/wrapper";
import { loadMessageBundle } from "vscode-nls";
import { Disposable, Uri, window } from "vscode";
import { removeFromExcludes } from "../lib/addToExcludes";
import { Commands, executeCommand, registerCommand } from "../lib/command";

const localize = loadMessageBundle();
let teWrapper: TeWrapper;

const removeUriFromExcludes = async(uri: Uri) =>
{
    teWrapper.log.methodStart("remove from excludes file explorer command", 1, "", true, [[ "path", uri.fsPath ]]);
    if (!teWrapper.fs.isDirectory(uri.fsPath))
    {
        const globKey = Object.keys(Globs).find((k => k.startsWith("GLOB_") && teWrapper.utils.testPattern(uri.path, Globs[k])));
        if (globKey)
        {
            const taskType = globKey.replace("GLOB_", "").toLowerCase();
            teWrapper.configWatcher.enableConfigWatcher(false);
            await removeFromExcludes([ uri.path ], "exclude", "   ");
            teWrapper.configWatcher.enableConfigWatcher(true);
            await executeCommand(Commands.Refresh, taskType, uri, "   ");
        }
        else{
            const msg = "This file does not appear to be associated to any known task type";
            teWrapper.log.write(msg, 1, "   ");
            window.showInformationMessage(localize("messages.noAssociatedTaskType", msg));
        }
    }
    else {
        await removeFromExcludes([ uri.path + "/**" ], "exclude", "   ");
    }
    teWrapper.log.methodDone("remove from excludes file explorer command", 1, "");
};


export const registerRemoveFromExcludesCommand = (wrapper: TeWrapper, disposables: Disposable[]) =>
{
    teWrapper = wrapper;
	disposables.push(
        registerCommand(Commands.RemovefromExcludes, async (uri: Uri) => { await removeUriFromExcludes(uri); })
    );
};
