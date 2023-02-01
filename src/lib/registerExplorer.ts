/* eslint-disable prefer-arrow/prefer-arrow-functions */

import log from "./log/log";
import { TaskTreeDataProvider } from "../tree/tree";
import { IDictionary, ITaskExplorer, ITaskExplorerApi } from "../interface";
import { ExtensionContext, window, TreeView, TreeItem } from "vscode";

const views: IDictionary<TreeView<TreeItem> | undefined> = {};


export function registerExplorer(name: "taskExplorer"|"taskExplorerSideBar", context: ExtensionContext, enabled: boolean, teApi: ITaskExplorerApi, isActivation: boolean)
{
    let view = views[name];
    const logPad = "   ";
    log.methodStart("register explorer view / tree provider", 1, logPad, false, [[ "name", name ]]);

    if (enabled)
    {
        const treeDataProvider = new TaskTreeDataProvider(name, context), // , teApi.isTests()),
                treeView = window.createTreeView(name, { treeDataProvider, showCollapseAll: true });
        views[name] = treeView;
        view = views[name] as TreeView<TreeItem>;
        view.onDidChangeVisibility(e => { treeDataProvider.onVisibilityChanged(e.visible); }, treeDataProvider);
        context.subscriptions.push(view);
        if (name === "taskExplorer")
        {
            teApi.explorer = treeDataProvider;
            teApi.explorer.setEnabled(!isActivation, logPad + "   ");
            teApi.explorerView = view;
        }
        else // name === "taskExplorerSideBar"
        {
            teApi.sidebar = treeDataProvider;
            teApi.sidebar.setEnabled(!isActivation, logPad + "   ");
            teApi.sidebarView = view;
        }
        log.write("   tree data provider '" + name + "' registered", 1, logPad);
    }
    else
    {
        if (view)
        {
            view.dispose();
            if (name === "taskExplorer")
            {
                const explorer = teApi.explorer as ITaskExplorer;
                explorer.setEnabled(false, logPad + "   ");
                explorer.dispose(context);
                teApi.explorer = undefined;
                teApi.explorerView = undefined;
            }
            else
            {
                const sidebar = teApi.sidebar as ITaskExplorer;
                sidebar.setEnabled(false, logPad + "   ");
                sidebar.dispose(context);
                teApi.sidebar = undefined;
                teApi.sidebarView = undefined;
            }
            views[name] = undefined;
            view.dispose();
            log.write("   tree data provider '" + name + "' un-registered", 1, "   ");
        }
    }

    teApi.testsApi.explorer = (teApi.explorer || teApi.sidebar) as ITaskExplorer;
    log.methodDone("register explorer view / tree provider", 1, logPad);
}
