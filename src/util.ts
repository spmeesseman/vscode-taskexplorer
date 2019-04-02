
import { logOutputChannel } from "./extension";
import { WorkspaceFolder, Uri, workspace } from "vscode";
import { accessSync } from "original-fs";
import * as fs from 'fs';
import * as path from 'path';
import * as minimatch from 'minimatch';

const logValueWhiteSpace = 40;


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


export function timeout(ms: number) 
{
  return new Promise(resolve => setTimeout(resolve, ms));
}


export function pathExists (path: string) 
{
  try {
    accessSync(path);
  } catch (err) {
    return false;
  }
  return true;
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


export async function log(msg: string)
{
  if (workspace.getConfiguration('taskExplorer').get('debug') === true)
	{
    //console.log(msg);
    logOutputChannel.appendLine(msg);
  }
}


export async function logValue(msg: string, value: any)
{
  var logMsg = msg;
  for (var i = msg.length; i < logValueWhiteSpace; i++)
  {
    logMsg += ' ';
  }
  if (value)
  {
    logMsg += ': ';
    logMsg += value.toString();
  }
  if (workspace.getConfiguration('taskExplorer').get('debug') === true)
	{
    //console.log(logMsg);
    logOutputChannel.appendLine(logMsg);
  }
}

