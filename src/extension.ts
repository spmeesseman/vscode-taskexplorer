/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    commands, Disposable, ExtensionContext, OutputChannel,
    workspace, window, FileSystemWatcher, ConfigurationChangeEvent
} from 'vscode';
import { TaskTreeDataProvider } from './taskTree';
import { invalidateTasksCacheAnt, AntTaskProvider } from './taskProviderAnt';
import { invalidateTasksCacheMake, MakeTaskProvider } from './taskProviderMake';
import { invalidateTasksCacheScript, ScriptTaskProvider } from './taskProviderScript';
import { invalidateTasksCacheGrunt, GruntTaskProvider } from './taskProviderGrunt';
import { invalidateTasksCacheGulp, GulpTaskProvider } from './taskProviderGulp';
import { configuration } from './common/configuration';
import { log } from './util';

export let treeDataProvider: TaskTreeDataProvider | undefined;
export let treeDataProvider2: TaskTreeDataProvider | undefined;
export let logOutputChannel: OutputChannel | undefined;

let watchers: Map<String, FileSystemWatcher> = new Map();


function invalidateTasksCache() 
{
    //
    // All internal task providers export an invalidate() function...
    //
    invalidateTasksCacheAnt();
    invalidateTasksCacheMake();
    invalidateTasksCacheScript();
    invalidateTasksCacheGrunt();
    invalidateTasksCacheGulp();
}


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
    let workspaceWatcher = workspace.onDidChangeWorkspaceFolders(_e => invalidateScriptCaches());
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
        registerFileWatcher(context, 'bash', '**/*.sh', configuration.get<boolean>('enableBash'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableBatch')) {
        registerFileWatcher(context, 'batch', '**/*.bat', configuration.get<boolean>('enableBatch'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableGrunt')) {
        registerFileWatcher(context, 'grunt', '**/gruntfile.js', configuration.get<boolean>('enableGrunt'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableGulp')) {
        registerFileWatcher(context, 'gulp', '**/gulpfile.js', configuration.get<boolean>('enableGulp'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableMake')) {
        registerFileWatcher(context, 'bash', '**/*.sh', configuration.get<boolean>('enableMake'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableNpm')) {
        registerFileWatcher(context, 'npm', '**/package.json', configuration.get<boolean>('enableNpm'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enablePerl')) {
        registerFileWatcher(context, 'perl', '**/*.pl', configuration.get<boolean>('enablePerl'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enablePowershell')) {
        registerFileWatcher(context, 'powershell', '**/*.ps1', configuration.get<boolean>('enablePowershell'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enablePython')) {
        registerFileWatcher(context, 'python', '**/*.py', configuration.get<boolean>('enablePython'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableRuby')) {
        registerFileWatcher(context, 'ruby', '**/*.rb', configuration.get<boolean>('enableRuby'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableTsc')) {
        registerFileWatcher(context, 'tsc', '**/tsconfig.json', configuration.get<boolean>('enableTsc'));
        refresh = true;
    }

    if (e.affectsConfiguration('taskExplorer.enableWorkspace')) {
        registerFileWatcher(context, 'workspace', '**/.vscode/tasks.json', configuration.get<boolean>('enableWorkspace'));
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
        registerFileWatcher(context, 'bash', '**/*.sh');
    }

    if (configuration.get<boolean>('enableBatch')) {
        registerFileWatcher(context, 'batch', '**/*.bat');
    }

    if (configuration.get<boolean>('enableGrunt')) {
        registerFileWatcher(context, 'grunt', '**/gruntfile.js');
    }

    if (configuration.get<boolean>('enableGulp')) {
        registerFileWatcher(context, 'gulp', '**/gulpfile.js');
    }

    if (configuration.get<boolean>('enableMake')) {
        registerFileWatcher(context, 'bash', '**/*.sh');
    }

    if (configuration.get<boolean>('enableNpm')) {
        registerFileWatcher(context, 'npm', '**/package.json');
    }

    if (configuration.get<boolean>('enablePerl')) {
        registerFileWatcher(context, 'perl', '**/*.pl');
    }

    if (configuration.get<boolean>('enablePowershell')) {
        registerFileWatcher(context, 'powershell', '**/*.ps1');
    }

    if (configuration.get<boolean>('enablePython')) {
        registerFileWatcher(context, 'python', '**/*.py');
    }

    if (configuration.get<boolean>('enableRuby')) {
        registerFileWatcher(context, 'ruby', '**/*.rb');
    }

    if (configuration.get<boolean>('enableTsc')) {
        registerFileWatcher(context, 'tsc', '**/tsconfig.json');
    }

    if (configuration.get<boolean>('enableWorkspace')) {
        registerFileWatcher(context, 'workspace', '**/.vscode/tasks.json');
    }
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
}


function registerFileWatcherAnt(context: ExtensionContext, enabled?: boolean)
 {
    registerFileWatcher(context, 'ant', '**/[Bb]uild.xml', enabled);

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
            registerFileWatcher(context, 'ant-' + includeAnt[i], includeAnt[i], enabled);
        }
    }
}


function registerFileWatcher(context: ExtensionContext, taskType: string, fileBlob: string, enabled?: boolean) 
{
    let watcher: FileSystemWatcher = watchers.get(taskType);

    if (enabled !== false) {
        if (!watcher) {
            watcher = workspace.createFileSystemWatcher(fileBlob);
            watchers.set(taskType, watcher);
            context.subscriptions.push(watcher);
        }
        watcher.onDidChange(_e => invalidateScriptCaches());
        watcher.onDidDelete(_e => invalidateScriptCaches());
        watcher.onDidCreate(_e => invalidateScriptCaches());
    } 
    else if (watchers.get(taskType)) {
        watcher.onDidChange(_e => undefined);
        watcher.onDidDelete(_e => undefined);
        watcher.onDidCreate(_e => undefined);
    }
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
