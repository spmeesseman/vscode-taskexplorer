
import log from "../lib/log/log";
import { commands, ExtensionContext, Uri } from "vscode";


const addToExcludes = async(uri: Uri) =>
{
    log.methodStart("add to excludes file explorer command", 1, "");
    log.methodDone("add to excludes file explorer command", 1, "");
};


const registerAddToExcludesCommand = (context: ExtensionContext) =>
{
	context.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.addToExcludesEx", async (uri: Uri) => { await addToExcludes(uri); })
    );
};


export default registerAddToExcludesCommand;
