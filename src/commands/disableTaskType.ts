
import log from "../lib/log/log";
import { commands, ExtensionContext, Uri } from "vscode";


const disableTaskType = async(uri: Uri) =>
{
    log.methodStart("disable task type file explorer command", 1, "");
    log.methodDone("disable task type file explorer command", 1, "");
};


const registerDisableTaskTypeCommand = (context: ExtensionContext) =>
{
	context.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.disabletaskType", async (uri: Uri) => { await disableTaskType(uri); })
    );
};


export default registerDisableTaskTypeCommand;
