/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands, Disposable, ExtensionContext, OutputChannel, workspace, window } from 'vscode';
import { TaskTreeDataProvider } from './taskTree';
import { invalidateTasksCacheAnt, AntTaskProvider } from './taskProviderAnt';
import { invalidateTasksCacheMake, MakeTaskProvider } from './taskProviderMake';
import { invalidateTasksCacheScript, ScriptTaskProvider } from './taskProviderScript';
import { configuration } from './common/configuration';
import { log } from './util';

export let treeDataProvider: TaskTreeDataProvider | undefined;
export let treeDataProvider2: TaskTreeDataProvider | undefined;
export let logOutputChannel: OutputChannel | undefined;


function invalidateTasksCache() 
{
    invalidateTasksCacheAnt();
    invalidateTasksCacheMake();
    invalidateTasksCacheScript();
}


export async function activate(context: ExtensionContext) 
{
    const disposables: Disposable[] = [];
    context.subscriptions.push(new Disposable(() => Disposable.from(...disposables).dispose()));

    await _activate(context, disposables).catch(err => console.error(err));
}


async function _activate(context: ExtensionContext, disposables: Disposable[]) 
{
    logOutputChannel = window.createOutputChannel('Task Explorer');
		disposables.push(logOutputChannel);
		
		//
		// Set up a log in the Output window
		//
    commands.registerCommand('taskExplorer.showOutput', () => logOutputChannel.show());
    const showOutput = configuration.get<boolean>('showOutput');
    if (showOutput) {
        logOutputChannel.show();
    }

    const tryInit = async() => {
        log('');
        log('Init extension');

        registerTaskProviders(context);

        if (configuration.get<boolean>('enableSideBar')) {
            treeDataProvider = registerExplorer('taskExplorerSideBar', context);
        }
        if (configuration.get<boolean>('enableExplorerView')) {
            treeDataProvider2 = registerExplorer('taskExplorer', context);
        }

				//
				// Register file type watchers
				//
				registerFileWatcherAnt(context);
				registerFileWatcher(context, '**/package.json');
				registerFileWatcher(context, '**/.vscode/tasks.json');
				
				//
				// Refresh tree when folders are added/removed from the workspace
				//
        let workspaceWatcher = workspace.onDidChangeWorkspaceFolders(_e => invalidateScriptCaches());
				context.subscriptions.push(workspaceWatcher);
				
				//
				// Register configurations/settings change watcher
				//
				let d = workspace.onDidChangeConfiguration(e => 
				{
						let refresh: boolean = false;

						if (e.affectsConfiguration('taskExplorer.exclude')) {
								refresh = true;
						}

						if (e.affectsConfiguration('taskExplorer.enableAnt') || e.affectsConfiguration('taskExplorer.includeAnt')) {
								//registerFileWatcherAnt(context, configuration.get<boolean>('enableAnt'));
								refresh = true;
						}

            if (e.affectsConfiguration('taskExplorer.enableBash') || e.affectsConfiguration('taskExplorer.enableBatch') ||
                e.affectsConfiguration('taskExplorer.enableMake') || e.affectsConfiguration('taskExplorer.enableNpm') ||
                e.affectsConfiguration('taskExplorer.enableGrunt') || e.affectsConfiguration('taskExplorer.enableGulp') ||
								e.affectsConfiguration('taskExplorer.enablePerl') || e.affectsConfiguration('taskExplorer.enablePowershell') ||
                e.affectsConfiguration('taskExplorer.enablePython') || e.affectsConfiguration('taskExplorer.enableRuby') ||
                e.affectsConfiguration('taskExplorer.enableTsc') || e.affectsConfiguration('taskExplorer.enableWorkspace')) 
						{
								refresh = true;
						}
						
						if (e.affectsConfiguration('taskExplorer.enableSideBar')) 
						{
								if (configuration.get<boolean>('enableSideBar')) 
								{
                    if (treeDataProvider) {
                        refresh = true;
										} 
										else {
                        treeDataProvider = registerExplorer('taskExplorerSideBar', context);
                    }
                }
						}
						
						if (e.affectsConfiguration('taskExplorer.enableExplorerView')) 
						{
								if (configuration.get<boolean>('enableExplorerView')) 
								{
                    if (treeDataProvider2) {
												refresh = true;
										} 
										else {
                        treeDataProvider2 = registerExplorer('taskExplorer', context);
                    }
                }
						}
						
						if (refresh) {
							refreshTree();
						}
				});
				
        context.subscriptions.push(d);

        log('   Task Explorer activated');
    };

    await tryInit();
}


function refreshTree()
{
		invalidateTasksCache();
		if (treeDataProvider) {
				treeDataProvider.refresh();
		}
		if (treeDataProvider2) {
				treeDataProvider2.refresh();
		}

		return;
}


function registerTaskProviders(context: ExtensionContext) 
{
		//
		// Internal Task Providers
		//
		// These tak types are provided internally by the extension.  Some task types (npm, grunt,
		//  gulp) are provided by VSCode itself
		//
		workspace.registerTaskProvider('ant', new AntTaskProvider());
		workspace.registerTaskProvider('make', new MakeTaskProvider());
		workspace.registerTaskProvider('script', new ScriptTaskProvider());

    return;
}


function registerFileWatcherAnt(context: ExtensionContext, enabled?: boolean)
{
		let includeAnt: string[] = configuration.get('includeAnt');
		registerFileWatcher(context, '**/[Bb]uild.xml');
		if (includeAnt && includeAnt.length > 0) {
				for (var i = 0; i < includeAnt.length; i++) {
						registerFileWatcher(context, includeAnt[i]);
				}
		}
}


function registerFileWatcher(context: ExtensionContext, fileBlob: string, enabled?: boolean)
{
		let watcher = workspace.createFileSystemWatcher(fileBlob);
		watcher.onDidChange(_e => invalidateScriptCaches());
		watcher.onDidDelete(_e => invalidateScriptCaches());
		watcher.onDidCreate(_e => invalidateScriptCaches());
		context.subscriptions.push(watcher);
}


function invalidateScriptCaches() 
{
		invalidateTasksCache();
		if (configuration.get<boolean>('enableSideBar') && treeDataProvider) {
				treeDataProvider.refresh();
		}
		if (configuration.get<boolean>('enableExplorerView') && treeDataProvider2) {
				treeDataProvider2.refresh();
		}
}
		

function registerExplorer(name: string, context: ExtensionContext): TaskTreeDataProvider | undefined 
{
		if (workspace.workspaceFolders) 
		{
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


export function deactivate() {}
