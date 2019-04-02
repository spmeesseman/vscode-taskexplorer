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

	let exclude = workspace.getConfiguration('taskExplorer').get<string | string[]>('exclude');
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

/*
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
*/

