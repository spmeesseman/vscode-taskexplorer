import { focusExplorerView, focusSidebarView } from "./commandUtils";
import { endRollingCount, exitRollingCount, needsTreeBuild, testControl } from "./utils";
import {  refresh } from "./treeUtils";


export const startupBuildTree = async(instance: Mocha.Context) =>
{
    if (exitRollingCount(instance)) return;
    if (needsTreeBuild()) {
        await refresh(instance);
    }
    endRollingCount(instance);
};


export const startupFocus = async(instance: Mocha.Context, cb?: () => Promise<void>) =>
{
    if (exitRollingCount(instance)) return;
    if (needsTreeBuild(true)) {
        await focusExplorerView(instance);
    }
    if (cb) {
        await cb();
    }
    endRollingCount(instance);
};


export const sidebarFocus = async(instance: Mocha.Context) =>
{
    if (exitRollingCount(instance)) return;
    instance.timeout(testControl.slowTime.focusCommand + testControl.slowTime.refreshCommand);
    await focusSidebarView();
    endRollingCount(instance);
};

