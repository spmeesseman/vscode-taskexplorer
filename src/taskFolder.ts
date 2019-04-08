
import {
	ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder
} from 'vscode';
import { TaskFile } from './taskFile';
import { timingSafeEqual } from 'crypto';

export class TaskFolder extends TreeItem 
{
	public taskFiles: TaskFile[] = [];
	public taskFolders: TaskFolder[] = [];

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

	addTaskFolder(taskFolder: TaskFolder) {
		this.taskFolders.push(taskFolder);
	}

	removeTaskFile(taskFile: TaskFile) 
	{
		let idx: number = -1;
		let idx2: number = -1;

		this.taskFiles.forEach(each => {
			idx++;console.log('4');
			if (taskFile === each) {
				idx2 = idx;console.log('5');
			}
		});

		if (idx2 !== -1 && idx2 < this.taskFiles.length) {
			console.log('removing task file ' + taskFile.label);
			console.log('arrlen1 ' + this.taskFiles.length);
			this.taskFiles.splice(idx2, 1);
			console.log('arrlen2 ' + this.taskFiles.length);
		}
	}
}
