/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    commands, Disposable, ExtensionContext, OutputChannel, Uri, TreeView, TreeItem,
    workspace, window, FileSystemWatcher, ConfigurationChangeEvent,
} from 'vscode';
import { TaskTreeDataProvider } from './taskTree';
import { AntTaskProvider } from './taskProviderAnt';
import { MakeTaskProvider } from './taskProviderMake';
import { ScriptTaskProvider } from './taskProviderScript';
import { GradleTaskProvider } from './taskProviderGradle';
import { GruntTaskProvider } from './taskProviderGrunt';
import { GulpTaskProvider } from './taskProviderGulp';
import { configuration } from './common/configuration';
import { log } from './util';

export let treeDataProvider: TaskTreeDataProvider | undefined;
export let treeDataProvider2: TaskTreeDataProvider | undefined;
export let logOutputChannel: OutputChannel | undefined;
export let views: Map<String, TreeView<TreeItem>> = new Map();
let watchers: Map<String, FileSystemWatcher> = new Map();


export async function activate(context: ExtensionContext, disposables: Disposable[]) 
{
    //
    // Set up a log in the Output window
    //
    logOutputChannel = window.createOutputChannel('Task Explorer');
    context.subscriptions.push(logOutputChannel);
    context.subscriptions.push(commands.registerCommand('taskExplorer.showOutput', () => logOutputChannel.show()));
    const showOutput = configuration.get<boolean>('showOutput');
    if (showOutput) {
        logOutputChannel.show();
    }

    log('');
    log('Init extension');

    //
    // Register internal task providers.  Npm, Tas, Gulp, and Grunt type tasks are provided
    // by VSCode, not internally.
    //
    registerTaskProviders(context);

    //
    // Register the tree providers
    //
    if (configuration.get<boolean>('enableSideBar')) {
        treeDataProvider = registerExplorer('taskExplorerSideBar', context);
    }
    if (configuration.get<boolean>('enableExplorerView')) {
        treeDataProvider2 = registerExplorer('taskExplorer', context);
    }

    //
    // Register file type watchers
    //
    registerFileWatchers(context);

    //
    // Refresh tree when folders are added/removed from the workspace
    //
    let workspaceWatcher = workspace.onDidChangeWorkspaceFolders(_e => refreshTree());
    context.subscriptions.push(workspaceWatcher);

    //
    // Register configurations/settings change watcher
    //
    let d = workspace.onDidChangeConfiguration(e => {
        processConfigChanges(context, e);
    });
    context.subscriptions.push(d);

    log('   Task Explorer activated');
}


function processConfigChanges(context: ExtensionContext, e: ConfigurationChangeEvent) 
{
    let refresh: boolean;

    if (e.affectsConfiguration('taskExplorer.exclude')) {
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableAnt') || e.affectsConfiguration('taskExplorer.includeAnt')) {
        registerFileWatcherAnt(context, configuration.get<boolean>('enableAnt'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableBash')) {
        registerFileWatcher(context, 'bash', '**/*.sh', true, configuration.get<boolean>('enableBash'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableBatch')) {
        registerFileWatcher(context, 'batch', '**/*.bat', true, configuration.get<boolean>('enableBatch'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableGradle')) {
        registerFileWatcher(context, 'grunt', '**/*.gradle', configuration.get<boolean>('enableGradle'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableGrunt')) {
        registerFileWatcher(context, 'grunt', '**/gruntfile.js', false, configuration.get<boolean>('enableGrunt'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableGulp')) {
        registerFileWatcher(context, 'gulp', '**/gulpfile.js', false, configuration.get<boolean>('enableGulp'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableMake')) {
        registerFileWatcher(context, 'bash', '**/Makefile', false, configuration.get<boolean>('enableMake'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableNpm')) {
        registerFileWatcher(context, 'npm', '**/package.json', false, configuration.get<boolean>('enableNpm'));
        refresh = true;
    }
    
    if (e.affectsConfiguration('taskExplorer.enableNsis')) {
        registerFileWatcher(context, 'nsis', '**/*.nsi', true, configuration.get<boolean>('enableNsis'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enablePerl')) {
        registerFileWatcher(context, 'perl', '**/*.pl', true, configuration.get<boolean>('enablePerl'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enablePowershell')) {
        registerFileWatcher(context, 'powershell', '**/*.ps1', true, configuration.get<boolean>('enablePowershell'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enablePython')) {
        registerFileWatcher(context, 'python', '**/*.py', true, configuration.get<boolean>('enablePython'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableRuby')) {
        registerFileWatcher(context, 'ruby', '**/*.rb', true, configuration.get<boolean>('enableRuby'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableTsc')) {
        registerFileWatcher(context, 'tsc', '**/tsconfig.json', false, configuration.get<boolean>('enableTsc'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableWorkspace')) {
        registerFileWatcher(context, 'workspace', '**/.vscode/tasks.json', false, configuration.get<boolean>('enableWorkspace'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableSideBar')) {
        if (configuration.get<boolean>('enableSideBar')) {
            if (treeDataProvider) {
                refresh = true;
            } 
            else {
                treeDataProvider = registerExplorer('taskExplorerSideBar', context);
            }
        }
    }

    if (e.affectsConfiguration('taskExplorer.enableExplorerView')) {
        if (configuration.get<boolean>('enableExplorerView')) {
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
}


function registerFileWatchers(context: ExtensionContext) 
{
    if (configuration.get<boolean>('enableAnt')) {
        registerFileWatcherAnt(context);
    }
    if (configuration.get<boolean>('enableBash')) {
        registerFileWatcher(context, 'bash', '**/*.sh', true);
    }

    if (configuration.get<boolean>('enableBatch')) {
        registerFileWatcher(context, 'batch', '**/*.bat', true);
    }

    if (configuration.get<boolean>('enableGradle')) {
        registerFileWatcher(context, 'grunt', '**/*.gradle');
    }

    if (configuration.get<boolean>('enableGrunt')) {
        registerFileWatcher(context, 'grunt', '**/gruntfile.js');
    }

    if (configuration.get<boolean>('enableGulp')) {
        registerFileWatcher(context, 'gulp', '**/gulpfile.js');
    }

    if (configuration.get<boolean>('enableMake')) {
        registerFileWatcher(context, 'bash', '**/Makefile');
    }

    if (configuration.get<boolean>('enableNpm')) {
        registerFileWatcher(context, 'npm', '**/package.json');
    }

    if (configuration.get<boolean>('enableNsis')) {
        registerFileWatcher(context, 'nsis', '**/*.nsi', true);
    }

    if (configuration.get<boolean>('enablePerl')) {
        registerFileWatcher(context, 'perl', '**/*.pl', true);
    }

    if (configuration.get<boolean>('enablePowershell')) {
        registerFileWatcher(context, 'powershell', '**/*.ps1', true);
    }

    if (configuration.get<boolean>('enablePython')) {
        registerFileWatcher(context, 'python', '**/*.py', true);
    }

    if (configuration.get<boolean>('enableRuby')) {
        registerFileWatcher(context, 'ruby', '**/*.rb', true);
    }

    if (configuration.get<boolean>('enableTsc')) {
        registerFileWatcher(context, 'tsc', '**/tsconfig.json');
    }

    if (configuration.get<boolean>('enableWorkspace')) {
        registerFileWatcher(context, 'workspace', '**/.vscode/tasks.json');
    }
}


function refreshTree(taskType?: string, uri?: Uri) 
{
    let refreshedTasks: boolean = false;
    if (configuration.get<boolean>('enableSideBar') && treeDataProvider) {
        refreshedTasks = true;
        treeDataProvider.refresh(taskType, uri);
    }
    if (configuration.get<boolean>('enableExplorerView') && treeDataProvider2) {
        if (!refreshedTasks) {
            treeDataProvider2.refresh(taskType, uri);
        }
        else {
            treeDataProvider2.refresh(false, uri);
        }
    }
}


function registerTaskProviders(context: ExtensionContext) 
{
    //
    // Internal Task Providers
    //
    // These tak types are provided internally by the extension.  Some task types (npm, grunt,
    //  gulp) are provided by VSCode itself
    //
    context.subscriptions.push(workspace.registerTaskProvider('ant', new AntTaskProvider()));
    context.subscriptions.push(workspace.registerTaskProvider('make', new MakeTaskProvider()));
    context.subscriptions.push(workspace.registerTaskProvider('script', new ScriptTaskProvider()));
    context.subscriptions.push(workspace.registerTaskProvider('grunt', new GruntTaskProvider()));
    context.subscriptions.push(workspace.registerTaskProvider('gulp', new GulpTaskProvider()));
    context.subscriptions.push(workspace.registerTaskProvider('gradle', new GradleTaskProvider()));
}


function registerFileWatcherAnt(context: ExtensionContext, enabled?: boolean)
 {
    registerFileWatcher(context, 'ant', '**/[Bb]uild.xml', false, enabled);

    //
    // For extra file globs configured in settings, we need to first go through and disable
    // all current watchers since there is no way of knowing which glob patterns were
    // removed (if any).
    //
    for (var key in watchers.keys) 
    {
        if (key.startsWith('ant') && key !== 'ant') 
        {
            let watcher = watchers.get(key);
            watcher.onDidChange(_e => undefined);
            watcher.onDidDelete(_e => undefined);
            watcher.onDidCreate(_e => undefined);
        }
    }

    let includeAnt: string[] = configuration.get('includeAnt');
    if (includeAnt && includeAnt.length > 0) {
        for (var i = 0; i < includeAnt.length; i++) {
            registerFileWatcher(context, 'ant-' + includeAnt[i], includeAnt[i], false, enabled);
        }
    }
}


function registerFileWatcher(context: ExtensionContext, taskType: string, fileBlob: string, isScriptType?: boolean, enabled?: boolean) 
{
    let watcher: FileSystemWatcher = watchers.get(taskType);

    if (enabled !== false) {
        if (!watcher) {
            watcher = workspace.createFileSystemWatcher(fileBlob);
            watchers.set(taskType, watcher);
            context.subscriptions.push(watcher);
        }
        if (!isScriptType) {
            watcher.onDidChange(_e => refreshTree(taskType, _e));
        }
        watcher.onDidDelete(_e => refreshTree(taskType, _e));
        watcher.onDidCreate(_e => refreshTree(taskType, _e));
    } 
    else if (watchers.get(taskType)) {
        if (!isScriptType) {
            watcher.onDidChange(_e => undefined);
        }
        watcher.onDidDelete(_e => undefined);
        watcher.onDidCreate(_e => undefined);
    }
}


function registerExplorer(name: string, context: ExtensionContext, enabled?: boolean): TaskTreeDataProvider | undefined 
{
    if (enabled !== false)
    {
        if (workspace.workspaceFolders) 
        {
            let treeDataProvider = new TaskTreeDataProvider(name, context);
            views.set(name, window.createTreeView(name, { treeDataProvider: treeDataProvider, showCollapseAll: true }));
            context.subscriptions.push(views.get(name));
            return treeDataProvider;
        } 
        else {
            log('No workspace folders!!!');
        }
    }
    //else
    //{
    //    context.subscriptions.forEach(each => {
    //        let treeView: TreeView<TreeItem> = each as TreeView<TreeItem>;
    //        treeView.
    //        if (each instanceof TreeView) {
    //
    //        }
    //    });
    //}
    return undefined;
}


export function deactivate() {}
