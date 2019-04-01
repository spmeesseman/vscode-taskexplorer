
import {
	Event, EventEmitter, ExtensionContext, Task, TaskDefinition, TaskExecution,
	TextDocument, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri,
	WorkspaceFolder, commands, window, workspace, tasks, Selection, TaskGroup
} from 'vscode';
import { TaskFile } from './taskFile';
//import { TaskItem } from './taskItem';

export class TaskFolder extends TreeItem 
{
	public taskFiles: TaskFile[] = [];
	//public tasks: TaskItem[] = [];
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
