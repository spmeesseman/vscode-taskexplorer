/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as log from "../common/log";
import { views } from "../views";
import { TaskTreeDataProvider } from "../tree/tree";
import { ExtensionContext, workspace, window } from "vscode";


export function registerExplorer(name: string, context: ExtensionContext, enabled?: boolean): TaskTreeDataProvider | undefined
{
    log.write("Register explorer view / tree provider '" + name + "'", 1, "   ");

    /* istanbul ignore else */
    if (enabled !== false)
    {   /* istanbul ignore else */
        if (workspace.workspaceFolders)
        {
            const treeDataProvider = new TaskTreeDataProvider(name, context);
            const treeView = window.createTreeView(name, { treeDataProvider, showCollapseAll: true });
            views.set(name, treeView);
            const view = views.get(name);
            /* istanbul ignore else */
            if (view) {
                view.onDidChangeVisibility(async _e => { treeDataProvider.onVisibilityChanged(_e.visible); }, treeDataProvider);
                context.subscriptions.push(view);
                log.write("   Tree data provider registered'" + name + "'", 1, "   ");
            }
            return treeDataProvider;
        }
        else {
            log.write("✘ No workspace folders!!!", 1, "   ");
        }
    }
}
