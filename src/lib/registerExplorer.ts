/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as log from "./utils/log";
import { views } from "../views";
import { TaskTreeDataProvider } from "../tree/tree";
import { ExtensionContext, workspace, window } from "vscode";
import { IExplorerApi, ITaskExplorerApi } from "../interface";


export function registerExplorer(name: "taskExplorer"|"taskExplorerSideBar", context: ExtensionContext, enabled: boolean, teApi: ITaskExplorerApi, isActivation: boolean)
{
    let view = views.get(name);
    log.write("Register explorer view / tree provider '" + name + "'", 1, "   ");

    if (enabled)
    {   
        /* istanbul ignore else */
        if (!view)
        {
            const treeDataProvider = new TaskTreeDataProvider(name, context),
                  treeView = window.createTreeView(name, { treeDataProvider, showCollapseAll: true });
            views.set(name, treeView);
            view = views.get(name);
            /* istanbul ignore else */
            if (view)
            {
                view.onDidChangeVisibility(e => { treeDataProvider.onVisibilityChanged(e.visible); }, treeDataProvider);
                context.subscriptions.push(view);
                log.write("   Tree data provider registered'" + name + "'", 1, "   ");
            }
            if (name === "taskExplorer")
            {
                teApi.explorer = treeDataProvider;
                teApi.explorer.setEnabled(!isActivation);
                teApi.explorerView = view;
            }
            else // name === "taskExplorerSideBar"
            {
                teApi.sidebar = treeDataProvider;
                teApi.sidebar.setEnabled(!isActivation);
                teApi.sidebarView = view;
            }
        }
    }
    else
    {
        if (view)
        {
            if (name === "taskExplorer" && teApi.explorer)
            {
                teApi.explorer.dispose(context);
                teApi.explorer = undefined;
                teApi.explorerView = undefined;
            }
            /* istanbul ignore else */
            else if (teApi.sidebar) // name === "taskExplorerSideBar"
            {
                teApi.sidebar.dispose(context);
                teApi.sidebar = undefined;
                teApi.sidebarView = undefined;
            }
            views.delete(name);
            view.dispose();
        }
    }

    teApi.testsApi.explorer = teApi.explorer /* istanbul ignore next */|| teApi.sidebar || {} as IExplorerApi;
}
