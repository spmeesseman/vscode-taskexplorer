
import * as fs from "./utils/fs";
import * as util from "./utils/utils";
import * as fileCache from "./fileCache";
import log from "./log/log";
import TaskTree from "../tree/tree";
import { setContext } from "./context";
import { ContextKeys } from "./constants";
import { TeContainer } from "./container";
import { storage } from "./utils/storage";
import { registerCommand } from "./command";
import { refreshTree } from "./refreshTree";
import { isExtensionBusy } from "../extension";
import { workspace, WorkspaceFolder } from "vscode";
import { configuration } from "./utils/configuration";
import { onWsFoldersChange } from "./watcher/fileWatcher";
import { enableConfigWatcher } from "./watcher/configWatcher";
import { IExternalProvider, ITaskExplorerApi, ITestsApi } from "../interface";


export class TeApi implements ITaskExplorerApi
{
    private _tests: boolean;
	private _testsApi: ITestsApi;
	readonly container: TeContainer;


    constructor(container: TeContainer, tests: boolean)
    {
        this._tests = tests;
        this.container = container;

        if (this._tests)
        {
            this._testsApi = {
                fs,
                config: configuration,
                fileCache,
                isBusy: false,
                storage,
                enableConfigWatcher,
                onWsFoldersChange,
                utilities: util,
                treeManager: this.container.treeManager,
                extensionContext: this.container.context,
                wsFolder: (workspace.workspaceFolders as WorkspaceFolder[])[0],
                get explorer()
                {
                    return (this.treeManager.views.taskExplorer?.tree || this.treeManager.views.taskExplorerSideBar?.tree) as TaskTree;
                }
            };
            void setContext(ContextKeys.Tests, true);
            this.setTests(true); // lol, damn istanbul.  cover the initial empty fn
            this.setTests = (isTests) => { tests = isTests; };
            this.isBusy = () => isExtensionBusy() || this._testsApi.isBusy;
        }
        else {
            this._testsApi = {} as unknown as ITestsApi;
        }

        container.context.subscriptions.push(registerCommand("vscode-taskexplorer.getApi", () => this));
    }


    get explorer()
    {
        return this.container.treeManager.views.taskExplorer?.tree;
    }


    get explorerView()
    {
        return this.container.treeManager.views.taskExplorer?.view;
    }


    get log()
    {
        return log;
    }


    get providers()
    {
        return this.container.providers;
    }


    get sidebar()
    {
        return this.container.treeManager.views.taskExplorerSideBar?.tree;
    }


    get sidebarView()
    {
        return this.container.treeManager.views.taskExplorerSideBar?.view;
    }


    get testsApi()
    {
        return this._testsApi;
    }


    isBusy = () => isExtensionBusy();


    isLicensed = () => this.container.licenseManager.isLicensed();


    isTests = () => this._tests;


    setTests = (isTests: boolean) =>
    {
        this._tests = isTests;
    };


    refreshExternalProvider = async(providerName: string) =>
    {
        if (this.providers[providerName])
        {
            await refreshTree(providerName, undefined, "");
        }
    };


    register = async(providerName: string, provider: IExternalProvider, logPad: string) =>
    {
        this.providers[providerName] = provider;
        await refreshTree(providerName, undefined, logPad);
    };


    unregister = async(providerName: string, logPad: string) =>
    {
        delete this.providers[providerName];
        await refreshTree(providerName, undefined, logPad);
    };

}
