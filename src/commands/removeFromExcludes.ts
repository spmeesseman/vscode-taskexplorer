
import log from "../lib/log/log";
import { commands, ExtensionContext, Uri } from "vscode";


const removeFromExcludes = async(uri: Uri) =>
{
    log.methodStart("remove from excludes file explorer command", 1, "");
    log.methodDone("remove from excludes file explorer command", 1, "");
};


const registerRemoveFromExcludesCommand = (context: ExtensionContext) =>
{
	context.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.removeFromExcludes", async (uri: Uri) => { await removeFromExcludes(uri); })
    );
};


export default registerRemoveFromExcludesCommand;
