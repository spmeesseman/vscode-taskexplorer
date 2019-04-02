
import {
	ExtensionContext, TreeItem, TreeItemCollapsibleState, Uri
} from 'vscode';
import { TaskFolder } from './taskFolder';
import { TaskItem } from './taskItem';
import * as path from 'path';


export class TaskFile extends TreeItem 
{
	public path: string;
	public folder: TaskFolder;
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

	static getFileNameFromSource(source: string, incRelPathForCode?: boolean): string | null
	{
		let fileName: string = 'package.json';

		if (source === 'ant') {
			fileName = 'build.xml';
		}
		else if (source === 'Workspace') {
			if (incRelPathForCode === true) {
				fileName = '.vscode\\tasks.json';
			}
			else {
				fileName = 'tasks.json';
			}
		}
		else if (source === 'tsc') {
			fileName = 'tsconfig.json';
		}
		else if (source === 'grunt') {
			fileName = 'grunt.json';
		}
		else if (source === 'gulp') {
			fileName = 'gulp.json';
		}

		return fileName;
	}


	constructor(context: ExtensionContext, folder: TaskFolder, source: string, relativePath: string) 
	{
		super(TaskFile.getLabel(source, relativePath), TreeItemCollapsibleState.Collapsed);
		this.folder = folder;
		this.path = relativePath;
		this.taskSource = source;
		this.contextValue = 'taskFile';
		
		if (relativePath) {
			this.resourceUri = Uri.file(path.join(folder!.resourceUri!.fsPath, relativePath, TaskFile.getFileNameFromSource(source, true)));
		} else {
			this.resourceUri = Uri.file(path.join(folder!.resourceUri!.fsPath, TaskFile.getFileNameFromSource(source, true)));
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
