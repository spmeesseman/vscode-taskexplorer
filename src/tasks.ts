/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	TaskDefinition, Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri, workspace,
	DebugConfiguration, debug, TaskProvider, TextDocument, tasks
} from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseString } from 'xml2js';
import * as minimatch from 'minimatch';
import * as nls from 'vscode-nls';
import * as util from './util';
import { JSONVisitor, visit, ParseErrorCode } from 'jsonc-parser';
import { utils } from 'mocha';

const localize = nls.loadMessageBundle();

type StringMap = { [s: string]: string; };

export interface AntTaskDefinition extends TaskDefinition 
{
	script: string;
	path?: string;
}


let cachedTasks: Task[] | undefined = undefined;


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


export function invalidateTasksCache() 
{
	cachedTasks = undefined;
}


export function isWorkspaceFolder(value: any): value is WorkspaceFolder 
{
	return value && typeof value !== 'number';
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


export function isExcluded(folder: WorkspaceFolder, packageJsonUri: Uri) 
{
	function testForExclusionPattern(path: string, pattern: string): boolean {
		return minimatch(path, pattern, { dot: true });
	}

	let exclude = workspace.getConfiguration('taskExplorer', folder.uri).get<string | string[]>('exclude');
	let packageJsonFolder = path.dirname(packageJsonUri.fsPath);

	if (exclude) {
		if (Array.isArray(exclude)) {
			for (let pattern of exclude) {
				if (testForExclusionPattern(packageJsonFolder, pattern)) {
					return true;
				}
			}
		} else if (testForExclusionPattern(packageJsonFolder, exclude)) {
			return true;
		}
	}
	return false;
}


async function provideAntScriptsForFolder(packageJsonUri: Uri): Promise<Task[]> 
{
	let emptyTasks: Task[] = [];

	let folder = workspace.getWorkspaceFolder(packageJsonUri);
	if (!folder) {
		return emptyTasks;
	}
	let scripts = await getScripts(packageJsonUri);
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
	if (relativePath && relativePath.length) {
		scriptName = `${script} - ${relativePath.substring(0, relativePath.length - 1)}`;
	}

	let execution = new ShellExecution(getCommandLine(folder, cmd), options);
	
	return new Task(kind, folder, script, 'ant', execution, undefined);
}


export function getFileNameFromSource(source: string, incRelPathForCode?: boolean): string | null
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

export function getUriFromTask(task: Task): Uri | null 
{
	let uri:Uri = null;

	util.log('');
	util.log('getUriFromTask');
	util.logValue('   task name', task.name);
	util.logValue('   task source', task.source);
	util.logValue('   task type', task.definition.type);

	if (isWorkspaceFolder(task.scope)) 
	{
		let relPath: string = task.definition.path;
		let fileName: string = this.getFileNameFromSource(task.source);

		if (task.source === 'Workspace')
		{
			relPath = '.vscode';
		}

		if (relPath) {
			uri = Uri.file(path.join(task.scope.uri.fsPath, relPath, fileName));
		} 
		else {
			uri = Uri.file(path.join(task.scope.uri.fsPath, fileName));
		}
	}

	util.logValue('   uri path', uri.fsPath);

	return uri;
}


async function exists(file: string): Promise<boolean> 
{
	return new Promise<boolean>((resolve, _reject) => {
		fs.exists(file, (value) => {
			resolve(value);
		});
	});
}


async function readFile(file: string): Promise<string> 
{
	return new Promise<string>((resolve, reject) => {
		fs.readFile(file, (err, data) => {
			if (err) {
				reject(err);
			}
			resolve(data.toString());
		});
	});
}


export function extractDebugArgFromScript(scriptValue: string): [string, number] | undefined 
{
	// matches --debug, --debug=1234, --debug-brk, debug-brk=1234, --inspect,
	// --inspect=1234, --inspect-brk, --inspect-brk=1234,
	// --inspect=localhost:1245, --inspect=127.0.0.1:1234, --inspect=[aa:1:0:0:0]:1234, --inspect=:1234
	let match = scriptValue.match(/--(inspect|debug)(-brk)?(=((\[[0-9a-fA-F:]*\]|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+|[a-zA-Z0-9\.]*):)?(\d+))?/);

	if (match) {
		if (match[6]) {
			return [match[1], parseInt(match[6])];
		}
		if (match[1] === 'inspect') {
			return [match[1], 9229];
		}
		if (match[1] === 'debug') {
			return [match[1], 5858];
		}
	}
	return undefined;
}


async function findAllScripts(buffer: string): Promise<StringMap> 
{
	let scripts: StringMap = {};
	let script: string | undefined = undefined;
	let inScripts = false;
	let inTasks = false;

	let visitor: JSONVisitor = {
		onError(_error: ParseErrorCode, _offset: number, _length: number) {
			console.log(_error + 'h');
		},
		onObjectEnd() {
			if (inScripts) {
				inScripts = false;
			}
		},
		onLiteralValue(value: any, _offset: number, _length: number) {
			if (script) {
				if (typeof value === 'string') {
					if (script === 'label')  // VSCODE
					{
						script = value;
						scripts[value] = '';
					}
					else
					{
						scripts[script] = value;
					}
				}
				script = undefined;
			}
		},
		onObjectProperty(property: string, _offset: number, _length: number) {
			if (property === 'scripts') {
				inScripts = true;
			}
			else if (inScripts && !script) {
				script = property;
			} 
			else if (property === 'tasks') {
				inTasks = true;
			}
			else if (property === 'label' && inTasks && !script) {
				script = property;
			}
			else { // nested object which is invalid, ignore the script
				script = undefined;
			}
		}
	};
	visit(buffer, visitor);
	return scripts;
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

	if (!json.project)
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


export function findAllScriptRanges(buffer: string): Map<string, [number, number, string]> 
{
	let scripts: Map<string, [number, number, string]> = new Map();
	let script: string | undefined = undefined;
	let offset: number;
	let length: number;

	let inScripts = false;

	let visitor: JSONVisitor = {
		onError(_error: ParseErrorCode, _offset: number, _length: number) {
		},
		onObjectEnd() {
			if (inScripts) {
				inScripts = false;
			}
		},
		onLiteralValue(value: any, _offset: number, _length: number) {
			if (script) {
				scripts.set(script, [offset, length, value]);
				script = undefined;
			}
		},
		onObjectProperty(property: string, off: number, len: number) {
			if (property === 'scripts') {
				inScripts = true;
			}
			else if (inScripts) {
				script = property;
				offset = off;
				length = len;
			}
		}
	};
	visit(buffer, visitor);
	return scripts;
}


export function findScriptAtPosition(buffer: string, offset: number): string | undefined 
{
	let script: string | undefined = undefined;
	let foundScript: string | undefined = undefined;
	let inScripts = false;
	let scriptStart: number | undefined;
	let visitor: JSONVisitor = {
		onError(_error: ParseErrorCode, _offset: number, _length: number) {
		},
		onObjectEnd() {
			if (inScripts) {
				inScripts = false;
				scriptStart = undefined;
			}
		},
		onLiteralValue(value: any, nodeOffset: number, nodeLength: number) {
			if (inScripts && scriptStart) {
				if (typeof value === 'string' && offset >= scriptStart && offset < nodeOffset + nodeLength) {
					// found the script
					inScripts = false;
					foundScript = script;
				} else {
					script = undefined;
				}
			}
		},
		onObjectProperty(property: string, nodeOffset: number) {
			if (property === 'scripts') {
				inScripts = true;
			}
			else if (inScripts) {
				scriptStart = nodeOffset;
				script = property;
			} else { // nested object which is invalid, ignore the script
				script = undefined;
			}
		}
	};
	visit(buffer, visitor);
	return foundScript;
}


export async function getScripts(packageJsonUri: Uri): Promise<StringMap | undefined> 
{
	util.log('');
	util.log('getScripts');
	util.logValue('   uri', packageJsonUri.fsPath);

	if (packageJsonUri.scheme !== 'file') 
	{
		return undefined;
	}

	let packageJson = packageJsonUri.fsPath;
	if (!await exists(packageJson)) 
	{
		return undefined;
	}

	try 
	{
		let contents = await readFile(packageJson);
		let json = null;

		if (packageJsonUri.fsPath.indexOf('uild.xml') === -1)
		{
			json = findAllScripts(contents);//JSON.parse(contents);
		}
		else
		{
			json = findAllAntScripts(contents);
		}
		return json;
	} 
	catch (e) {
		let localizedParseError = localize('taskview.parseError', 'Script detection: failed to parse the file {0}', packageJsonUri.fsPath);
		throw new Error(localizedParseError);
	}
}
