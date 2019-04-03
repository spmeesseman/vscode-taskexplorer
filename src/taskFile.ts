
import {
	ExtensionContext, TreeItem, TreeItemCollapsibleState, Uri, TaskDefinition
} from 'vscode';
import { TaskFolder } from './taskFolder';
import { TaskItem } from './taskItem';
import * as path from 'path';
import { utils } from 'mocha';
import* as util from './util';

export class TaskFile extends TreeItem 
{
	public path: string;
	public folder: TaskFolder;
	public scripts: TaskItem[] = [];
	public fileName: string;
	public readonly taskSource: string;

	static getLabel(taskDef: TaskDefinition, source: string, relativePath: string): string 
	{
		let label = source;

		if (source === 'Workspace') {
			label = 'vscode';
		}

		if (source === 'ant') {
			if (taskDef.fileName && taskDef.fileName !== 'build.xml' && taskDef.fileName !== 'Build.xml') {
				if (relativePath.length > 0 && relativePath !== '.vscode') {
					return label + ' (' + relativePath.substring(0, relativePath.length - 1) + '/' + taskDef.fileName + ')';
				}
				return label + ' (' + taskDef.fileName + ')';
			}
		}

		if (relativePath.length > 0 && relativePath !== '.vscode') {
			return label + ' (' + relativePath.substring(0, relativePath.length - 1) + ')';
		}

		return label;
	}

	static getFileNameFromSource(source: string, folder: TaskFolder, taskDef: TaskDefinition, relativePath: string, incRelPathForCode?: boolean): string | null
	{
		//
		// Ant tasks or any tasks provided by this extension will have a 'fileName' definition
		//
		if (taskDef.fileName) {
			return path.basename(taskDef.fileName);
		}

		//
		// Since tasks are returned from VSCode API without a filename that they were found in,
		// we must deduce the filename from the task source
		//

		let fileName: string = 'package.json';
		let tmpIdx = 0;

		if (source === 'Workspace') {
			if (incRelPathForCode === true) {
				fileName = '.vscode\\tasks.json';
			}
			else {
				fileName = 'tasks.json';
			}
		}
		else if (source === 'tsc') {
			fileName = 'tsconfig.json';
			tmpIdx = 2;
		}
		else if (source === 'grunt') {
			fileName = 'gruntfile.js';
			tmpIdx = 5;
		}
		else if (source === 'gulp') {
			fileName = 'gulpfile.js';
			tmpIdx = 4;
		}

		//
		// Check for casing, technically this isnt needed for windows but still
		// want it covered in local tests
		//
		
		let dirPath: string;
		if (relativePath) {
			dirPath = path.join(folder!.resourceUri!.fsPath, relativePath);
		} else {
			dirPath = folder!.resourceUri!.fsPath;
		}

		let filePath = path.join(dirPath, fileName);
		if (!util.pathExists(filePath)) {
			//
			// try camelcasing
			//
			fileName = util.camelCase(fileName, tmpIdx);
			if (!util.pathExists(filePath)) {
				//
				// upper casing first leter
				//
				fileName = util.properCase(fileName.toLowerCase(), tmpIdx);
				if (!util.pathExists(filePath)) {
					//
					// upper case
					//
					fileName = fileName.toUpperCase();
				}
			}
		}
		
		return fileName;
	}


	constructor(context: ExtensionContext, folder: TaskFolder, taskDef: TaskDefinition, source: string, relativePath: string) 
	{
		super(TaskFile.getLabel(taskDef, source, relativePath), TreeItemCollapsibleState.Collapsed);

		this.folder = folder;
		this.path = relativePath;
		this.taskSource = source;
		this.contextValue = 'taskFile';
		this.fileName = TaskFile.getFileNameFromSource(source, folder, taskDef, relativePath, true);

		if (relativePath) {
			this.resourceUri = Uri.file(path.join(folder!.resourceUri!.fsPath, relativePath, this.fileName));
		} else {
			this.resourceUri = Uri.file(path.join(folder!.resourceUri!.fsPath, this.fileName));
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
