import { focusExplorerView } from "./commandUtils";
import { endRollingCount, exitRollingCount, needsTreeBuild } from "./utils";
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

