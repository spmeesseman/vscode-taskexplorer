
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition, TextEditorRevealType, Range, window
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


async function findAllAntScripts(buffer: string): Promise<StringMap> 
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


function createAntTask(target: string, cmd: string, folder: WorkspaceFolder, packageJsonUri: Uri): Task 
{
	function getCommand(folder: WorkspaceFolder, cmd: string): string 
	{
		let ant = "ant";

		if (process.platform === 'win32') {
			ant = "ant.bat";
		}

		if (workspace.getConfiguration('taskExplorer').get('pathToAnt')) {
			ant = workspace.getConfiguration('taskExplorer').get('pathToAnt');
			if (process.platform === 'win32' && ant.endsWith("\\ant")) {
				ant += '.bat';
			}
		}

		return ant; 
	}

	function getRelativePath(folder: WorkspaceFolder, packageJsonUri: Uri): string 
	{
		let rootUri = folder.uri;
		let absolutePath = packageJsonUri.path.substring(0, packageJsonUri.path.length - 'build.xml'.length);
		return absolutePath.substring(rootUri.path.length + 1);
	}
	
	let kind: AntTaskDefinition = {
		type: 'ant',
		script: target
	};

	let relativePath = getRelativePath(folder, packageJsonUri);
	if (relativePath.length) {
		kind.path = relativePath;
	}
	let cwd = path.dirname(packageJsonUri.fsPath);

	let args = [ target ];
	let options = null;
	
	if (process.platform === 'win32' && workspace.getConfiguration('taskExplorer').get('enableAnsiconForAnt') === true)
	{
		let ansicon = "ansicon.exe";
		let ansiPath: string = workspace.getConfiguration('taskExplorer').get('pathToAnsicon');
		if (ansiPath && util.pathExists(ansiPath)) {
			ansicon = ansiPath;
			if (!ansicon.endsWith('ansicon.exe') && !ansicon.endsWith('\\')) {
				ansicon = path.join(ansicon, 'ansicon.exe');
			}
			else if (!ansicon.endsWith('ansicon.exe')) {
				ansicon += 'ansicon.exe';
			}
		}
		
		args = [ "-logger", "org.apache.tools.ant.listener.AnsiColorLogger", target ];
		options = {
			"cwd": cwd,
			"executable": ansicon
		};
	}
	else
	{
		options = {
			"cwd": cwd
		};
	}

	let targetName = target;
	if (relativePath && relativePath.length) {
		targetName = `${target} - ${relativePath.substring(0, relativePath.length - 1)}`;
	}

	let execution = new ShellExecution(getCommand(folder, cmd), args, options);
	
	return new Task(kind, folder, targetName, 'ant', execution, undefined);
}
