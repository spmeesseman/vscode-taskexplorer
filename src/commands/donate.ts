
import log from "../lib/log/log";
import { ExtensionContext } from "vscode";
import { Commands } from "../lib/constants";
import { registerCommand } from "../lib/command";


const donate = async() =>
{
    log.methodStart("donate command", 1, "", true);
    log.methodDone("donate command", 1, "");
};


export const registerDonateCommand = (context: ExtensionContext) =>
{
	context.subscriptions.push(
        registerCommand(Commands.Donate, async () => { await donate(); })
    );
};
