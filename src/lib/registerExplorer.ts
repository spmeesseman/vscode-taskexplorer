/* eslint-disable prefer-arrow/prefer-arrow-functions */

import log from "./log/log";
import { TaskTreeDataProvider } from "../tree/tree";
import { ITaskExplorer, ITaskExplorerApi } from "../interface";
import { ExtensionContext, window, TreeView, TreeItem } from "vscode";

const views: { [taskType: string]: TreeView<TreeItem> | undefined } = {};


export function registerExplorer(name: "taskExplorer"|"taskExplorerSideBar", context: ExtensionContext, enabled: boolean, teApi: ITaskExplorerApi, isActivation: boolean)
{
    let view = views[name];
    log.write("Register explorer view / tree provider '" + name + "'", 1, "   ");

    if (enabled)
    {
        /* istanbul ignore else */
        if (!view)
        {
            const treeDataProvider = new TaskTreeDataProvider(name, context, teApi.isTests()),
                  treeView = window.createTreeView(name, { treeDataProvider, showCollapseAll: true });
            views[name] = treeView;
            view = views[name];
            /* istanbul ignore else */
            if (view)
            {
                view.onDidChangeVisibility(e => { treeDataProvider.onVisibilityChanged(e.visible); }, treeDataProvider);
                context.subscriptions.push(view);
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
            log.write("   Tree data provider '" + name + "' registered", 1, "   ");
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
            else /* istanbul ignore else */if (teApi.sidebar) // name === "taskExplorerSideBar"
            {
                teApi.sidebar.dispose(context);
                teApi.sidebar = undefined;
                teApi.sidebarView = undefined;
            }
            views[name] = undefined;
            view.dispose();
            log.write("   Tree data provider '" + name + "' un-registered", 1, "   ");
        }
    }

    /* istanbul ignore else */
    if (teApi.testsApi) {
        teApi.testsApi.explorer = teApi.explorer /* istanbul ignore next */|| teApi.sidebar || {} as ITaskExplorer;
    }
}
