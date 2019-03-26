import * as vscode from 'vscode';

export class TaskTreeDataProvider implements vscode.TreeDataProvider<TreeTask> 
{

	private _onDidChangeTreeData: vscode.EventEmitter<TreeTask | null> = new vscode.EventEmitter<TreeTask | null>();
	readonly onDidChangeTreeData: vscode.Event<TreeTask | null> = this._onDidChangeTreeData.event;

	private autoRefresh: boolean = true;

	constructor(private context: vscode.ExtensionContext) 
	{
		this.autoRefresh = vscode.workspace.getConfiguration('taskView').get('autorefresh');
	}

	refresh(): void 
	{
		this._onDidChangeTreeData.fire();
	}

	public async getChildren(task?: TreeTask): Promise<TreeTask[]> 
	{
		let tasks = await vscode.tasks.fetchTasks().then(function (value) 
		{
			return value;
		});

		let taskFolders: vscode.TreeItem[] = [];
		let taskNames: TreeTask[] = [];

		if (tasks.length !== 0) 
		{
			for (var i = 0; i < tasks.length; i++ ) 
			{
				if (vscode.workspace.getConfiguration('taskView').get('debug') === true)
				{
					console.log('');
					console.log('Processing task ' + i.toString() + ' of ' + tasks.length.toString());
					console.log('   type = ' + tasks[i].definition.type);	
					console.log('   source = ' + tasks[i].source);	
					console.log('   scope = ' + tasks[i].scope.WorkspaceFolder.name);
				}

				if (tasks[i].source === 'Workspace' || vscode.workspace.getConfiguration('taskView').get('shownpm'))
				{
					if (vscode.workspace.getConfiguration('taskView').get('debug') === true)
					{
						console.log('   added task to view');
					}
					
					//WorkspaceFolder de;

					taskNames[i] = new TreeTask(tasks[i].definition.type, 
												tasks[i].name, 
												vscode.TreeItemCollapsibleState.None, 
												{ 
													command: 'taskView.executeTask', 
												  	title: "Execute", arguments: [tasks[i]] 
												});
				}
				else if (vscode.workspace.getConfiguration('taskView').get('debug') === true)
				{
					console.log('   skipped');
				}
			}
		}
		return taskNames;
	
	}

	getTreeItem(task: TreeTask): vscode.TreeItem 
	{
		return task;
	}
}


class TreeTask extends vscode.TreeItem {
	type: string;

	constructor(
		type: string, 
		label: string, 
		collapsibleState: vscode.TreeItemCollapsibleState,
		command?: vscode.Command
	) {
		super(label, collapsibleState);
		this.type = type;
		this.command = command;
	}
	 
}

