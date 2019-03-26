'use strict';

import * as vscode from 'vscode';
import { TaskTreeDataProvider } from './taskProvider'

export function activate(context: vscode.ExtensionContext) {

	const taskTreeDataProvider = new TaskTreeDataProvider(context);

	vscode.window.registerTreeDataProvider('taskView', taskTreeDataProvider);
	vscode.commands.registerCommand('taskView.refresh', () => taskTreeDataProvider.refresh());

	vscode.commands.registerCommand('taskView.executeTask', function(task) {
		console.log(task);	
		vscode.tasks.executeTask(task).then(function (value) {
			return value;
		}, function(e) {
			console.error('I am error');
		});
	});
}

export function deactivate(): void {
	
}