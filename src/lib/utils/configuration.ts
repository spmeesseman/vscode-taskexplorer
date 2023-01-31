
import { isObject } from "./utils";
import { IConfiguration } from "../../interface/IConfiguration";
const extensionName = "taskExplorer";
import {
    ConfigurationChangeEvent, workspace, WorkspaceConfiguration, ConfigurationTarget, ExtensionContext
} from "vscode";

let pkgJsonCfgProps = require("../../../package.json").contributes.configuration.properties;


class Configuration implements IConfiguration
{
    private configuration: WorkspaceConfiguration;
    private configurationGlobal: WorkspaceConfiguration;
    private isDev = false;
    private isTests = false;


    constructor()
    {
        this.configuration = workspace.getConfiguration(extensionName);
        this.configurationGlobal = workspace.getConfiguration();
    }


    public initialize(context: ExtensionContext, isDev: boolean, isTests: boolean)
    {
        this.isDev = isDev;
        this.isTests = isTests;
        this.configuration = workspace.getConfiguration(extensionName);
        this.configurationGlobal = workspace.getConfiguration();
        context.subscriptions.push(workspace.onDidChangeConfiguration(this.onConfigurationChanged, this));
        pkgJsonCfgProps = pkgJsonCfgProps || /* istanbul ignore next */context.extension.packageJSON.contributes.configuration.properties;
    }


    private onConfigurationChanged(event: ConfigurationChangeEvent)
    {
        if (event.affectsConfiguration(extensionName))
        {
            this.configuration = workspace.getConfiguration(extensionName);
            this.configurationGlobal = workspace.getConfiguration();
        }
    }


    public get = <T>(key: string, defaultValue?: T) => this.configuration.get<T>(key, defaultValue!);


    private getSettingKeys(key: string)
    {
        let propertyKey = key,
            valueKey = key,
            isObject = false;
        if (!pkgJsonCfgProps[propertyKey] && key.includes("."))
        {
            let propsKey = "";
            const keys = key.split(".");
            for (let i = 0; i < keys.length - 1; i++) {
                propsKey += ((i > 0 ? "." : "") + keys[i]);
            }
            const pkgJsonPropsKey = extensionName + "." + propsKey;
            if (pkgJsonCfgProps[pkgJsonPropsKey] && pkgJsonCfgProps[pkgJsonPropsKey].type === "object")
            {
                isObject = true;
                propertyKey = propsKey;
                valueKey = keys[keys.length - 1];
            }
        }
        return {
            isObject,
            pKey: propertyKey,
            vKey: valueKey
        };
    }


    /**
     * Include entire settings key.  This is just workspace.getConfiguration().
     * Example:
     *     getGlobal<string>("terminal.integrated.shell.windows", "")
     */
    public getVs = <T>(key: string, defaultValue?: T) => this.configurationGlobal.get<T>(key, defaultValue!);


    public updateVs = (key: string, value: any): Thenable<void> => this.configurationGlobal.update(key, value, ConfigurationTarget.Global);


    public updateVsWs = (key: string, value: any): Thenable<void> => this.configurationGlobal.update(key, value, ConfigurationTarget.Workspace);


    public update(key: string, value: any): Thenable<void>
    {
        const settingKeys = this.getSettingKeys(key);
        if (settingKeys.isObject)
        {
            const v = this.get<any>(settingKeys.pKey);
            // if (value !== undefined) {
                v[settingKeys.vKey] = value;
            //  }
            //  else {
            //      delete v[settingKeys.vKey];
            //  }
            value = v;
        }
        else if (isObject(value))
        {
            const v = this.get<object>(settingKeys.pKey, {});
            value = Object.assign(v, value);
        }
        return this.configuration.update(settingKeys.pKey, value, this.isDev || this.isTests ?
                                         ConfigurationTarget.Workspace : /* istanbul ignore next */ConfigurationTarget.Global);
    }


    public updateWs(key: string, value: any): Thenable<void>
    {
        const settingKeys = this.getSettingKeys(key);
        if (settingKeys.isObject)
        {
            const v = this.get<any>(settingKeys.pKey);
            // if (value !== undefined) {
                v[settingKeys.vKey] = value;
            // }
            // else {
            //     delete v[settingKeys.vKey];
            // }
            value = v;
        }
        else if (isObject(value))
        {
            const v = this.get<object>(settingKeys.pKey, {});
            value = Object.assign(v, value);
        }
        return this.configuration.update(settingKeys.pKey, value, ConfigurationTarget.Workspace);
    }


    // public updateWsf(section: string, value: any, uri?: Uri): Thenable<void>
    // {
    //     uri = uri || (workspace.workspaceFolders ? workspace.workspaceFolders[0].uri : undefined);
    //     return workspace.getConfiguration(extensionName, uri).update(section, value, ConfigurationTarget.WorkspaceFolder);
    // }


    // public inspect(section: string)
    // {
    //     return this.configuration.inspect(section);
    // }

}

export const configuration = new Configuration();

export const registerConfiguration = (context: ExtensionContext, isDev: boolean, isTests: boolean) =>
{
    configuration.initialize(context, isDev, isTests);
};
