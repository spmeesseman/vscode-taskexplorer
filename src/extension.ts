/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as httpRequest from 'request-light';
import {
	commands,
	Disposable,
	ExtensionContext,
	OutputChannel,
	workspace,
	window
  } from "vscode";
import { addJSONProviders } from './features/jsonContributions';
import { TaskTreeDataProvider } from './taskExplorer';
import { invalidateTasksCache, AntTaskProvider } from './tasks';
import { configuration } from "./common/configuration";
import { log } from './util';

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
	commands.registerCommand("taskExplorer.showOutput", () => logOutputChannel.show());
	disposables.push(logOutputChannel);

	const showOutput = configuration.get<boolean>("showOutput");
	if (showOutput) {
		logOutputChannel.show();
	}

	const tryInit = async () => 
	{
		registerAntTaskProvider(context);
		treeDataProvider = registerExplorer(context);

		configureHttpRequest();
		let d = workspace.onDidChangeConfiguration((e) => {
			configureHttpRequest();
			if (e.affectsConfiguration('taskExplorer.exclude')) {
				invalidateTasksCache();
				if (treeDataProvider) {
					treeDataProvider.refresh();
				}
			}
		});
		context.subscriptions.push(d);

		context.subscriptions.push(addJSONProviders(httpRequest.xhr));

		log('Tasks View started successfully');
		log(' ');
	};

	await tryInit();
}

function registerAntTaskProvider(context: ExtensionContext): Disposable | undefined 
{

	function invalidateScriptCaches() 
	{
		invalidateTasksCache();
		if (treeDataProvider) {
			treeDataProvider.refresh();
		}
	}

	if (workspace.workspaceFolders) 
	{
		let watcher = workspace.createFileSystemWatcher('**/[Bb]uild.xml');
		watcher.onDidChange((_e) => invalidateScriptCaches());
		watcher.onDidDelete((_e) => invalidateScriptCaches());
		watcher.onDidCreate((_e) => invalidateScriptCaches());
		context.subscriptions.push(watcher);
		
		let watcher2 = workspace.createFileSystemWatcher('**/package.json');
		watcher2.onDidChange((_e) => invalidateScriptCaches());
		watcher2.onDidDelete((_e) => invalidateScriptCaches());
		watcher2.onDidCreate((_e) => invalidateScriptCaches());
		context.subscriptions.push(watcher2);

		let watcher3 = workspace.createFileSystemWatcher('**/.vscode/tasks.json');
		watcher3.onDidChange((_e) => invalidateScriptCaches());
		watcher3.onDidDelete((_e) => invalidateScriptCaches());
		watcher3.onDidCreate((_e) => invalidateScriptCaches());
		context.subscriptions.push(watcher3);

		let workspaceWatcher = workspace.onDidChangeWorkspaceFolders((_e) => invalidateScriptCaches());
		context.subscriptions.push(workspaceWatcher);

		let provider = new AntTaskProvider();
		let disposable = workspace.registerTaskProvider('ant', provider);

		return disposable;
	}
	return undefined;
}


function registerExplorer(context: ExtensionContext): TaskTreeDataProvider | undefined 
{
	if (workspace.workspaceFolders) {
		let showCollapseAll = true;
		let treeDataProvider = new TaskTreeDataProvider(context);
		const view = window.createTreeView('taskExplorer', { treeDataProvider: treeDataProvider, showCollapseAll: true });
		context.subscriptions.push(view);
		return treeDataProvider;
	}
	else {
		log('Error - Not using workspace folders!!!');
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
