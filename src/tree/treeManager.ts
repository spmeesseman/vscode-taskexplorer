/* eslint-disable prefer-arrow/prefer-arrow-functions */

import log from "./log/log";
import { isObject } from "./utils/utils";
import { TaskTreeDataProvider } from "../tree/tree";
import { ExtensionContext, window, TreeView, TreeItem } from "vscode";
import { IDictionary, ITaskExplorer, ITaskExplorerApi } from "../interface";

let teApi: ITaskExplorerApi;
let extensionContext: ExtensionContext;
const views: IDictionary<TreeView<TreeItem>|undefined> = {
    taskExplorer: undefined,
    taskExplorerSideBar: undefined
};


export const registerTreeProviders = (context: ExtensionContext, api: ITaskExplorerApi) =>
{
    log.methodStart("register explorer tree providers", 1, "   ");
    teApi = api;
    extensionContext = context;
    createExplorer("taskExplorer", false, "      ");
    createExplorer("taskExplorerSideBar", false,  "      ");
    log.methodDone("register explorer tree providers", 1, "   ");
};


export const enableExplorer = (name: "taskExplorer"|"taskExplorerSideBar", enable: boolean, logPad: string) =>
{
    log.methodStart("enable explorer view / tree provider", 1, logPad, false, [[ "name", name ], [ "enable", enable ]]);
    if (enable) {
        createExplorer(name, enable, logPad + "   ");
    }
    else {
        disposeExplorer(name, logPad + "   ");
    }
    log.methodDone("enable explorer view / tree provider", 1, logPad);
};


const createExplorer = (name: "taskExplorer"|"taskExplorerSideBar", enable: boolean, logPad: string) =>
{
    let view = views[name];
    log.methodStart("create explorer view / tree provider", 1, logPad);
    if (!view)
    {
        const treeDataProvider = new TaskTreeDataProvider(name, extensionContext), // , teApi.isTests()),
              treeView = window.createTreeView(name, { treeDataProvider, showCollapseAll: true });
        views[name] = treeView;
        view = views[name] as TreeView<TreeItem>;
        view.onDidChangeVisibility(e => { treeDataProvider.onVisibilityChanged(e.visible); }, treeDataProvider);
        extensionContext.subscriptions.push(view);
        if (name === "taskExplorer")
        {
            teApi.testsApi.explorer = teApi.explorer = treeDataProvider;
            teApi.explorer.setEnabled(enable, logPad + "   ");
            teApi.explorerView = view;
        }
        else // name === "taskExplorerSideBar"
        {
            teApi.testsApi.explorer = teApi.sidebar = treeDataProvider;
            teApi.sidebar.setEnabled(enable, logPad + "   ");
            teApi.sidebarView = view;
        }
        log.write("   tree data provider '" + name + "' registered", 1, logPad);
    }
    log.methodDone("create explorer view / tree provider", 1, logPad);
};


const disposeExplorer = (name: "taskExplorer"|"taskExplorerSideBar", logPad: string) =>
{
    log.methodStart("dispose explorer view / tree provider", 1, logPad, false, [[ "name", name ]]);
    const view = views[name];
    if (view)
    {
        if (name === "taskExplorer")
        {
            const explorer = teApi.explorer as ITaskExplorer;
            explorer.setEnabled(false, logPad + "   ");
            explorer.dispose();
            teApi.explorer = undefined;
            teApi.explorerView = undefined;
        }
        else
        {
            const sidebar = teApi.sidebar as ITaskExplorer;
            sidebar.setEnabled(false, logPad + "   ");
            sidebar.dispose();
            teApi.sidebar = undefined;
            teApi.sidebarView = undefined;
        }

        view.dispose();
        views[name] = undefined;
        teApi.testsApi.explorer = (teApi.explorer || teApi.sidebar) as ITaskExplorer;
        extensionContext.subscriptions.splice(extensionContext.subscriptions.findIndex(s => isObject(s) && Object.hasOwnProperty.call(s, name)), 1);
        log.write("   tree data provider '" + name + "' un-registered", 1, "   ");
    }
    log.methodDone("dispose explorer view / tree provider", 1, logPad);
};
