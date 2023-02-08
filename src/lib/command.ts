
import { Command as CoreCommand, Disposable, Uri, commands, Command } from "vscode";
// import { CoreGitCommands } from "../constants";
import { VsCodeCommands, Commands, TeCommands } from "./constants";
import { TeWrapper } from "./wrapper";
// import { Container } from "../container";

// type CommandConstructor = new (container: TeWrapper) => Command;
// const registrableCommands: CommandConstructor[] = [];


// export const command = (): ClassDecorator =>
// {
// 	return (target: any) => {
// 		registrableCommands.push(target);
// 	};
// };


export const registerCommand = (command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable =>
{
	return commands.registerCommand(
		command,
		function (this: any, ...args) {
			// TeWrapper.instance.telemetry.sendEvent("command", { command: command });
			return callback.call(this, ...args);
		},
		thisArg
	);
};


// export const registerCommands = (container: TeWrapper): Disposable[] =>  registrableCommands.map(c => new c(container));


export const asCommand = <T extends unknown[]>(command: Omit<CoreCommand, "arguments"> & { arguments: [...T] }): CoreCommand => command;


// export const executeActionCommand = <T extends ActionContext>(action: Action<T>, args: Omit<T, "type">) =>
// 	commands.executeCommand(`${Commands.ActionPrefix}${action}`, { ...args, type: action });


type SupportedCommands = Commands | TeCommands | `taskExplorer.view.${string}.focus` | `taskExplorer.view.${string}.resetViewLocation`;


export function executeCommand<U = any>(command: SupportedCommands): Thenable<U>;
// eslint-disable-next-line no-redeclare
export function executeCommand<T = unknown, U = any>(command: SupportedCommands, arg: T): Thenable<U>;
// eslint-disable-next-line no-redeclare
export function executeCommand<T extends [...unknown[]] = [], U = any>(command: SupportedCommands, ...args: T): Thenable<U>;
// eslint-disable-next-line no-redeclare, prefer-arrow/prefer-arrow-functions
export function executeCommand<T extends [...unknown[]] = [], U = any>(command: SupportedCommands, ...args: T): Thenable<U>
{
	return commands.executeCommand<U>(command, ...args);
}


// export function executeTeCommand<U = any>(command: SupportedCommands): Thenable<U>;
// // eslint-disable-next-line no-redeclare
// export function executeTeCommand<T = unknown, U = any>(command: SupportedCommands, arg: T): Thenable<U>;
// // eslint-disable-next-line no-redeclare
// export function executeTeCommand<T extends [...unknown[]] = [], U = any>(command: SupportedCommands, ...args: T): Thenable<U>;
// // eslint-disable-next-line no-redeclare, prefer-arrow/prefer-arrow-functions
// export function executeTeCommand<T extends [...unknown[]] = [], U = any>(command: SupportedCommands, ...args: T): Thenable<U>
// {
// 	return commands.executeCommand<U>(`vscode-taskexplorer.${command}`, ...args);
// }


// export function executeVsCodeCommand<T = unknown, U = any>(command: VsCodeCommands, arg: T): Thenable<U>;
// // eslint-disable-next-line no-redeclare
// export function executeVsCodeCommand<T extends [...unknown[]] = [], U = any>(command: VsCodeCommands, ...args: T): Thenable<U>;
// // eslint-disable-next-line no-redeclare, prefer-arrow/prefer-arrow-functions
// export function executeVsCodeCommand<T extends [...unknown[]] = [], U = any>(command: VsCodeCommands, ...args: T): Thenable<U>
// {
// 	// if (command !== VsCodeCommands.ExecuteDocumentSymbolProvider) {
// 	// 	TeWrapper.instance.telemetry.sendEvent("command/core", { command: command });
// 	// }
// 	return commands.executeCommand<U>(command, ...args);
// }


// export const executeEditorCommand = <T>(command: Commands, uri: Uri | undefined, args: T) => commands.executeCommand(command, uri, args);
