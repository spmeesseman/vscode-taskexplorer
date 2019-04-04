import { logOutputChannel } from './extension';
import { workspace } from 'vscode';
import { accessSync } from 'original-fs';
import * as fs from 'fs';
import * as minimatch from 'minimatch';
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
        .replace(/[\s\-]+/g, '');
}


export function isExcluded(uriPath: string) 
{
    function testForExclusionPattern(path: string, pattern: string): boolean 
    {
        return minimatch(path, pattern, { dot: true });
    }

    let exclude = configuration.get<string | string[]>('exclude');

    this.log('');
    this.log('Check exclusion');
    this.logValue('   path', uriPath);

    if (exclude) 
    {
        if (Array.isArray(exclude)) 
        {
            for (let pattern of exclude) {
                this.logValue('   checking pattern', pattern);
                if (testForExclusionPattern(uriPath, pattern)) {
                    this.log('   Excluded!');
                    return true;
                }
            }
        } 
        else {
            this.logValue('   checking pattern', exclude);
            if (testForExclusionPattern(uriPath, exclude)) {
              this.log('   Excluded!');
              return true;
            }
        }
    }

    this.log('   Not excluded');
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


export async function log(msg: string, level?: number) 
{
    //let cfgLevel = configuration.get<number>('logLevel');

    if (workspace.getConfiguration('taskExplorer').get('debug') === true) 
    {
        //console.log(msg);
        logOutputChannel.appendLine(msg);
    }
}


export async function logValue(msg: string, value: any, level?: number) 
{
    var logMsg = msg;

    //let cfgLevel = configuration.get<number>('logLevel');

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
        //console.log(logMsg);
        logOutputChannel.appendLine(logMsg);
    }
}
