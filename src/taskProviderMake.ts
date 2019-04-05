
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from 'vscode';
import * as path from 'path';
import * as util from './util';
type StringMap = { [s: string]: string; };

let cachedTasks: Task[] = undefined;


interface MakeTaskDefinition extends TaskDefinition 
{
	script: string;
	path?: string;
}

export class MakeTaskProvider implements TaskProvider 
{
	constructor() {
	}

	public provideTasks() {
		return provideMakefiles();
	}

	public resolveTask(_task: Task): Task | undefined {
		return undefined;
	}
}


export function invalidateTasksCacheMake() 
{
	cachedTasks = undefined;
}


async function detectMakefiles(): Promise<Task[]> 
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
			let relativePattern = new RelativePattern(folder, '**/[Mm]akefile');
			let paths = await workspace.findFiles(relativePattern, '**/node_modules/**');
			for (const fpath of paths) 
			{
				if (!util.isExcluded(fpath.path) && !visitedFiles.has(fpath.fsPath)) {
					let tasks = await readMakefiles(fpath);
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


export async function provideMakefiles(): Promise<Task[]> 
{
	if (!cachedTasks) {
		cachedTasks = await detectMakefiles();
	}
	return cachedTasks;
}


async function readMakefiles(packageJsonUri: Uri): Promise<Task[]> 
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

	Object.keys(scripts).forEach(each => { console.log('huh');
		const task = createMakeTask(each, `${each}`, folder!, packageJsonUri);
		task.group = TaskGroup.Build;
		result.push(task);
	});

	return result;
}


async function findTargets(fsPath: string): Promise<StringMap> 
{
	let json: any = '';
	let scripts: StringMap = {};

	util.log('');
	util.log('Find makefile targets');

	let contents = await util.readFile(fsPath);
	let idx = 0;
	let eol = contents.indexOf('\n', 0);

	while (eol !== -1)
	{
		let line: string = contents.substring(idx, eol).trim();
		//
		// Target names always start at position 0 of the line.  
		//
		// TODO = Skip targets that are environment variable names, for now.  Need to
		// parse value if set in makefile and apply here for $() target names.
		//
		if (line.length > 0 && !line.startsWith('\t') && !line.startsWith(' ') &&
		    !line.startsWith('#') && !line.startsWith('$') && line.indexOf(':') > 0) 
		{
			let tgtName = line.substring(0, line.indexOf(':')).trim();
			let dependsName = line.substring(line.indexOf(':') + 1).trim();
			//
			// Don't incude object targets
			//
			if (tgtName.indexOf('/') === -1 && tgtName.indexOf('\\') === -1) {
				scripts[tgtName] = '';
				util.log('   found target');
				util.logValue('      name', tgtName);
				util.logValue('      depends target', dependsName);
			}
		}

		idx = eol + 1;
		eol = contents.indexOf('\n', idx);
	}

	util.log('   done');

	return scripts;
}


function createMakeTask(target: string, cmd: string, folder: WorkspaceFolder, packageJsonUri: Uri): Task 
{
	function getCommand(folder: WorkspaceFolder, cmd: string): string 
	{
		let make = "make";

		if (process.platform === 'win32') {
			make = "nmake";
		}

		if (workspace.getConfiguration('taskExplorer').get('pathToMake')) {
			make = workspace.getConfiguration('taskExplorer').get('pathToMake');
		}

		return make; 
	}

	function getRelativePath(folder: WorkspaceFolder, packageJsonUri: Uri): string 
	{
		let rootUri = folder.uri;
		let absolutePath = packageJsonUri.path.substring(0, packageJsonUri.path.lastIndexOf('/') + 1);
		return absolutePath.substring(rootUri.path.length + 1);
	}
	
	let kind: MakeTaskDefinition = {
		type: 'make',
		script: target,
		path: ''
	};

	let relativePath = getRelativePath(folder, packageJsonUri);
	if (relativePath.length) {
		kind.path = relativePath;
	}
	let cwd = path.dirname(packageJsonUri.fsPath);

	let args = [ target ];
	let options = {
		"cwd": cwd//,
		//"env": {
		//	"ECLIPSE_HOME": "${env:VSCODE_HOME}"
		//}
	};

	let execution = new ShellExecution(getCommand(folder, cmd), args, options);
	
	let pm = {
		"owner": "cpp",
		"fileLocation": ["absolute"],
		"pattern": {
			"regexp": "^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$",
			"file": 1,
			"line": 2,
			"column": 3,
			"severity": 4,
			"message": 5
		}
	};

	return new Task(kind, folder, target, 'make', execution, 'cpp');
}
