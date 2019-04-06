
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition, ShellExecutionOptions, TextDocument
} from 'vscode';
import * as path from 'path';
import * as util from './util';
import { configuration } from "./common/configuration";
import { downloadAndUnzipVSCode } from 'vscode-test';

type StringMap = { [s: string]: string; };

let cachedTasks: Task[] = undefined;

let scriptTable = {
	shellscript: {
		exec: '',
		type: 'bash',
		args: [],
		enabled: configuration.get('enableBash')
	},
	python: {
		exec: 'python',
		type: 'python',
		args: [],
		enabled: configuration.get('enablePython')
	},
	ruby: {
		exec: 'ruby',
		type: 'ruby',
		args: [],
		enabled: configuration.get('enableRuby')
	},
	powershell: {
		exec: 'powershell',
		type: 'powershell',
		args: [],
		enabled: configuration.get('enablePowershell')
	},
	perl: {
		exec: 'perl',
		type: 'perl',
		args: [],
		enabled: configuration.get('enablePerl')
	},
	bat: {
		exec: 'cmd.exe',
		type: 'batch',
		args: ['/c'],
		enabled: configuration.get('enableBatch')
	},
	nsis: {
		exec: 'nsis.exe',
		type: 'nsis',
		args: [],
		enabled: configuration.get('enableNsis')
	}
};

interface ScriptTaskDefinition extends TaskDefinition 
{
	scriptType: string;
	cmdLine: string;
	fileName: string;
	scriptFile: boolean;
	path?: string;
	requiresArgs?: boolean;
}

export class ScriptTaskProvider implements TaskProvider 
{
	constructor() {
	}

	public provideTasks() {
		return provideScriptFiles();
	}

	public resolveTask(_task: Task): Task | undefined {
		return undefined;
	}
}


export function invalidateTasksCacheScript() 
{
	cachedTasks = undefined;
}


async function detectScriptFiles(): Promise<Task[]> 
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
			let relativePattern = new RelativePattern(folder, '**/*.{sh,py,rb,ps1,pl,bat,cmd,vbs,ahk,nsi}'); //,**/*.{SH,PY,RB,PS1,PL,BAT,CMD,VBS,AHK,NSI}}');
			let paths = await workspace.findFiles(relativePattern, '**/node_modules/**');
			for (const fpath of paths) 
			{
				if (!util.isExcluded(fpath.path) && !visitedFiles.has(fpath.fsPath)) {
					visitedFiles.add(fpath.fsPath);

					let contents = await util.readFile(fpath.fsPath);
					let textFile: TextDocument = await workspace.openTextDocument(fpath);
					for (const type of Object.keys(scriptTable)) {
						if (textFile.languageId === type) {
							if (scriptTable[type].enabled) {
								allTasks.push(createScriptTask(scriptTable[type], folder!, textFile.uri, contents));
							}
							break;
						}
					}
				}
			}
		}
		return allTasks;
	} catch (error) {
		return Promise.reject(error);
	}
}


export async function provideScriptFiles(): Promise<Task[]> 
{
	if (!cachedTasks) {
		cachedTasks = await detectScriptFiles();
	}
	return cachedTasks;
}


function createScriptTask(scriptDef: any, folder: WorkspaceFolder, packageJsonUri: Uri, contents: string): Task 
{
	function getRelativePath(folder: WorkspaceFolder, packageJsonUri: Uri): string 
	{
		let rootUri = folder.uri;
		let absolutePath = packageJsonUri.path.substring(0, packageJsonUri.path.lastIndexOf('/') + 1);
		return absolutePath.substring(rootUri.path.length + 1);
	}
	
	let cwd = path.dirname(packageJsonUri.fsPath);
	let fileName = path.basename(packageJsonUri.fsPath);
	
	let kind: ScriptTaskDefinition = {
		type: 'script',
		scriptType: scriptDef.type,
		fileName: fileName,
		scriptFile: true, // set scriptFile to true to include all scripts in folder instead of grouped at file
		path: '',
		cmdLine: scriptDef.exec,
		requiresArgs: false
	};

	//
	// Check if this script might need command line arguments
	//
	// TODO:  Other script types
	//
	if (scriptDef.type === 'batch')
	{
		kind.requiresArgs = (new RegExp("%[1-9]")).test(contents);
	}

	//
	// Get relative dir to workspace folder
	//
	let relativePath = getRelativePath(folder, packageJsonUri);
	if (relativePath.length) {
		kind.path = relativePath;
	}
	
	//
	// Set current working dircetory in oprions to relative script dir
	//
	let options: ShellExecutionOptions = {
		"cwd": cwd
	};

	//
	// Add any defined arguments to the command line for the script type
	//
	if (scriptDef.args)
	{
		for (var i = 0; i < scriptDef.args.length; i++) {
			kind.cmdLine += ' ';
			kind.cmdLine += scriptDef.args[i];
		}
	}

	let sep: string = (process.platform === 'win32' ? "\\" : "/");
	//
	// Add the file name to the command line following the exec.  Quote if ecessary.  Prepend './' as
	// powershell script requires this
	//
	kind.cmdLine += ' ';
	kind.cmdLine += (fileName.indexOf(" ") !== -1 ? "\"" + '.' + sep + fileName + "\"" : '.' + sep + fileName);

	//
	// Create the shell execution object
	//
	let execution = new ShellExecution(kind.cmdLine, options);
	
	return new Task(kind, folder, fileName, scriptDef.type, execution, undefined);
}
