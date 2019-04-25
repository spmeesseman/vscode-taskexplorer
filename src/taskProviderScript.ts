
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition, ShellExecutionOptions, TextDocument
} from 'vscode';
import * as path from 'path';
import * as util from './util';
import { configuration } from "./common/configuration";
import { TaskItem } from './taskItem';

type StringMap = { [s: string]: string; };

let cachedTasks: Task[] = undefined;

let scriptTable = {
	sh: {
		exec: '',
		type: 'bash',
		args: [],
		enabled: configuration.get('enableBash')
	},
	py: {
		exec: configuration.get('pathToPython') ? configuration.get('pathToPython') : 'python',
		type: 'python',
		args: [],
		enabled: configuration.get('enablePython')
	},
	rb: {
		exec: configuration.get('pathToRuby') ? configuration.get('pathToRuby') : 'ruby',
		type: 'ruby',
		args: [],
		enabled: configuration.get('enableRuby')
	},
	ps1: {
		exec: 'powershell',
		type: 'powershell',
		args: [],
		enabled: configuration.get('enablePowershell')
	},
	pl: {
		exec: configuration.get('pathToPerl') ? configuration.get('pathToPerl') : 'perl',
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
	nsi: {
		exec: configuration.get('pathToNsis') ? configuration.get('pathToNsis') : 'makensis.exe',
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
	uri?: Uri;
	treeItem?: TaskItem;
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


export async function invalidateTasksCacheScript(opt?: Uri) : Promise<void> 
{
	util.log('');
	util.log('invalidateTasksCacheScript');

	if (opt && cachedTasks) 
	{
		let rmvTasks: Task[] = [];
		let folder = workspace.getWorkspaceFolder(opt);

		cachedTasks.forEach(each => {
			let cstDef: ScriptTaskDefinition = each.definition as ScriptTaskDefinition;
			if (cstDef.uri.fsPath === opt.fsPath || !util.pathExists(cstDef.uri.fsPath)) {
				rmvTasks.push(each);
			}
		});

		rmvTasks.forEach(each => {
			util.log('   removing old task ' + each.name);
			util.removeFromArray(cachedTasks, each);
		});

		if (util.pathExists(opt.fsPath))
		{
			let task = createScriptTask(scriptTable[path.extname(opt.fsPath).substring(1)], folder!,  opt);
			cachedTasks.push(task);
		}

		if (cachedTasks.length > 0) {
			return;
		}
	}

	cachedTasks = undefined;
}


async function provideScriptFiles(): Promise<Task[]>
{
	if (!cachedTasks) {
		cachedTasks = await detectScriptFiles();
	}
	return cachedTasks;
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
			let relativePattern = new RelativePattern(folder, '**/*.{sh,py,rb,ps1,pl,bat,nsi}'); //,SH,PY,RB,PS1,PL,BAT,NSI');
			let paths = await workspace.findFiles(relativePattern, util.getExcludesGlob(folder));
			for (const fpath of paths)
			{
				if (!util.isExcluded(fpath.path) && !visitedFiles.has(fpath.fsPath)) {

					visitedFiles.add(fpath.fsPath);
					allTasks.push(createScriptTask(scriptTable[path.extname(fpath.fsPath).substring(1)], folder!, fpath));
				}
			}
		}
		return allTasks;
	} catch (error) {
		return Promise.reject(error);
	}
}


function createScriptTask(scriptDef: any, folder: WorkspaceFolder, uri: Uri): Task
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

	let kind: ScriptTaskDefinition = {
		type: 'script',
		scriptType: scriptDef.type,
		fileName: fileName,
		scriptFile: true, // set scriptFile to true to include all scripts in folder instead of grouped at file
		path: '',
		cmdLine: (scriptDef.exec.indexOf(" ") !== -1 ? "\"" + scriptDef.exec + "\"" : scriptDef.exec),
		requiresArgs: false,
		uri: uri
	};

	//
	// Check if this script might need command line arguments
	//
	// TODO:  Other script types
	//
	if (scriptDef.type === 'batch')
	{
		let contents = util.readFileSync(uri.fsPath);
		kind.requiresArgs = (new RegExp("%[1-9]")).test(contents);
	}

	//
	// Get relative dir to workspace folder
	//
	let relativePath = getRelativePath(folder, uri);
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
