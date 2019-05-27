
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition, ShellExecutionOptions
} from 'vscode';
import * as path from 'path';
import * as util from './util';
import { TaskItem } from './taskItem';
import { configuration } from "./common/configuration";

type StringMap = { [s: string]: string; };

let cachedTasks: Task[] = undefined;


interface AppPublisherTaskDefinition extends TaskDefinition 
{
	script?: string;
	path?: string;
	fileName?: string;
	uri?: Uri;
	treeItem?: TaskItem;
}

export class AppPublisherTaskProvider implements TaskProvider 
{
	constructor() {
	}

	public provideTasks() {
		return provideAppPublisherfiles();
	}

	public resolveTask(_task: Task): Task | undefined {
		return undefined;
	}
}


export async function invalidateTasksCacheAppPublisher(opt?: Uri) : Promise<void> 
{
	util.log('');
	util.log('invalidateTasksCacheAppPublisher');

	if (opt && cachedTasks) 
	{
		let rmvTasks: Task[] = [];
		let folder = workspace.getWorkspaceFolder(opt);

		cachedTasks.forEach(each => {
			let cstDef: AppPublisherTaskDefinition = each.definition as AppPublisherTaskDefinition;
			if (cstDef.uri.fsPath === opt.fsPath || !util.pathExists(cstDef.uri.fsPath)) {
				rmvTasks.push(each);
			}
		});

		rmvTasks.forEach(each => {
			util.log('   removing old task ' + each.name);
			util.removeFromArray(cachedTasks, each);
		});

		if (util.pathExists(opt.fsPath) && !util.existsInArray(configuration.get("exclude"), opt.path))
		{
			let tasks = createAppPublisherTask(folder!, opt);
			if (tasks) {
				cachedTasks.push(...tasks);
				//cachedTasks.push(task2);
			}
			else {
				util.log('   !!! could not create app-publisher task from ' + opt.fsPath);
			}
		}

		if (cachedTasks.length > 0) {
			return;
		}
	}

	cachedTasks = undefined;
}


async function provideAppPublisherfiles(): Promise<Task[]> 
{
	if (!cachedTasks) {
		cachedTasks = await detectAppPublisherfiles();
	}
	return cachedTasks;
}


async function detectAppPublisherfiles(): Promise<Task[]> 
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
			let relativePattern = new RelativePattern(folder, '**/.publishrc*');
			let paths = await workspace.findFiles(relativePattern, util.getExcludesGlob(folder));
			for (const fpath of paths) 
			{
				if (!util.isExcluded(fpath.path) && !visitedFiles.has(fpath.fsPath)) {
					visitedFiles.add(fpath.fsPath);
					allTasks.push(...createAppPublisherTask(folder!, fpath));
				}
			}
		}
		return allTasks;
	} catch (error) {
		return Promise.reject(error);
	}
}


function createAppPublisherTask(folder: WorkspaceFolder, uri: Uri): Task[]
{
	function getRelativePath(folder: WorkspaceFolder, uri: Uri): string
	{
		if (folder) {
			let rootUri = folder.uri;
			let absolutePath = uri.path.substring(0, uri.path.lastIndexOf('/') + 1);
			return absolutePath.substring(rootUri.path.length + 1);
		}
		return '';
	}

	let cwd = path.dirname(uri.fsPath);
	let fileName = path.basename(uri.fsPath);
    let sep: string = (process.platform === 'win32' ? "\\" : "/");

	let kind: AppPublisherTaskDefinition = {
		type: 'app-publisher',
		fileName: fileName,
		path: '',
		cmdLine: 'app-publisher -p ps',
		requiresArgs: false,
		uri: uri
	};

	let kind2: AppPublisherTaskDefinition = {
		type: 'app-publisher',
		fileName: fileName,
		path: '',
		cmdLine: 'app-publisher -p ps --dry-run',
		requiresArgs: false,
		uri: uri
	};

	//
	// Get relative dir to workspace folder
	//
	let relativePath = getRelativePath(folder, uri);
	if (relativePath.length) {
		kind.path = relativePath;
		kind2.path = relativePath;
	}

	//
	// Set current working dircetory in oprions to relative script dir
	//
	let options: ShellExecutionOptions = {
		"cwd": cwd
	};

	//
	// Create the shell execution object
	//
	let execution = new ShellExecution(kind.cmdLine, options);
	let execution2 = new ShellExecution(kind2.cmdLine, options);

	return [ new Task(kind, folder, 'app-publisher', 'app-publisher', execution, undefined),
	         new Task(kind2, folder, 'app-publisher-dry', 'app-publisher', execution2, undefined) ];
}
