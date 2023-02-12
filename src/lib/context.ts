/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable @typescript-eslint/naming-convention */

import { VsCodeCommands } from "./command";
import { IDictionary } from "src/interface";
import { commands, EventEmitter } from "vscode";
import type { WebviewIds } from "../webview/webviewPanel";
import type { WebviewViewIds } from "../webview/webviewView";

const contextStorage: IDictionary<unknown> = {};
const _onDidChangeContext = new EventEmitter<AllContextKeys>();
export const onDidChangeContext = _onDidChangeContext.event;


export const enum ContextKeys
{
	ActionPrefix = "taskExplorer:action:",
	KeyPrefix = "taskExplorer:key:",
	WebviewPrefix = "taskExplorer:webview:",
	WebviewViewPrefix = "taskExplorer:webviewView:",
	Debugging = "taskExplorer:debugging",
	Disabled = "taskExplorer:disabled",
	Enabled = "taskExplorer:enabled",
	Untrusted = "taskExplorer:untrusted",
	licensePage = "taskExplorer:licensePage",
	ParsingReport = "taskExplorer:parsingReport",
	ReleaseNotes = "taskExplorer:releaseNotes",
	TaskFiles = "taskExplorer:taskFiles",
	Tests = "taskExplorer:tests",
	TestsTest = "taskExplorer:testsTest"
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


export const getContext = <T>(key: AllContextKeys, defaultValue?: T) => contextStorage[key] as T | undefined || defaultValue;


export  const setContext = async(key: AllContextKeys, value: unknown): Promise<void> =>
{
	contextStorage[key] = value;
	void (await commands.executeCommand(VsCodeCommands.SetContext, key, value));
	_onDidChangeContext.fire(key);
};
