import { logOutputChannel } from './extension';
import { workspace, RelativePattern, WorkspaceFolder, Uri } from 'vscode';
import { accessSync } from 'original-fs';
import * as fs from 'fs';
import * as minimatch from 'minimatch';
//import * as path from 'path';
import { configuration } from './common/configuration';

const logValueWhiteSpace = 40;


export function camelCase(name: string, indexUpper: number) 
{
    if (!name) {
      return name;
    }

    return name
        .replace(/(?:^\w|[A-Za-z]|\b\w)/g, (letter, index) => {
            return index !== indexUpper ? letter.toLowerCase() : letter.toUpperCase();
        })
        .replace(/[\s\-]+/g, '');
}


export function properCase(name: string) 
{
    if (!name) {
      return name;
    }

    return name
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
            return index !== 0 ? letter.toLowerCase() : letter.toUpperCase();
        })
        .replace(/[\s]+/g, '');
}


//export function getTaskType(uri: Uri)
//{
//    let ext = path.extname(uri.fsPath);
//    let fileName = path.basename(uri.fsPath).toLowerCase();
//
//    if (fileName === "package.json") {
//        return "npm";
//    }
//    else if (fileName === "tasks.json") {
//        return "Workspace";
//    }
//    else if (fileName === "gruntfile.js") {
//        return "grunt";
//    }
//    else if (fileName === "gulpfile.js") {
//        return "gulp";
//    }
//    else if (fileName === "makefile") {
//        return "make";
//    }
//    else if (ext === ".gradle") {
//        return "gradle";
//    }
//    else if (ext === ".py") {
//        return "python";
//    }
//    else if (ext === ".rb") {
//        return "ruby";
//    }
//    else if (ext === ".ps1") {
//        return "powershell";
//    }
//    else if (ext === ".nsi") {
//        return "nsis";
//    }
//    else if (ext === ".xml") {
//        return "ant";
//    }
//
//    return null;
//}


export function getExcludesGlob(folder: string | WorkspaceFolder) : RelativePattern
{
    let relativePattern = new RelativePattern(folder, '**/node_modules/**');
    let excludes: string[] = configuration.get('exclude');

    if (excludes && excludes.length > 0) {
        let multiFilePattern: string = '{**/node_modules/**';
        if (Array.isArray(excludes)) 
        {
            for (var i in excludes) {
                multiFilePattern += ',';
                multiFilePattern += excludes[i];
            }
        }
        else {
            multiFilePattern += ',';
            multiFilePattern += excludes;
        }
        multiFilePattern += '}';
        relativePattern = new RelativePattern(folder, multiFilePattern);
    }

    return relativePattern;
}


export function isExcluded(uriPath: string) 
{
    function testForExclusionPattern(path: string, pattern: string): boolean 
    {
        return minimatch(path, pattern, { dot: true, nocase: true });
    }

    let exclude = configuration.get<string | string[]>('exclude');

    this.log('', 2);
    this.log('Check exclusion', 2);
    this.logValue('   path', uriPath, 2);

    if (exclude) 
    {
        if (Array.isArray(exclude)) 
        {
            for (let pattern of exclude) {
                this.logValue('   checking pattern', pattern, 3);
                if (testForExclusionPattern(uriPath, pattern)) {
                    this.log('   Excluded!', 2);
                    return true;
                }
            }
        } 
        else {
            this.logValue('   checking pattern', exclude, 3);
            if (testForExclusionPattern(uriPath, exclude)) {
              this.log('   Excluded!', 2);
              return true;
            }
        }
    }

    this.log('   Not excluded', 2);
    return false;
}


export function timeout(ms: number) 
{
    return new Promise(resolve => setTimeout(resolve, ms));
}


export function pathExists(path: string) 
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


export function readFileSync(file: string)
{
    return fs.readFileSync(file).toString();
}


export function removeFromArray(arr: any[], item: any)
{
    let idx: number = -1;
	let idx2: number = -1;

	arr.forEach(each => {
		idx++;
		if (item === each) {
            idx2 = idx;
            return false;
		}
	});

	if (idx2 !== -1 && idx2 < arr.length) {
		arr.splice(idx2, 1);
	}
}


export function existsInArray(arr: any[], item: any)
{
    let exists = false;
    if (arr) {
        arr.forEach(each => {
            if (item === each) {
                exists = true;
                return false;
            }
        });
    }
    
	return exists;
}


export async function log(msg: string, level?: number) 
{
    if (level && level > configuration.get<number>('debugLevel')) {
        return;
    }

    if (workspace.getConfiguration('taskExplorer').get('debug') === true) 
    {
        logOutputChannel.appendLine(msg);
    }
}


export async function logValue(msg: string, value: any, level?: number) 
{
    var logMsg = msg;

    if (level && level > configuration.get<number>('debugLevel')) {
        return;
    }

    for (var i = msg.length; i < logValueWhiteSpace; i++) {
        logMsg += ' ';
    }

    if (value || value === 0 || value === '') {
        logMsg += ': ';
        logMsg += value.toString();
    } 
    else if (value === undefined) {
        logMsg += ': undefined';
    } 
    else if (value === null) {
        logMsg += ': null';
    }

    if (workspace.getConfiguration('taskExplorer').get('debug') === true) {
        logOutputChannel.appendLine(logMsg);
    }
}
