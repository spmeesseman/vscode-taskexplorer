
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from 'vscode';
import * as path from 'path';
import * as util from './util';
type StringMap = { [s: string]: string; };

let cachedTasks: Task[] = undefined;


interface GulpTaskDefinition extends TaskDefinition 
{
	script?: string;
	path?: string;
	fileName?: string;
	uri?: Uri;
}

export class GulpTaskProvider implements TaskProvider 
{
	constructor() {
	}

	public provideTasks() {
		return provideGulpfiles();
	}

	public resolveTask(_task: Task): Task | undefined {
		return undefined;
	}
}


export async function invalidateTasksCacheGulp(opt?: Uri) : Promise<void> 
{
	util.log('');
	util.log('invalidateTasksCacheGulp');

	if (opt) 
	{
		let rmvTasks: Task[] = [];
		let uri: Uri = opt as Uri;

		cachedTasks.forEach(async each => {
			let cstDef: GulpTaskDefinition = each.definition;
			if (cstDef.uri.fsPath === opt.fsPath) {
				rmvTasks.push(each);
			}
		});

		rmvTasks.forEach(each => {
			util.log('   removing old task ' + each.name);
			util.removeFromArray(cachedTasks, each);
		});

		let tasks = await readGulpfile(opt);
		cachedTasks.push(...tasks);

		return;
	}

	cachedTasks = undefined;
}


async function provideGulpfiles(): Promise<Task[]> 
{
	if (!cachedTasks) {
		cachedTasks = await detectGulpfiles();
	}
	return cachedTasks;
}


async function detectGulpfiles(): Promise<Task[]> 
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
			//
			// Note - pattern will ignore gulpfiles in root project dir, which would be picked
			// up by VSCoces internal Gulp task provider
			//
			let relativePattern = new RelativePattern(folder, '**/[Gg][Uu][Ll][Pp][Ff][Ii][Ll][Ee].[Jj][Ss]');
			let paths = await workspace.findFiles(relativePattern, util.getExcludesGlob(folder));
			for (const fpath of paths) 
			{
				if (!util.isExcluded(fpath.path) && !visitedFiles.has(fpath.fsPath)) {
					let tasks = await readGulpfile(fpath);
					visitedFiles.add(fpath.fsPath);
					allTasks.push(...tasks);
				}
			}
		}
		return allTasks;
	} catch (error) {
		return Promise.reject(error);
	}
}


async function readGulpfile(uri: Uri): Promise<Task[]> 
{
	let emptyTasks: Task[] = [];

	let folder = workspace.getWorkspaceFolder(uri);
	if (!folder) {
		return emptyTasks;
    }
    
    let scripts = await findTargets(uri.fsPath);
	if (!scripts) {
		return emptyTasks;
	}

	const result: Task[] = [];

	Object.keys(scripts).forEach(each => {
		const task = createGulpTask(each, `${each}`, folder!, uri);
		if (task) {
			task.group = TaskGroup.Build;
			result.push(task);
		}
	});

	return result;
}


async function findTargets(fsPath: string): Promise<StringMap> 
{
	let json: any = '';
	let scripts: StringMap = {};

	util.log('');
	util.log('Find gulpfile targets');

	let contents = await util.readFile(fsPath);
	let idx = 0;
	let eol = contents.indexOf('\n', 0);

	while (eol !== -1)
	{
		let line: string = contents.substring(idx, eol).trim();
		if (line.length > 0 && line.toLowerCase().trimLeft().startsWith('gulp.task')) 
		{
			let idx1 = line.indexOf('\'');
			if (idx1 === -1) {
				idx1 = line.indexOf('"');
			}

			if (idx1 === -1) // check next line for task name
			{
				let eol2 = eol + 1;
				eol2 = contents.indexOf('\n', eol2);
				line = contents.substring(eol + 1, eol2).trim();
				if (line.startsWith('\'') || line.startsWith('"'))
				{
					idx1 = line.indexOf('\'');
					if (idx1 === -1) {
						idx1 = line.indexOf('"');
					}
					if (idx1 !== -1) {
						eol = eol2;
					}
				}
			}

			if (idx1 !== -1)
			{
				idx1++;
				let idx2 = line.indexOf('\'', idx1);
				if (idx2 === -1) {
					idx2 = line.indexOf('"', idx1);
				}
				if (idx2 !== -1) 
				{
					let tgtName = line.substring(idx1, idx2).trim();

					if (tgtName) {
						scripts[tgtName] = '';
						util.log('   found target');
						util.logValue('      name', tgtName);
					}
				}
			}
		}

		idx = eol + 1;
		eol = contents.indexOf('\n', idx);
	}

	util.log('   done');

	return scripts;
}


function createGulpTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task 
{
	function getCommand(folder: WorkspaceFolder, relativePath: string, cmd: string): string 
	{
		let gulp = 'gulp';
		//let gulp = folder.uri.fsPath + "/node_modules/.bin/gulp";
		//if (process.platform === 'win32') {
		//	gulp = folder.uri.fsPath + "\\node_modules\\.bin\\gulp.cmd";
		//}
		//if (relativePath) {
		//	gulp += (' --gulpfile ' + path.join(relativePath, 'gulpfile.js'));
		//}

		if (workspace.getConfiguration('taskExplorer').get('pathToGulp')) {
			gulp = workspace.getConfiguration('taskExplorer').get('pathToGulp');
		}
 
		return gulp; 
	}

	function getRelativePath(folder: WorkspaceFolder, uri: Uri): string 
	{
		let rootUri = folder.uri;
		let absolutePath = uri.path.substring(0, uri.path.lastIndexOf('/') + 1);
		return absolutePath.substring(rootUri.path.length + 1);
	}
	
	let kind: GulpTaskDefinition = {
		type: 'gulp',
		script: target,
		path: '',
		fileName: path.basename(uri.path),
		uri: uri
	};

	let relativePath = getRelativePath(folder, uri);
	if (relativePath.length) {
		kind.path = relativePath;
	}
	let cwd = path.dirname(uri.fsPath);

	let args = [ getCommand(folder, relativePath, cmd), target ];
	let options = {
		"cwd": cwd
	};

	let execution = new ShellExecution('npx', args, options);

	return new Task(kind, folder, target, 'gulp', execution, undefined);
}
