/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable no-redeclare */
/* eslint-disable @typescript-eslint/naming-convention */

import {
	Command as VsCodeCommand, Disposable, Uri, commands, Command
} from "vscode";

type SupportedCommands = Commands | `taskexplorer.view.${string}.focus` | `taskexplorer.view.${string}.resetViewLocation`;


export const enum Commands
{
	AddToExcludesMenu = "taskexplorer.addToExcludesEx",
	ClearTaskStats = "taskexplorer.clearTaskStats",
	Donate = "taskexplorer.donate",
	DisableTaskType = "taskexplorer.disableTaskType",
	EnableTaskType = "taskexplorer.enableTaskType",
	EnterLicense = "taskexplorer.enterLicense",
	FocusExplorerTreeView  = "taskexplorer.view.taskTreeExplorer.focus",
	FocusSidebarTreeView  = "taskexplorer.view.taskTreeSideBar.focus",
	FocusSidebarView  = "taskExplorerSideBar.focus",
	FocusHomeView  = "taskexplorer.view.home.focus",
	FocusTaskCountView  = "taskexplorer.view.taskCount.focus",
	FocusTaskUsageView  = "taskexplorer.view.taskUsage.focus",
	GetApi = "taskexplorer.getApi",
	GetLicense = "taskexplorer.getLicense",
    Open = "taskexplorer.open",
	Refresh = "taskexplorer.refresh",
	RemovefromExcludes = "taskexplorer.removeFromExcludes",
    Run = "taskexplorer.run",
    RunWithArgs = "taskexplorer.runWithArgs",
    RunLastTask = "taskexplorer.runLastTask",
	RefreshHomeView = "taskexplorer.view.home.refresh",
	RefreshLicensePage = "taskexplorer.view.licensePage.refresh",
	RefreshParsingReportPage = "taskexplorer.view.parsingReport.refresh",
	RefreshReleaseNotesPage = "taskexplorer.view.releaseNotes.refresh",
	RefreshTaskCountView = "taskexplorer.view.taskCount.refresh",
	RefreshTaskUsageView = "taskexplorer.view.taskUsage.refresh",
	RefreshWelcomePage = "taskexplorer.view.welcome.refresh",
	ShowLicensePage = "taskexplorer.view.licensePage.show",
	ShowParsingReportPage = "taskexplorer.view.parsingReport.show",
	ShowReleaseNotesPage = "taskexplorer.view.releaseNotes.show",
	ShowWelcomePage = "taskexplorer.view.welcome.show"
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
