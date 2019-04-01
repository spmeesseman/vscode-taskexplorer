
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from 'vscode';
import * as path from 'path';
import * as util from './util';
import { StringMap, isExcluded, readFile } from './tasks';
import { parseString } from 'xml2js';

let cachedTasks: Task[] = undefined;


interface AntTaskDefinition extends TaskDefinition 
{
	script: string;
	path?: string;
}

export class AntTaskProvider implements TaskProvider 
{
	constructor() {
	}

	public provideTasks() {
		return provideAntScripts();
	}

	public resolveTask(_task: Task): Task | undefined {
		return undefined;
	}
}


export function invalidateTasksCacheAnt() 
{
	cachedTasks = undefined;
}


async function detectAntScripts(): Promise<Task[]> 
{

	let emptyTasks: Task[] = [];
	let allTasks: Task[] = [];
	let visitedPackageJsonFiles: Set<string> = new Set();

	let folders = workspace.workspaceFolders;
	if (!folders) {
		return emptyTasks;
	}
	try {
		for (const folder of folders) {
			let relativePattern = new RelativePattern(folder, '**/[Bb]uild.xml');
			let paths = await workspace.findFiles(relativePattern, '**/node_modules/**');
			for (const path of paths) {
				if (!isExcluded(folder, path) && !visitedPackageJsonFiles.has(path.fsPath)) {
					let tasks = await provideAntScriptsForFolder(path);
					visitedPackageJsonFiles.add(path.fsPath);
					allTasks.push(...tasks);
				}
			}
		}
		return allTasks;
	} catch (error) {
		return Promise.reject(error);
	}
}


export async function provideAntScripts(): Promise<Task[]> 
{
	if (!cachedTasks) {
		cachedTasks = await detectAntScripts();
	}
	return cachedTasks;
}


async function provideAntScriptsForFolder(packageJsonUri: Uri): Promise<Task[]> 
{
	let emptyTasks: Task[] = [];

	let folder = workspace.getWorkspaceFolder(packageJsonUri);
	if (!folder) {
		return emptyTasks;
    }
    
    let contents = await readFile(packageJsonUri.fsPath);

	let scripts = await findAllAntScripts(contents);
	if (!scripts) {
		return emptyTasks;
	}

	const result: Task[] = [];

	Object.keys(scripts).forEach(each => {
		const task = createAntTask(each, `${each}`, folder!, packageJsonUri);
		const lowerCaseTaskName = each.toLowerCase();
		task.group = TaskGroup.Build;
		result.push(task);
	});

	return result;
}


export async function findAllAntScripts(buffer: string): Promise<StringMap> 
{
	let json: any = '';
	let scripts: StringMap = {};

	util.log('');
	util.log('FindAllAntScripts');

	parseString(buffer, function (err, result) {
		json = result;
	});

	if (!json.project)
	{
		util.log('   Script file does not contain a <project> root');
		return scripts;
	}

	if (!json.project.target)
	{
		util.log('   Script file does not contain any targets');
		return scripts;
	}

	let targets = json.project.target;
	for (var tgt in targets)
	{
		if (targets[tgt].$ && targets[tgt].$.name) {
			util.logValue('   Found target', targets[tgt].$.name);
			scripts[targets[tgt].$.name] = '';
		}
		else {
			util.log('   Invalid target found');
		}
	}

	return scripts;
}


export function createAntTask(script: string, cmd: string, folder: WorkspaceFolder, packageJsonUri: Uri): Task 
{
	function getCommandLine(folder: WorkspaceFolder, cmd: string): string 
	{
		let ant = "ant";

		if (workspace.getConfiguration('taskExplorer').get('pathToAnt')) {
			ant = workspace.getConfiguration('taskExplorer').get('pathToAnt'); // path.join();
		}

		if (workspace.getConfiguration('taskExplorer', folder.uri).get<boolean>('runSilent')) {
			ant += ' -silent';
		}

		if (workspace.getConfiguration('taskExplorer').get('enableAnsiconForAnt') === true) {
			ant += ' -logger org.apache.tools.ant.listener.AnsiColorLogger';
		}

		return `${ant} ${cmd}`; 
	}

	function getRelativePath(folder: WorkspaceFolder, packageJsonUri: Uri): string 
	{
		let rootUri = folder.uri;
		let absolutePath = packageJsonUri.path.substring(0, packageJsonUri.path.length - 'build.xml'.length);
		return absolutePath.substring(rootUri.path.length + 1);
	}
	
	let kind: AntTaskDefinition = {
		type: 'ant',
		script: script
	};

	let relativePath = getRelativePath(folder, packageJsonUri);
	if (relativePath.length) {
		kind.path = relativePath;
	}
	let cwd = path.dirname(packageJsonUri.fsPath);

	let options = null;
	let ansicon = "ansicon.exe";

	if (workspace.getConfiguration('taskExplorer').get('enableAnsiconForAnt') === true)
	{
		if (workspace.getConfiguration('taskExplorer').get('pathToAnsicon'))
		{
			ansicon = workspace.getConfiguration('taskExplorer').get('pathToAnsicon');
		}
		
		options = {
			"cwd": cwd,
			"shell": {
				"executable": ansicon
			}
		};
	}
	else
	{
		options = {
			"cwd": cwd
		};
	}

	let scriptName = script;
	//if (relativePath && relativePath.length) {
	//	scriptName = `${script} - ${relativePath.substring(0, relativePath.length - 1)}`;
	//}

	let execution = new ShellExecution(getCommandLine(folder, cmd), options);
	
	return new Task(kind, folder, scriptName, 'ant', execution, undefined);
}
