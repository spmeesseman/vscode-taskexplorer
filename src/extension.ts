/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as httpRequest from 'request-light';
import {
	commands,
	Disposable,
	DocumentSelector,
	ExtensionContext,
	OutputChannel,
	TaskProvider,
	languages,
	workspace,
	window
  } from "vscode";
import { addJSONProviders } from './features/jsonContributions';
import { TaskTreeDataProvider } from './taskView';
import { invalidateTasksCache, NpmTaskProvider, AntTaskProvider } from './tasks';
import { invalidateHoverScriptsCache, NpmScriptHoverProvider } from './scriptHover';
import { runSelectedScript } from './commands';
import { configuration } from "./common/configuration";
import { log } from './util';
import { utils } from 'mocha';

let treeDataProvider: TaskTreeDataProvider | undefined;
export let logOutputChannel: OutputChannel | undefined;


export async function activate(context: ExtensionContext) 
{
	const disposables: Disposable[] = [];
	context.subscriptions.push(
	  new Disposable(() => Disposable.from(...disposables).dispose())
	);
  
	await _activate(context, disposables).catch(err => console.error(err));
}


async function _activate(context: ExtensionContext, disposables: Disposable[])
{
	logOutputChannel = window.createOutputChannel("Task View");
	commands.registerCommand("taskView.showOutput", () => logOutputChannel.show());
	disposables.push(logOutputChannel);

	const showOutput = configuration.get<boolean>("showOutput");
	if (showOutput) {
		logOutputChannel.show();
	}

	const tryInit = async () => 
	{
		registerTaskProvider(context);
		treeDataProvider = registerExplorer(context);
		registerHoverProvider(context);

		configureHttpRequest();
		let d = workspace.onDidChangeConfiguration((e) => {
			configureHttpRequest();
			if (e.affectsConfiguration('taskView.exclude')) {
				invalidateTasksCache();
				if (treeDataProvider) {
					treeDataProvider.refresh();
				}
			}
		});
		context.subscriptions.push(d);

		d = workspace.onDidChangeTextDocument((e) => {
			invalidateHoverScriptsCache(e.document);
		});
		context.subscriptions.push(d);
		context.subscriptions.push(commands.registerCommand('taskView.runSelectedScript', runSelectedScript));
		context.subscriptions.push(addJSONProviders(httpRequest.xhr));

		log('Tasks View started successfully');
		log(' ');
	};

	await tryInit();
}

function registerTaskProvider(context: ExtensionContext): Disposable | undefined 
{

	function invalidateScriptCaches() 
	{
		invalidateHoverScriptsCache();
		invalidateTasksCache();
		if (treeDataProvider) {
			treeDataProvider.refresh();
		}
	}

	if (workspace.workspaceFolders) 
	{
		let watcher = workspace.createFileSystemWatcher('**/package.json');
		watcher.onDidChange((_e) => invalidateScriptCaches());
		watcher.onDidDelete((_e) => invalidateScriptCaches());
		watcher.onDidCreate((_e) => invalidateScriptCaches());
		context.subscriptions.push(watcher);

		let workspaceWatcher = workspace.onDidChangeWorkspaceFolders((_e) => invalidateScriptCaches());
		context.subscriptions.push(workspaceWatcher);

		let provider: TaskProvider = new NpmTaskProvider();
		let disposable = workspace.registerTaskProvider('taskView', provider);
		context.subscriptions.push(disposable);

		let provider2 = new AntTaskProvider();
		let disposable2 = workspace.registerTaskProvider('taskView', provider2);

		return disposable;
	}
	return undefined;
}


function registerExplorer(context: ExtensionContext): TaskTreeDataProvider | undefined 
{
	if (workspace.workspaceFolders) {
		let showCollapseAll = true;
		let treeDataProvider = new TaskTreeDataProvider(context);
		const view = window.createTreeView('taskView', { treeDataProvider: treeDataProvider, showCollapseAll: true });
		context.subscriptions.push(view);
		return treeDataProvider;
	}
	return undefined;
}


function registerHoverProvider(context: ExtensionContext): NpmScriptHoverProvider | undefined 
{
	if (workspace.workspaceFolders) {
		let npmSelector: DocumentSelector = {
			language: 'json',
			scheme: 'file',
			pattern: '**/package.json'
		};
		let provider = new NpmScriptHoverProvider(context);
		context.subscriptions.push(languages.registerHoverProvider(npmSelector, provider));
		return provider;
	}
	return undefined;
}


function configureHttpRequest() 
{
	const httpSettings = workspace.getConfiguration('http');
	httpRequest.configure(httpSettings.get<string>('proxy', ''), httpSettings.get<boolean>('proxyStrictSSL', true));
}


export function deactivate(): void 
{
}
