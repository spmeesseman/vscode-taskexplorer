'use strict';

import * as vscode from 'vscode';
import { TaskTreeDataProvider } from './taskProvider'

export function activate(context: vscode.ExtensionContext) 
{
	const taskTreeDataProvider = new TaskTreeDataProvider(context);

	vscode.window.registerTreeDataProvider('taskView', taskTreeDataProvider);
	vscode.commands.registerCommand('taskView.refresh', () => taskTreeDataProvider.refresh());

	vscode.commands.registerCommand('taskView.executeTask', function(task) 
	{
		if (vscode.workspace.getConfiguration('taskView').get('debug') === true)
		{
			console.log(task);	
		}

		vscode.tasks.executeTask(task).then(function (value) 
		{
			return value;
		}, 
		function(e) 
		{
			console.error('Error executing task');
		});
	});
}

export function deactivate(): void 
{
	
}
