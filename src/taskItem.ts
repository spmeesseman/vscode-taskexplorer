

import {
	ExtensionContext, Task, TaskExecution, TreeItem, TreeItemCollapsibleState,
	WorkspaceFolder, tasks, TaskGroup
} from 'vscode';
import { getUriFromTask, getScripts } from './tasks';
import { TaskFile } from './taskFile';
import * as path from 'path';


type ExplorerCommands = 'open' | 'run';


export class TaskItem extends TreeItem 
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
		//	command: 'taskExplorer.executeTask', 
		//	title: "Execute", arguments: [tasks[i]] 
	    //}

		const commandList = {
			'open': {
				title: 'Edit Script',
				command: 'taskExplorer.open',
				arguments: [this]
			},
			'run': {
				title: 'Run Script',
				command: 'taskExplorer.run',
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
				light: context.asAbsolutePath(path.join('res', 'light', 'loading.svg')),
				dark: context.asAbsolutePath(path.join('res', 'dark', 'loading.svg'))
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
