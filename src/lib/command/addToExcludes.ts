

import { Globs } from "../constants";
import { TeWrapper } from "../wrapper";
import { loadMessageBundle } from "vscode-nls";
import { Disposable, Uri, window } from "vscode";
import { addToExcludes } from "../addToExcludes";
import { Commands, executeCommand, registerCommand } from "./command";

const localize = loadMessageBundle();
let teWrapper: TeWrapper;


const addUriToExcludes = async(uri: Uri) =>
{
    teWrapper.log.methodStart("add to excludes file explorer command", 1, "", true, [[ "path", uri.fsPath ]]);
    if (!teWrapper.fs.isDirectory(uri.fsPath))
    {
        const globKey = Object.keys(Globs).find((k => k.startsWith("GLOB_") && teWrapper.utils.testPattern(uri.path, Globs[k])));
        if (globKey)
        {
            const taskType = globKey.replace("GLOB_", "").toLowerCase();
            teWrapper.configWatcher.enableConfigWatcher(false);
            await addToExcludes([ uri.path ], "exclude", "   ");
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
        await addToExcludes([ uri.path + "/**" ], "exclude", "   ");
    }
    teWrapper.log.methodDone("add to excludes file explorer command", 1, "");
};


export const registerAddToExcludesCommand = (wrapper: TeWrapper, disposables: Disposable[]) =>
{
    teWrapper = wrapper;
	disposables.push(
        registerCommand(Commands.AddToExcludesMenu, async (uri: Uri) => { await addUriToExcludes(uri); })
    );
};
