
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from 'vscode';
import * as path from 'path';
import * as util from './util';
type StringMap = { [s: string]: string; };

let cachedTasks: Task[] = undefined;


interface GruntTaskDefinition extends TaskDefinition 
{
	script: string;
	path?: string;
}

export class GruntTaskProvider implements TaskProvider 
{
	constructor() {
	}

	public provideTasks() {
		return provideGruntfiles();
	}

	public resolveTask(_task: Task): Task | undefined {
		return undefined;
	}
}


export function invalidateTasksCacheGrunt() 
{
	cachedTasks = undefined;
}


async function detectGruntfiles(): Promise<Task[]> 
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
			//
			// Note - pattern will ignore gruntfiles in root project dir, which would be picked
			// up by VSCoces internal Grunt task provider
			//
			let relativePattern = new RelativePattern(folder, '**/*/gruntfile.js');
			let paths = await workspace.findFiles(relativePattern, util.getExcludesGlob(folder));
			for (const fpath of paths) 
			{
				if (!util.isExcluded(fpath.path) && !visitedFiles.has(fpath.fsPath)) {
					let tasks = await readGruntfiles(fpath);
					visitedFiles.add(fpath.fsPath);
					allTasks.push(...tasks);
				}
			}
		}
		return allTasks;
	} catch (error) {
		return Promise.reject(error);
	}
}


export async function provideGruntfiles(): Promise<Task[]> 
{
	if (!cachedTasks) {
		cachedTasks = await detectGruntfiles();
	}
	return cachedTasks;
}


async function readGruntfiles(packageJsonUri: Uri): Promise<Task[]> 
{
	let emptyTasks: Task[] = [];

	let folder = workspace.getWorkspaceFolder(packageJsonUri);
	if (!folder) {
		return emptyTasks;
    }
    
    let scripts = await findTargets(packageJsonUri.fsPath);
	if (!scripts) {
		return emptyTasks;
	}

	const result: Task[] = [];

	Object.keys(scripts).forEach(each => {
		const task = createGruntTask(each, `${each}`, folder!, packageJsonUri);
		if (task) {
			task.group = TaskGroup.Build;
			result.push(task);
		}
	});

	return result;
}


async function findTargets(fsPath: string): Promise<StringMap> 
{
	let json: any = '';
	let scripts: StringMap = {};

	util.log('');
	util.log('Find gruntfile targets');

	let contents = await util.readFile(fsPath);
	let idx = 0;
	let eol = contents.indexOf('\n', 0);

	while (eol !== -1)
	{
		let line: string = contents.substring(idx, eol).trim();
		if (line.length > 0 && line.toLowerCase().trimLeft().startsWith('grunt.registertask')) 
		{
			let idx1 = line.indexOf('\'');
			if (idx1 === -1) {
				idx1 = line.indexOf('"');
			}

			if (idx1 === -1) // check next line for task name
			{
				let eol2 = eol + 1;
				eol2 = contents.indexOf('\n', eol2);
				line = contents.substring(eol + 1, eol2).trim();
				if (line.startsWith('\'') || line.startsWith('"'))
				{
					idx1 = line.indexOf('\'');
					if (idx1 === -1) {
						idx1 = line.indexOf('"');
					}
					if (idx1 !== -1) {
						eol = eol2;
					}
				}
			}

			if (idx1 !== -1)
			{
				idx1++;
				let idx2 = line.indexOf('\'', idx1);
				if (idx2 === -1) {
					idx2 = line.indexOf('"', idx1);
				}
				if (idx2 !== -1) 
				{
					let tgtName = line.substring(idx1, idx2).trim();

					if (tgtName) {
						scripts[tgtName] = '';
						util.log('   found target');
						util.logValue('      name', tgtName);
					}
				}
			}
		}

		idx = eol + 1;
		eol = contents.indexOf('\n', idx);
	}

	util.log('   done');

	return scripts;
}


function createGruntTask(target: string, cmd: string, folder: WorkspaceFolder, packageJsonUri: Uri): Task 
{
	function getCommand(folder: WorkspaceFolder, relativePath: string, cmd: string): string 
	{
		//let grunt = 'folder.uri.fsPath + "/node_modules/.bin/grunt";
		let grunt = 'grunt';

		//if (process.platform === 'win32') {
		//	grunt = folder.uri.fsPath + "\\node_modules\\.bin\\grunt.cmd";
		//}

		if (workspace.getConfiguration('taskExplorer').get('pathToGrunt')) {
			grunt = workspace.getConfiguration('taskExplorer').get('pathToGrunt');
		}

		return grunt; 
	}

	function getRelativePath(folder: WorkspaceFolder, packageJsonUri: Uri): string 
	{
		let rootUri = folder.uri;
		let absolutePath = packageJsonUri.path.substring(0, packageJsonUri.path.lastIndexOf('/') + 1);
		return absolutePath.substring(rootUri.path.length + 1);
	}
	
	let kind: GruntTaskDefinition = {
		type: 'grunt',
		script: target,
		path: ''
	};

	let relativePath = getRelativePath(folder, packageJsonUri);
	if (relativePath.length) {
		kind.path = relativePath;
	}
	let cwd = path.dirname(packageJsonUri.fsPath);

	let args = [ getCommand(folder, relativePath, cmd), target ];
	let options = {
		"cwd": cwd
	};

	let execution = new ShellExecution('npx', args, options);

	return new Task(kind, folder, target, 'grunt', execution, undefined);
}
