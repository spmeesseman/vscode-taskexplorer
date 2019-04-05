
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from 'vscode';
import * as path from 'path';
import * as util from './util';
type StringMap = { [s: string]: string; };

let cachedTasks: Task[] = undefined;


interface BatchTaskDefinition extends TaskDefinition 
{
	script: string;
	path?: string;
	fileName?: string;
	scriptFile: boolean;
}

export class BatchTaskProvider implements TaskProvider 
{
	constructor() {
	}

	public provideTasks() {
		return provideBatchFiles();
	}

	public resolveTask(_task: Task): Task | undefined {
		return undefined;
	}
}


export function invalidateTasksCacheBatch() 
{
	cachedTasks = undefined;
}


async function detectBatchFiles(): Promise<Task[]> 
{

	let emptyTasks: Task[] = [];
	let allTasks: Task[] = [];
	let visitedFiles: Set<string> = new Set();

	let folders = workspace.workspaceFolders;
	if (!folders) {
		return emptyTasks;
	}
	try {
		for (const folder of folders) 
		{
			let relativePattern = new RelativePattern(folder, '{**/*.bat,**/*.BAT}');
			let paths = await workspace.findFiles(relativePattern, '**/node_modules/**');
			for (const fpath of paths) 
			{
				if (!util.isExcluded(fpath.path) && !visitedFiles.has(fpath.fsPath)) {
					visitedFiles.add(fpath.fsPath);
					allTasks.push(createBatchTask('run', '', folder!, fpath));
				}
			}
		}
		return allTasks;
	} catch (error) {
		return Promise.reject(error);
	}
}


export async function provideBatchFiles(): Promise<Task[]> 
{
	if (!cachedTasks) {
		cachedTasks = await detectBatchFiles();
	}
	return cachedTasks;
}


function createBatchTask(target: string, cmd: string, folder: WorkspaceFolder, packageJsonUri: Uri): Task 
{
	function getRelativePath(folder: WorkspaceFolder, packageJsonUri: Uri): string 
	{
		let rootUri = folder.uri;
		let absolutePath = packageJsonUri.path.substring(0, packageJsonUri.path.lastIndexOf('/') + 1);
		return absolutePath.substring(rootUri.path.length + 1);
	}
	
	let cwd = path.dirname(packageJsonUri.fsPath);
	let fileName = path.basename(packageJsonUri.fsPath);

	let kind: BatchTaskDefinition = {
		type: 'batch',
		script: target,
		fileName: fileName,
		scriptFile: true, // set scriptFile to true to include all scripts in folder instead of grouped at file
		path: ''
	};

	let relativePath = getRelativePath(folder, packageJsonUri);
	if (relativePath.length) {
		kind.path = relativePath;
	}
	
	//
	// TODO - prompt for args
	//
	
	let args = [ '/c', fileName ];
	let options = {
		"cwd": cwd
	};

	let execution = new ShellExecution('cmd', args, options);
	
	return new Task(kind, folder, fileName, 'batch', execution, undefined);
}
