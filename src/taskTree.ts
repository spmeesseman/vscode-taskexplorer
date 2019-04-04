/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as util from './util';

import {
	Event, EventEmitter, ExtensionContext, Task, TaskDefinition,
	TextDocument, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri,
	commands, window, workspace, tasks, Selection, WorkspaceFolder
} from 'vscode';
import { visit, JSONVisitor } from 'jsonc-parser';
import * as nls from 'vscode-nls';
import { TaskFolder } from './taskFolder';
import { TaskFile } from './taskFile';
import { TaskItem } from './taskItem';
import { configuration } from "./common/configuration";


const localize = nls.loadMessageBundle();


class NoScripts extends TreeItem 
{
	constructor() {
		super(localize('noScripts', 'No scripts found'), TreeItemCollapsibleState.None);
		this.contextValue = 'noscripts';
	}
}


export class TaskTreeDataProvider implements TreeDataProvider<TreeItem>
{
	private taskTree: TaskFolder[] | TaskFile[] | NoScripts[] | null = null;
	private extensionContext: ExtensionContext;
	private _onDidChangeTreeData: EventEmitter<TreeItem | null> = new EventEmitter<TreeItem | null>();
	readonly onDidChangeTreeData: Event<TreeItem | null> = this._onDidChangeTreeData.event;

	constructor(name: string, context: ExtensionContext) 
	{
		const subscriptions = context.subscriptions;
		this.extensionContext = context;
		subscriptions.push(commands.registerCommand(name + '.run', this.run, this));
		subscriptions.push(commands.registerCommand(name + '.stop', (taskTreeItem: TaskItem) => 
		{
            if (taskTreeItem.execution) {
				taskTreeItem.execution.terminate();
            }
        }, this));
		subscriptions.push(commands.registerCommand(name + '.open', this.open, this));
		subscriptions.push(commands.registerCommand(name + '.refresh', this.refresh, this));

		tasks.onDidStartTask(() => this.refresh());
		tasks.onDidEndTask(() => this.refresh());
	}


	private async run(taskItem: TaskItem) 
	{
		//
		// Execute task
		//
		tasks.executeTask(taskItem.task);
	}


	private findScriptPosition(document: TextDocument, script?: TaskItem): number 
	{
		let me = this;
		let scriptOffset = 0;
		let inScripts = false;
		let inTasks = false;
		let inTaskLabel = undefined;

		util.log('findScriptPosition');
		util.logValue('   task source', script.taskSource);
		util.logValue('   task name', script.task.name);

		if (script.taskSource === 'tsc')
		{
			scriptOffset = 0;
		}
		else if (script.taskSource === 'ant')
		{
			//
			// TODO
			// This is crap - need regex search
			//
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
		}
		else if (script.taskSource === 'gulp')
		{
			//
			// TODO
			// This is crap - need regex search
			//
			scriptOffset = document.getText().indexOf("gulp.task('" + script.task.name);
			if (scriptOffset === -1) {
				scriptOffset = document.getText().indexOf("gulp.task(\"" + script.task.name);
			}
			if (scriptOffset === -1) {
				scriptOffset = 0;
			}
		}
		else if (script.taskSource === 'grunt')
		{
			//
			// TODO
			// This is crap - need regex search
			//
			scriptOffset = document.getText().indexOf("grunt.registerTask('" + script.task.name);
			if (scriptOffset === -1) {
				scriptOffset = document.getText().indexOf("grunt.registerTask(\"" + script.task.name);
			}
			if (scriptOffset === -1) {
				scriptOffset = 0;
			}
		}
		else // npm, tasks.json
		{
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
		}

		util.logValue('   Offset', scriptOffset);
		return scriptOffset;
	}


	private async open(selection: TaskFile | TaskItem) 
	{
		let uri: Uri | undefined = undefined;
		if (selection instanceof TaskFile) {
			uri = selection.resourceUri!;
		} else if (selection instanceof TaskItem) {
			uri = selection.taskFile.resourceUri;
		}
		if (!uri) {
			return;
		}

		util.log('Open script at position');
		util.logValue('   command', selection.command.command);
		util.logValue('   source', selection.taskSource);
		util.logValue('   path', uri.path);
		util.logValue('   file path', uri.fsPath);

		if (util.pathExists(uri.fsPath)) {
			let document: TextDocument = await workspace.openTextDocument(uri);
			let offset = this.findScriptPosition(document, selection instanceof TaskItem ? selection : undefined);
			let position = document.positionAt(offset);
			await window.showTextDocument(document, { selection: new Selection(position, position) });
		}
		else {
			util.log('Invalid path for file, cannot open');
		}
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
		if (element instanceof TaskFolder) {
			return null;
		}
		if (element instanceof TaskFile) {
			return element.folder;
		}
		if (element instanceof TaskItem) {
			return element.taskFile;
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
		if (element instanceof TaskFolder) {
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


	private isWorkspaceFolder(value: any): value is WorkspaceFolder 
	{
		return value && typeof value !== 'number';
	}


	private buildTaskTree(tasks: Task[]): TaskFolder[] | TaskFile[] | NoScripts[] 
	{
		var taskCt = 0;
		let folders: Map<String, TaskFolder> = new Map();
		let files: Map<String, TaskFile> = new Map();

		let folder = null;
		let taskFile = null;

		tasks.forEach(each => 
		{
			taskCt++;
			util.log('');
			util.log('Processing task ' + taskCt.toString() + ' of ' + tasks.length.toString());
			util.logValue('   name', each.name);	
			util.logValue('   source', each.source);

			let settingName: string = 'enable' + util.properCase(each.source);
			if (configuration.get(settingName) && this.isWorkspaceFolder(each.scope) && !this.isInstallTask(each)) 
			{
				folder = folders.get(each.scope.name);
				if (!folder) {
					folder = new TaskFolder(each.scope);
					folders.set(each.scope.name, folder);
				}
				let definition: TaskDefinition = <TaskDefinition>each.definition;
				let relativePath = definition.path ? definition.path : '';

				//
				// TSC tasks are returned with no path value, the relative path is in the task name:
				//
				//     watch - tsconfig.json
				//     watch - .vscode-test\vscode-1.32.3\resources\app\tsconfig.schema.json
				//
				if (each.source === 'tsc')
				{
					if (each.name.indexOf(' - ') !== -1 && each.name.indexOf(' - tsconfig.json') === -1)
					{
						relativePath = path.dirname(each.name.substring(each.name.indexOf(' - ') + 3));
					}
				}

				let id = each.source + ':' + path.join(each.scope.name, relativePath);
				if (definition.fileName) {
					id = path.join(id, definition.fileName);
				}

				util.logValue('   scope.name', each.scope.name);
				util.logValue('   scope.uri.path', each.scope.uri.path);
				util.logValue('   scope.uri.fsPath', each.scope.uri.fsPath);
				util.logValue('   relative Path', relativePath);
				util.logValue('   type', definition.type);	
				if (definition.script) {
					util.logValue('   script', definition.script);	// if 'script' is defined, this is type npm
				}
				if (definition.path) {
					util.logValue('   path', definition.path);	
				}
				//
				// Internal task providers will set a fileName property
				//
				if (definition.fileName) {
					util.logValue('   file name', definition.fileName);	
				}	

				let excluded: boolean = false;
				if (relativePath) {
					excluded = util.isExcluded(path.join(each.scope.uri.path, relativePath));
				}
				else {
					excluded = util.isExcluded(each.scope.uri.path);
				}

				if (!excluded)
				{
					taskFile = files.get(id);
					//
					// Create taskfile node if needed
					//
					if (!taskFile) 
					{
						taskFile = new TaskFile(this.extensionContext, folder, definition, each.source, relativePath);
						folder.addTaskFile(taskFile);
						files.set(id, taskFile);
						util.logValue('   Added source file container', each.source);
					}
					//
					// Create and add task item to task file node
					//
					let taskItem = new TaskItem(this.extensionContext, taskFile, each);
					taskFile.addScript(taskItem);
				}
			}
			else {
				util.log('   Skipping');
				util.logValue('   enabled', configuration.get(settingName));
				util.logValue('   is install task', this.isInstallTask(each));
			}
		});

		//if (folders.size === 1) {
		//	return [...packages.values()];
		//}
		return [...folders.values()];
	}
}