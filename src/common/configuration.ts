"use strict";

import {
    ConfigurationChangeEvent, Event, EventEmitter, workspace,
    WorkspaceConfiguration, ConfigurationTarget, Uri
} from "vscode";

const taskExplorer = "taskExplorer";

class Configuration
{
    private configuration: WorkspaceConfiguration;
    //private wsconfiguration: WorkspaceConfiguration;
    //private wsfconfiguration: WorkspaceConfiguration;

    private _onDidChange = new EventEmitter<ConfigurationChangeEvent>();

    get onDidChange(): Event<ConfigurationChangeEvent>
    {
        return this._onDidChange.event;
    }

    constructor()
    {
        this.configuration = workspace.getConfiguration(taskExplorer);
        // this.wsconfiguration = workspace.getConfiguration(taskExplorer, workspace.workspaceFolders[0].uri);
        workspace.onDidChangeConfiguration(this.onConfigurationChanged, this);
    }

    private onConfigurationChanged(event: ConfigurationChangeEvent)
    {
        if (!event.affectsConfiguration(taskExplorer))
        {
            return;
        }

        this.configuration = workspace.getConfiguration(taskExplorer);

        this._onDidChange.fire(event);
    }

    public get<T>(section: string, defaultValue?: T): T
    {
        return this.configuration.get<T>(section, defaultValue!);
    }

    public update(section: string, value: any): Thenable<void>
    {
        return this.configuration.update(section, value, ConfigurationTarget.Global);
    }

    public updateWs(section: string, value: any, uri?: Uri): Thenable<void>
    {
        return workspace.getConfiguration(taskExplorer, uri ? uri : workspace.workspaceFolders[0].uri).update(section, value, ConfigurationTarget.Workspace);
    }

    public updateWsf(section: string, value: any, uri?: Uri): Thenable<void>
    {
        return workspace.getConfiguration(taskExplorer, uri ? uri : workspace.workspaceFolders[0].uri).update(section, value, ConfigurationTarget.WorkspaceFolder);
    }

    public inspect(section: string)
    {
        return this.configuration.inspect(section);
    }
}

export const configuration = new Configuration();
