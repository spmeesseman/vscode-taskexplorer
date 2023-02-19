
import { log } from "../log/log";
import { Disposable, window } from "vscode";
import { Commands, registerCommand } from "./command";


const donate = async() =>
{
    log.methodStart("donate command", 1, "", true);
    window.showInformationMessage("Not implemented yet");
    log.methodDone("donate command", 1, "");
};


export const registerDonateCommand = (disposables: Disposable[]) =>
{
	disposables.push(
        registerCommand(Commands.Donate, async () => { await donate(); })
    );
};
