/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	commands,
	Disposable,
	ExtensionContext,
	OutputChannel,
	workspace,
	window
  } from "vscode";
import { TaskTreeDataProvider } from './taskTree';
import { invalidateTasksCacheAnt, AntTaskProvider } from './taskProviderAnt';
import { invalidateTasksCacheMake, MakeTaskProvider } from './taskProviderMake';
import { configuration } from "./common/configuration";
import { log } from './util';

export let treeDataProvider: TaskTreeDataProvider | undefined;
export let treeDataProvider2: TaskTreeDataProvider | undefined;
export let logOutputChannel: OutputChannel | undefined;


function invalidateTasksCache() 
{
	invalidateTasksCacheAnt();
	invalidateTasksCacheMake();
}


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
	logOutputChannel = window.createOutputChannel("Task Explorer");
	disposables.push(logOutputChannel);
	commands.registerCommand("taskExplorer.showOutput", () => logOutputChannel.show());
	
	const showOutput = configuration.get<boolean>("showOutput");
	if (showOutput) {
		logOutputChannel.show();
	}

	const tryInit = async () => 
	{
		log('');
		log('Init extension');

		register(context);

		if (configuration.get<boolean>("enableSideBar")) {
			treeDataProvider = registerExplorer("taskExplorerSideBar", context);
		}
		if (configuration.get<boolean>("enableExplorerView")) {
			treeDataProvider2 = registerExplorer("taskExplorer", context);
		}

		let d = workspace.onDidChangeConfiguration((e) => 
		{
			if (e.affectsConfiguration('taskExplorer.exclude') || e.affectsConfiguration('taskExplorer.enableAnt') ||
			    e.affectsConfiguration('taskExplorer.enableMake') || e.affectsConfiguration('taskExplorer.enableNpm') ||
				e.affectsConfiguration('taskExplorer.enableGrunt') || e.affectsConfiguration('taskExplorer.enableGulp') ||
				e.affectsConfiguration('taskExplorer.enableTsc') || e.affectsConfiguration('taskExplorer.includeAnt')) {
				invalidateTasksCache();
				if (treeDataProvider) {
					treeDataProvider.refresh();
				}
				if (treeDataProvider2) {
					treeDataProvider2.refresh();
				}
			}
			if (e.affectsConfiguration('taskExplorer.enableSideBar')) {
				if (configuration.get<boolean>("enableSideBar")) {
					if (treeDataProvider) {
						treeDataProvider.refresh();
					}
					else {
						treeDataProvider = registerExplorer("taskExplorerSideBar", context);
					}
				}
			}
			if (e.affectsConfiguration('taskExplorer.enableExplorerView')) {
				if (configuration.get<boolean>("enableExplorerView")) {
					if (treeDataProvider2) {
						treeDataProvider2.refresh();
					}
					else {
						treeDataProvider2 = registerExplorer("taskExplorer", context);
					}
				}
			}
		});
		context.subscriptions.push(d);

		log('   Task Explorer activated');
	};

	await tryInit();
}

function register(context: ExtensionContext) 
{

	function invalidateScriptCaches() 
	{
		invalidateTasksCache();
		if (configuration.get<boolean>("enableSideBar") && treeDataProvider) {
			treeDataProvider.refresh();
		}
		if (configuration.get<boolean>("enableExplorerView") && treeDataProvider2) {
			treeDataProvider2.refresh();
		}
	}

	if (workspace.workspaceFolders) 
	{
		let watcher = workspace.createFileSystemWatcher('**/[Bb]uild.xml');
		watcher.onDidChange((_e) => invalidateScriptCaches());
		watcher.onDidDelete((_e) => invalidateScriptCaches());
		watcher.onDidCreate((_e) => invalidateScriptCaches());
		context.subscriptions.push(watcher);
		
		let includeAnt: string[] = configuration.get('includeAnt');
		if (includeAnt && includeAnt.length > 0) {
			for (var i = 0; i < includeAnt.length; i++) {
				let cwatcher = workspace.createFileSystemWatcher(includeAnt[i]);
				cwatcher.onDidChange((_e) => invalidateScriptCaches());
				cwatcher.onDidDelete((_e) => invalidateScriptCaches());
				cwatcher.onDidCreate((_e) => invalidateScriptCaches());
				context.subscriptions.push(cwatcher);
			}
		}

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

		let providerMake = new MakeTaskProvider();
		let disposableMake = workspace.registerTaskProvider('make', providerMake);
	}
	return;
}


function registerExplorer(name: string, context: ExtensionContext): TaskTreeDataProvider | undefined 
{
	if (workspace.workspaceFolders) {
		let treeDataProvider = new TaskTreeDataProvider(name, context);
		const view = window.createTreeView(name, { treeDataProvider: treeDataProvider, showCollapseAll: true });
		context.subscriptions.push(view);
		return treeDataProvider;
	}
	else {
		log('No workspace folders!!!');
	}
	return undefined;
}

