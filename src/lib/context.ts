import { commands, EventEmitter } from "vscode";
import { VsCodeCommands, ContextKeys } from "./constants";
import type { WebviewIds } from "../webview/webviewPanel";
import type { WebviewViewIds } from "../webview/webviewView";

const contextStorage = new Map<string, unknown>();
const _onDidChangeContext = new EventEmitter<AllContextKeys>();
export const onDidChangeContext = _onDidChangeContext.event;

type WebviewContextKeys =
	| `${ContextKeys.WebviewPrefix}${WebviewIds}:active`
	| `${ContextKeys.WebviewPrefix}${WebviewIds}:focus`
	| `${ContextKeys.WebviewPrefix}${WebviewIds}:inputFocus`;

type WebviewViewContextKeys =
	| `${ContextKeys.WebviewViewPrefix}${WebviewViewIds}:focus`
	| `${ContextKeys.WebviewViewPrefix}${WebviewViewIds}:inputFocus`;

type AllContextKeys =
	| ContextKeys
	| WebviewContextKeys
	| WebviewViewContextKeys
	| `${ContextKeys.ActionPrefix}${string}`
	| `${ContextKeys.KeyPrefix}${string}`;

export function getContext<T>(key: AllContextKeys): T | undefined;

// eslint-disable-next-line no-redeclare
export function getContext<T>(key: AllContextKeys, defaultValue: T): T;

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions, no-redeclare
export function getContext<T>(key: AllContextKeys, defaultValue?: T): T | undefined
{
	return (contextStorage.get(key) as T | undefined) ?? defaultValue;
}

export  const setContext = async(key: AllContextKeys, value: unknown): Promise<void> =>
{
	contextStorage.set(key, value);
	void (await commands.executeCommand(VsCodeCommands.SetContext, key, value));
	_onDidChangeContext.fire(key);
};
