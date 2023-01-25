
import log from "../lib/log/log";
import { commands, ExtensionContext, Uri } from "vscode";


const enableTaskType = async(uri: Uri) =>
{
    log.methodStart("enable task type file explorer command", 1, "");
    log.methodDone("enable task type file explorer command", 1, "");
};


const registerEnableTaskTypeCommand = (context: ExtensionContext) =>
{
	context.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.enabletaskType", async (uri: Uri) => { await enableTaskType(uri); })
    );
};


export default registerEnableTaskTypeCommand;
