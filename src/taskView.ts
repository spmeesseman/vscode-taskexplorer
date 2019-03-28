/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as util from './util';

import {
	Event, EventEmitter, ExtensionContext, Task, TaskDefinition, TaskExecution,
	TextDocument, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri,
	WorkspaceFolder, commands, window, workspace, tasks, Selection, TaskGroup
} from 'vscode';
import { visit, JSONVisitor } from 'jsonc-parser';
import {
	getUriFromTask, getFileNameFromSource, getScripts, isWorkspaceFolder, isExcluded
} from './tasks';
import * as nls from 'vscode-nls';

const localize = nls.loadMessageBundle();

type ExplorerCommands = 'open' | 'run';


class Folder extends TreeItem 
{
	public taskFiles: TaskFile[] = [];
	public tasks: TaskItem[] = [];
	public workspaceFolder: WorkspaceFolder;

	constructor(folder: WorkspaceFolder) {
		super(folder.name, TreeItemCollapsibleState.Expanded);
		this.contextValue = 'folder';
		this.resourceUri = folder.uri;
		this.workspaceFolder = folder;
		this.iconPath = ThemeIcon.Folder;
	}

	addTaskFile(taskFile: TaskFile) {
		this.taskFiles.push(taskFile);
	}
}


class TaskFile extends TreeItem 
{
	public path: string;
	public folder: Folder;
	public scripts: TaskItem[] = [];
	public fileName: string;
	public readonly taskSource: string;

	static getLabel(_source: string, relativePath: string): string 
	{
		let label = 'npm';

		if (_source.indexOf('ant') !== -1) {
			label = 'ant';
		}
		else if (_source.indexOf('Workspace') !== -1) {
			label = 'vscode';
		}
		else if (_source.indexOf('tsc') !== -1) {
			label = 'tsc';
		}
		else if (_source.indexOf('grunt') !== -1) {
			label = 'grunt';
		}
		else if (_source.indexOf('gulp') !== -1) {
			label = 'gulp';
		}

		if (relativePath.length > 0 && relativePath !== '.vscode') {
			return label + ' (' + relativePath.substring(0, relativePath.length - 1) + ')';
		}
		return label;
	}

	constructor(context: ExtensionContext, folder: Folder, source: string, relativePath: string) 
	{
		super(TaskFile.getLabel(source, relativePath), TreeItemCollapsibleState.Collapsed);
		this.folder = folder;
		this.path = relativePath;
		this.taskSource = source;
		this.contextValue = 'taskFile';
		
		if (relativePath) {
			this.resourceUri = Uri.file(path.join(folder!.resourceUri!.fsPath, relativePath, getFileNameFromSource(source, true)));
		} else {
			this.resourceUri = Uri.file(path.join(folder!.resourceUri!.fsPath, getFileNameFromSource(source, true)));
		}

		//this.iconPath = ThemeIcon.File;
		this.iconPath = {
			light: context.asAbsolutePath(path.join('res', 'sources', this.taskSource + '.svg')),
			dark: context.asAbsolutePath(path.join('res', 'sources', this.taskSource + '.svg'))
		};
	}

	addScript(script: TaskItem) {
		this.scripts.push(script);
	}
}


class TaskItem extends TreeItem 
{
	public static readonly defaultSource = "Workspace";

    public readonly task: Task | undefined;
    public readonly taskSource: string;
	public readonly execution: TaskExecution | undefined;

	package: TaskFile;
	
	constructor(context: ExtensionContext, taskFile: TaskFile, task: Task) 
	{
		let taskName = task.name;
		if (taskName.indexOf(' - ') !== -1 && taskName.indexOf('/') !== -1) {
			taskName = task.name.substring(0, task.name.indexOf(' - '));
		}

		super(taskName, TreeItemCollapsibleState.None);

		const command: ExplorerCommands = 'open';

		//{ 
		//	command: 'taskView.executeTask', 
		//	title: "Execute", arguments: [tasks[i]] 
	    //}

		const commandList = {
			'open': {
				title: 'Edit Script',
				command: 'taskView.openScript',
				arguments: [this]
			},
			'run': {
				title: 'Run Script',
				command: 'taskView.runScript',
				arguments: [this]
			}
		};

		this.contextValue = 'script';
		if (task.group && task.group === TaskGroup.Rebuild) {
			this.contextValue = 'debugScript';
		}

		this.package = taskFile;
		this.task = task;
		this.command = commandList[command];
		this.taskSource = task.source;
        this.execution = tasks.taskExecutions.find(e => e.task.name === task.name && e.task.source === task.source);
			
		this.contextValue = this.execution ? "runningScript" : "script";

		if (this.execution) {
			this.iconPath = {
				light: context.asAbsolutePath(path.join('res', 'light', 'sync.svg')),
				dark: context.asAbsolutePath(path.join('res', 'dark', 'sync.svg'))
			};
		} else {
			this.iconPath = {
				light: context.asAbsolutePath(path.join('res', 'light', 'script.svg')),
				dark: context.asAbsolutePath(path.join('res', 'dark', 'script.svg'))
			};
		}

		this.tooltip = task.name;
		if (task.source === 'npm')
		{
			let uri = getUriFromTask(task);
			getScripts(uri!).then(scripts => {
				if (scripts && scripts[task.definition['script']]) {
					this.tooltip = scripts[task.definition['script']];
				}
			});
		}
	}

	getFolder(): WorkspaceFolder {
		return this.package.folder.workspaceFolder;
	}
}


class NoScripts extends TreeItem 
{
	constructor() {
		super(localize('noScripts', 'No scripts found'), TreeItemCollapsibleState.None);
		this.contextValue = 'noscripts';
	}
}


export class TaskTreeDataProvider implements TreeDataProvider<TreeItem>
 {
	private taskTree: Folder[] | TaskFile[] | NoScripts[] | null = null;
	private extensionContext: ExtensionContext;
	private _onDidChangeTreeData: EventEmitter<TreeItem | null> = new EventEmitter<TreeItem | null>();
	readonly onDidChangeTreeData: Event<TreeItem | null> = this._onDidChangeTreeData.event;

	constructor(context: ExtensionContext) 
	{
		const subscriptions = context.subscriptions;
		this.extensionContext = context;
		subscriptions.push(commands.registerCommand('taskView.runScript', this.runScript, this));
		subscriptions.push(commands.registerCommand('taskView.stopScript', (taskTreeItem: TaskItem) => 
		{
            if (taskTreeItem.execution) {
                taskTreeItem.execution.terminate();
            }
        }, this));
		subscriptions.push(commands.registerCommand('taskView.openScript', this.openScript, this));
		subscriptions.push(commands.registerCommand('taskView.refresh', this.refresh, this));
	}


	private scriptIsValid(scripts: any, task: Task): boolean 
	{
		util.log('');
		util.log('Checking script validity');
		util.log('   task name = ' + task.name);

		for (const script in scripts) 
		{
			let label = this.getTaskName(script, task.definition.path);
			util.log('   label = ' + label);
			if (task.name === label) 
			{
				util.log('   found!');
				return true;
			}
			if (task.name.indexOf(' - ') !== -1 && label === task.name.substring(0, task.name.indexOf(' - '))) 
			{
				util.log('   found!');
				return true;
			}
		}

		util.log('   not found!');
		
		return false;
	}


	private async runScript(script: TaskItem) 
	{
		let task = script.task;
		let pkg = script.package;
		let uri = getUriFromTask(task);
		let scripts = await getScripts(uri!);

		if (!this.scriptIsValid(scripts, task)) {
			this.scriptNotValid(task);
			return;
		}

		//vscode.tasks.onDidStartTask(() => (fileUri?: vscode.Uri): void => {
			//script.contextValue = 'runningScript';
		//});

		//vscode.tasks.onDidEndTask(() => (fileUri?: vscode.Uri): void => {
		//	script.contextValue = 'script';
		//});
	
		tasks.executeTask(script.task);
	}


	private scriptNotValid(task: Task) {
		let message = localize('scriptInvalid', 'Task View - Could not find the script "{0}". Try to refresh the view.', task.name);
		window.showErrorMessage(message);
	}


	private findScriptPosition(document: TextDocument, script?: TaskItem): number 
	{
		let me = this;
		let scriptOffset = 0;
		let inScripts = false;
		let inTasks = false;
		let inTaskLabel = undefined;

		util.log('findScriptPosition');

		if (script.taskSource === 'ant')
		{
			util.log('   Ant XML');
			util.logValue('   task name', script.task.name);
			util.logValue('   document text', document.getText());

			scriptOffset = document.getText().indexOf("name=\"" + script.task.name);
			if (scriptOffset === -1) {
				scriptOffset = document.getText().indexOf("name='" + script.task.name);
			}
			if (scriptOffset === -1) {
				scriptOffset = 0;
			}
			else {
				scriptOffset += 6;
			}

			//util.logValue('   Offset', scriptOffset);
			return scriptOffset;
		}

		let visitor: JSONVisitor = {
			onError() {
				return scriptOffset;
			},
			onObjectEnd() {
				if (inScripts) {
					inScripts = false;
				}
			},
			onLiteralValue(value: any, offset: number, _length: number) {
				if (inTaskLabel) {
					if (typeof value === 'string') {
						if (inTaskLabel === 'label')
						{
							if (script.task.name === value) {
								scriptOffset = offset;
							}
						}
					}
					inTaskLabel = undefined;
				}
			},
			onObjectProperty(property: string, offset: number, _length: number) {
				if (property === 'scripts') {
					inScripts = true;
					if (!script) { // select the script section
						scriptOffset = offset;
					}
				}
				else if (inScripts && script) {
					let label = me.getTaskName(property, script.task.definition.path, true);
					if (script.task.name === label) {
						scriptOffset = offset;
					}
				}
				else if (property === 'tasks') {
					inTasks = true;
					if (!inTaskLabel) { // select the script section
						scriptOffset = offset;
					}
				}
				else if (property === 'label' && inTasks && !inTaskLabel) {
					inTaskLabel = 'label';
					if (!inTaskLabel) { // select the script section
						scriptOffset = offset;
					}
				}
				else { // nested object which is invalid, ignore the script
					inTaskLabel = undefined;
				}
			}
		};

		visit(document.getText(), visitor);

		util.logValue('   Offset', scriptOffset);
		return scriptOffset;

	}


	private async openScript(selection: TaskFile | TaskItem) 
	{
		let uri: Uri | undefined = undefined;
		if (selection instanceof TaskFile) {
			uri = selection.resourceUri!;
		} else if (selection instanceof TaskItem) {
			uri = selection.package.resourceUri;
		}
		if (!uri) {
			return;
		}

		util.log('Open script at position');
		util.logValue('   command', selection.command);
		util.logValue('   source', selection.taskSource);
		util.logValue('   path', uri.fsPath);
		util.logValue('   file path', uri.fsPath);

		let document: TextDocument = await workspace.openTextDocument(uri);
		let offset = this.findScriptPosition(document, selection instanceof TaskItem ? selection : undefined);
		let position = document.positionAt(offset);
		await window.showTextDocument(document, { selection: new Selection(position, position) });
	}


	public refresh() 
	{
		this.taskTree = null;
		this._onDidChangeTreeData.fire();
	}


	getTreeItem(element: TreeItem): TreeItem 
	{
		return element;
	}


	getParent(element: TreeItem): TreeItem | null 
	{
		if (element instanceof Folder) {
			return null;
		}
		if (element instanceof TaskFile) {
			return element.folder;
		}
		if (element instanceof TaskItem) {
			return element.package;
		}
		if (element instanceof NoScripts) {
			return null;
		}
		return null;
	}


	async getChildren(element?: TreeItem): Promise<TreeItem[]> 
	{
		if (!this.taskTree) {
			//let taskItems = await tasks.fetchTasks({ type: 'npm' });
			let taskItems = await tasks.fetchTasks();
			if (taskItems) {
				this.taskTree = this.buildTaskTree(taskItems);
				if (this.taskTree.length === 0) {
					this.taskTree = [new NoScripts()];
				}
			}
		}
		if (element instanceof Folder) {
			return element.taskFiles;
		}
		if (element instanceof TaskFile) {
			return element.scripts;
		}
		if (element instanceof TaskItem) {
			return [];
		}
		if (element instanceof NoScripts) {
			return [];
		}
		if (!element) {
			if (this.taskTree) {
				return this.taskTree;
			}
		}
		return [];
	}


	private isInstallTask(task: Task): boolean 
	{
		let fullName = this.getTaskName('install', task.definition.path);
		return fullName === task.name;
	}


	private getTaskName(script: string, relativePath: string | undefined, forcePathInName?: boolean) 
	{
		if (relativePath && relativePath.length && forcePathInName === true) {
			return `${script} - ${relativePath.substring(0, relativePath.length - 1)}`;
		}
		return script;
	}


	private buildTaskTree(tasks: Task[]): Folder[] | TaskFile[] | NoScripts[] 
	{
		var taskCt = 0;
		let folders: Map<String, Folder> = new Map();
		let files: Map<String, TaskFile> = new Map();

		let folder = null;
		let taskFile = null;

		tasks.forEach(each => 
		{
			if (isWorkspaceFolder(each.scope) && !this.isInstallTask(each)) 
			{
				taskCt++;

				folder = folders.get(each.scope.name);
				if (!folder) {
					folder = new Folder(each.scope);
					folders.set(each.scope.name, folder);
				}
				let definition: TaskDefinition = <TaskDefinition>each.definition;
				
				util.log('');
				util.log('Processing task ' + taskCt.toString() + ' of ' + tasks.length.toString());
				util.logValue('   name', each.name);	
				util.logValue('   type', definition.type);	
				if (definition.script) {
					util.logValue('   script', definition.script);	
				}
				util.logValue('   source', each.source);
				util.logValue('   scope.name', each.scope.name);
				util.logValue('   scope.uri.path', each.scope.uri.path);
				util.logValue('   scope.uri.fsPath', each.scope.uri.fsPath);

				let relativePath = definition.path ? definition.path : '';
				let id = each.source + ':' + path.join(each.scope.name, relativePath);

				if (!isExcluded(each.scope, each.scope.uri))
				{
					taskFile = files.get(id);
					if (!taskFile) 
					{
						taskFile = new TaskFile(this.extensionContext, folder, each.source, relativePath);
						folder.addTaskFile(taskFile);
						files.set(id, taskFile);
						util.logValue('   Added source file container', each.source);
					}
					let taskItem = new TaskItem(this.extensionContext, taskFile, each);
					taskFile.addScript(taskItem);
				}
			}
		});

		//if (folders.size === 1) {
		//	return [...packages.values()];
		//}
		return [...folders.values()];
	}
}