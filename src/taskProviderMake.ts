
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from 'vscode';
import * as path from 'path';
import * as util from './util';
import { TaskItem } from './taskItem';
type StringMap = { [s: string]: string; };

let cachedTasks: Task[] = undefined;


interface MakeTaskDefinition extends TaskDefinition 
{
	script?: string;
	path?: string;
	fileName?: string;
	uri?: Uri;
	treeItem?: TaskItem;
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


export async function invalidateTasksCacheMake(opt?: Uri) : Promise<void> 
{
	util.log('');
	util.log('invalidateTasksCacheMake');

	if (opt && cachedTasks) 
	{
		let rmvTasks: Task[] = [];
		let uri: Uri = opt as Uri;

		cachedTasks.forEach(each => {
			let cstDef: MakeTaskDefinition = each.definition;
			if (cstDef.uri.fsPath === opt.fsPath) {
				rmvTasks.push(each);
			}
		});
		
		rmvTasks.forEach(each => {
			util.log('   removing old task ' + each.name);
			util.removeFromArray(cachedTasks, each);
		});

		if (util.pathExists(opt.fsPath))
		{
			let tasks = await readMakefile(opt);
			cachedTasks.push(...tasks);
		}

		if (cachedTasks.length > 0) {
			return;
		}
	}

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
			let paths = await workspace.findFiles(relativePattern, util.getExcludesGlob(folder));
			for (const fpath of paths) 
			{
				if (!util.isExcluded(fpath.path) && !visitedFiles.has(fpath.fsPath)) {
					let tasks = await readMakefile(fpath);
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


async function provideMakefiles(): Promise<Task[]> 
{
	if (!cachedTasks) {
		cachedTasks = await detectMakefiles();
	}
	return cachedTasks;
}


async function readMakefile(uri: Uri): Promise<Task[]> 
{
	let emptyTasks: Task[] = [];

	let folder = workspace.getWorkspaceFolder(uri);
	if (!folder) {
		return emptyTasks;
    }
    
    let scripts = await findTargets(uri.fsPath);
	if (!scripts) {
		return emptyTasks;
	}

	const result: Task[] = [];

	Object.keys(scripts).forEach(each => {
		const task = createMakeTask(each, `${each}`, folder!, uri);
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


function createMakeTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task 
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

	function getRelativePath(folder: WorkspaceFolder, uri: Uri): string 
	{
		if (folder) {
			let rootUri = folder.uri;
			let absolutePath = uri.path.substring(0, uri.path.lastIndexOf('/') + 1);
			return absolutePath.substring(rootUri.path.length + 1);
		}
		return '';
	}
	
	let kind: MakeTaskDefinition = {
		type: 'make',
		script: target,
		path: '',
		fileName: path.basename(uri.path),
		uri: uri
	};

	let relativePath = getRelativePath(folder, uri);
	if (relativePath.length) {
		kind.path = relativePath;
	}
	let cwd = path.dirname(uri.fsPath);

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
