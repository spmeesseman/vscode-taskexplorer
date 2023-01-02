
const pkgJsonCfgProps = require("../../../package.json").contributes.configuration.properties;
import {
    ConfigurationChangeEvent, EventEmitter, workspace, WorkspaceConfiguration, ConfigurationTarget
} from "vscode";
import { IConfigurationApi } from "../../interface/configurationApi";

const extensionName = "taskExplorer";


class Configuration implements IConfigurationApi
{
    // private pkgJsonCfgProps: any;
    private configuration: WorkspaceConfiguration;
    private configurationWs: WorkspaceConfiguration;
    private _onDidChange = new EventEmitter<ConfigurationChangeEvent>();


    // get onDidChange(): Event<ConfigurationChangeEvent>
    // {
    //     return this._onDidChange.event;
    // }


    constructor()
    {
        // const pkgJsonFile = join(getInstallPath(), "package.json");
        // const pkgJson = JSON.parse(readFileSync(pkgJsonFile));
        // this.pkgJsonCfgProps = pkgJson.contributes.configuration.properties;
        this.configuration = workspace.getConfiguration(extensionName);
        this.configurationWs = workspace.getConfiguration();
        workspace.onDidChangeConfiguration(this.onConfigurationChanged, this);
    }


    private onConfigurationChanged(event: ConfigurationChangeEvent)
    {
        if (event.affectsConfiguration(extensionName))
        {
            this.configuration = workspace.getConfiguration(extensionName);
            this._onDidChange.fire(event);
        }
    }


    public get<T>(key: string, defaultValue?: T): T
    {
        return this.configuration.get<T>(key, defaultValue!);
    }


    private getSettingKeys(key: string)
    {
        let propertyKey = key,
            valueKey = key,
            isObject = false;;
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
    public getVs<T>(key: string, defaultValue?: T): T
    {
        return this.configurationWs.get<T>(key, defaultValue!);
    }


    public updateVs(key: string, value: any): Thenable<void>
    {
        return this.configurationWs.update(key, value, ConfigurationTarget.Global);
    }


    public updateVsWs(key: string, value: any): Thenable<void>
    {
        return this.configurationWs.update(key, value, ConfigurationTarget.Workspace);
    }


    public update(key: string, value: any): Thenable<void>
    {
        const settingKeys = this.getSettingKeys(key);
        if (settingKeys.isObject)
        {
            const v = this.get<any>(settingKeys.pKey);
            v[settingKeys.vKey] = value;
            value = v;
        }
        return this.configuration.update(settingKeys.pKey, value, ConfigurationTarget.Global);
    }


    public updateWs(key: string, value: any): Thenable<void>
    {
        const settingKeys = this.getSettingKeys(key);
        if (settingKeys.isObject)
        {
            const v = this.get<any>(settingKeys.pKey);
            v[settingKeys.vKey] = value;
            value = v;
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
