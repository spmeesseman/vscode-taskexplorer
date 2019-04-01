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
import * as minimatch from 'minimatch';
import * as nls from 'vscode-nls';
import * as util from './util';
import { findAllAntScripts } from './taskProviderAnt';
import { JSONVisitor, visit, ParseErrorCode } from 'jsonc-parser';

const localize = nls.loadMessageBundle();

export type StringMap = { [s: string]: string; };


export function isWorkspaceFolder(value: any): value is WorkspaceFolder 
{
	return value && typeof value !== 'number';
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


export async function readFile(file: string): Promise<string> 
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
	/*
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
	}*/
	return undefined;
}


async function findAllScripts(buffer: string): Promise<StringMap> 
{
	let scripts: StringMap = {};
	let script: string | undefined = undefined;
	let inScripts = false;
	let inTasks = false;

	util.log('');
	util.log('Find all scripts');

	let visitor: JSONVisitor = {
		onError(_error: ParseErrorCode, _offset: number, _length: number) {
			util.logValue('   json visitor error', _error.toString());
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
		let localizedParseError = localize('taskExplorer.parseError', 'Script detection: failed to parse the file {0}', packageJsonUri.fsPath);
		throw new Error(localizedParseError);
	}
}
