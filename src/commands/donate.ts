
import { log } from "../lib/log/log";
import { ExtensionContext, window } from "vscode";
import { Commands } from "../lib/constants";
import { registerCommand } from "../lib/command";


const donate = async() =>
{
    log.methodStart("donate command", 1, "", true);
    window.showInformationMessage("Not implemented yet");
    log.methodDone("donate command", 1, "");
};


export const registerDonateCommand = (context: ExtensionContext) =>
{
	context.subscriptions.push(
        registerCommand(Commands.Donate, async () => { await donate(); })
    );
};
