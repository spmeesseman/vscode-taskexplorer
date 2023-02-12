/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable no-redeclare */
/* eslint-disable @typescript-eslint/naming-convention */

import {
	Command as VsCodeCommand, Disposable, Uri, commands, Command
} from "vscode";

type SupportedCommands = Commands | `taskExplorer.view.${string}.focus` | `taskExplorer.view.${string}.resetViewLocation`;


export const enum Commands
{
	AddToExcludesMenu = "vscode-taskexplorer.addToExcludesEx",
	ClearTaskStats = "vscode-taskexplorer.clearTaskStats",
	Donate = "vscode-taskexplorer.donate",
	DisableTaskType = "vscode-taskexplorer.disableTaskType",
	EnableTaskType = "vscode-taskexplorer.enableTaskType",
	EnterLicense = "vscode-taskexplorer.enterLicense",
	FocusExplorerView  = "taskExplorerSideBar.focus",
	FocusSidebarView  = "taskExplorer.focus",
	FocusHomeView  = "taskExplorer.view.home.focus",
	FocusTaskCountView  = "taskExplorer.view.taskCount.focus",
	FocusTaskUsageView  = "taskExplorer.view.taskUsage.focus",
	GetApi = "vscode-taskexplorer.getApi",
	GetLicense = "vscode-taskexplorer.getLicense",
    Open = "vscode-taskexplorer.open",
	Refresh = "vscode-taskexplorer.refresh",
	RemovefromExcludes = "vscode-taskexplorer.removeFromExcludes",
    Run = "vscode-taskexplorer.run",
    RunWithArgs = "vscode-taskexplorer.runWithArgs",
    RunLastTask = "vscode-taskexplorer.runLastTask",
	RefreshHomeView = "vscode-taskexplorer.home.refresh",
	RefreshLicensePage = "vscode-taskexplorer.licensePage.refresh",
	RefreshParsingReportPage = "vscode-taskexplorer.parsingReport.refresh",
	RefreshReleaseNotesPage = "vscode-taskexplorer.releaseNotes.refresh",
	RefreshTaskCountView = "vscode-taskexplorer.taskCount.refresh",
	RefreshTaskUsageView = "vscode-taskexplorer.taskUsage.refresh",
	RefreshWelcomePage = "vscode-taskexplorer.welcome.refresh",
	ShowLicensePage = "vscode-taskexplorer.view.licensePage.show",
	ShowParsingReportPage = "vscode-taskexplorer.view.parsingReport.show",
	ShowReleaseNotesPage = "vscode-taskexplorer.view.releaseNotes.show",
	ShowWelcomePage = "vscode-taskexplorer.view.welcome.show"
}

export const enum VsCodeCommands
{
	CloseActiveEditor = "workbench.action.closeActiveEditor",
	CloseAllEditors = "workbench.action.closeAllEditors",
	CursorMove = "cursorMove",
	CustomEditorShowFindWidget = "editor.action.webvieweditor.showFind",
	Diff = "vscode.diff",
	EditorScroll = "editorScroll",
	EditorShowHover = "editor.action.showHover",
	ExecuteDocumentSymbolProvider = "vscode.executeDocumentSymbolProvider",
	ExecuteCodeLensProvider = "vscode.executeCodeLensProvider",
	FocusFilesExplorer = "workbench.files.action.focusFilesExplorer",
	InstallExtension = "workbench.extensions.installExtension",
	MoveViews = "vscode.moveViews",
	Open = "vscode.open",
	OpenFolder = "vscode.openFolder",
	OpenInTerminal = "openInTerminal",
	OpenWalkthrough = "workbench.action.openWalkthrough",
	OpenWith = "vscode.openWith",
	NextEditor = "workbench.action.nextEditor",
	PreviewHtml = "vscode.previewHtml",
	RevealLine = "revealLine",
	RevealInExplorer = "revealInExplorer",
	RevealInFileExplorer = "revealFileInOS",
	SetContext = "setContext",
	ShowExplorer = "workbench.view.explorer",
	ShowReferences = "editor.action.showReferences",
	ShowSCM = "workbench.view.scm",
	UninstallExtension = "workbench.extensions.uninstallExtension",
}

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
			// this.wrapper.telemetry.sendEvent("command", { command: command });
			return callback.call(this, ...args);
		},
		thisArg
	);
};

// export const registerCommands = (container: TeWrapper): Disposable[] =>  registrableCommands.map(c => new c(container));

// export const asCommand = <T extends unknown[]>(command: Omit<VsCodeCommand, "arguments"> & { arguments: [...T] }): VsCodeCommand => command;

export function executeCommand<U = any>(command: SupportedCommands): Thenable<U>;
export function executeCommand<T = unknown, U = any>(command: SupportedCommands, arg: T): Thenable<U>;
export function executeCommand<T extends [...unknown[]] = [], U = any>(command: SupportedCommands, ...args: T): Thenable<U>;
export function executeCommand<T extends [...unknown[]] = [], U = any>(command: SupportedCommands, ...args: T): Thenable<U>
{   //
	// TODO - Telemetry
	//
	// this.wrapper.telemetry.sendEvent("command/taskexplorer", { command: command });
	return commands.executeCommand<U>(command, ...args);
}

// export function executeVsCodeCommand<T = unknown, U = any>(command: VsCodeCommands, arg: T): Thenable<U>;
// export function executeVsCodeCommand<T extends [...unknown[]] = [], U = any>(command: VsCodeCommands, ...args: T): Thenable<U>;
// export function executeVsCodeCommand<T extends [...unknown[]] = [], U = any>(command: VsCodeCommands, ...args: T): Thenable<U>
// {   //
//     // TODO - Telemetry
//     //
//	   if (command !== VsCodeCommands.ExecuteDocumentSymbolProvider) {
// 		   this.wrapper.telemetry.sendEvent("command/vscode", { command: command });
// 	   }
// 	   return commands.executeCommand<U>(command, ...args);
// }

// export const executeEditorCommand = <T>(command: Commands, uri: Uri | undefined, args: T) => commands.executeCommand(command, uri, args);
