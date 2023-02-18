/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable @typescript-eslint/naming-convention */

import { VsCodeCommands } from "./command";
import { ITeContext, IDictionary } from "../interface";
import { commands, Disposable, Event, EventEmitter } from "vscode";
import type { WebviewIds } from "../webview/webviewPanel";
import type { WebviewViewIds } from "../webview/webviewView";

export const enum ContextKeys
{
	ActionPrefix = "taskexplorer:action:",
	KeyPrefix = "taskexplorer:key:",
	TreeViewPrefix = "taskexplorer:treeView:",
	WebviewPrefix = "taskexplorer:webview:",
	WebviewViewPrefix = "taskexplorer:webviewView:",
	Debugging = "taskexplorer:debugging",
	Disabled = "taskexplorer:disabled",
	Enabled = "taskexplorer:enabled",
	Untrusted = "taskexplorer:untrusted",
	licensePage = "taskexplorer:licensePage",
	ParsingReport = "taskexplorer:parsingReport",
	ReleaseNotes = "taskexplorer:releaseNotes",
	TaskFiles = "taskexplorer:taskFiles",
	Tests = "taskexplorer:tests",
	TestsTest = "taskexplorer:testsTest"
}

type WebviewPageContextKeys =
	| `${ContextKeys.WebviewPrefix}${WebviewIds}:active`
	| `${ContextKeys.WebviewPrefix}${WebviewIds}:focus`
	| `${ContextKeys.WebviewPrefix}${WebviewIds}:inputFocus`;


type WebviewViewContextKeys =
	| `${ContextKeys.WebviewViewPrefix}${WebviewViewIds}:focus`
	| `${ContextKeys.WebviewViewPrefix}${WebviewViewIds}:inputFocus`;


type AllContextKeys =
	| ContextKeys
	| WebviewPageContextKeys
	| WebviewViewContextKeys
	| `${ContextKeys.ActionPrefix}${string}`
	| `${ContextKeys.KeyPrefix}${string}`;


export class TeContext implements ITeContext, Disposable
{
	private contextStorage: IDictionary<unknown> = {};
	private _onDidChangeContext = new EventEmitter<AllContextKeys>();
	public onDidChangeContext: Event<AllContextKeys>;

	constructor()
	{
		this.onDidChangeContext = this._onDidChangeContext.event;
	}

	dispose()
	{
		throw new Error("Method not implemented.");
	}

	getContext = <T>(key: AllContextKeys, defaultValue?: T) => this.contextStorage[key] as T | undefined || defaultValue;


	setContext = async(key: AllContextKeys, value: unknown): Promise<void> =>
	{
		this.contextStorage[key] = value;
		void (await commands.executeCommand(VsCodeCommands.SetContext, key, value));
		this._onDidChangeContext.fire(key);
	};

}
