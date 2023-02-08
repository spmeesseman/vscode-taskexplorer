/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { expect } from "chai";
import { refreshTree } from "../../lib/refreshTree";
import { ITaskTree, ITaskExplorerApi, ITestsApi } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand2, focusFileExplorer, focusSidebarView } from "../utils/commandUtils";
import {
    activate, closeEditors, endRollingCount, exitRollingCount, setExplorer, sleep, suiteFinished, testControl as tc, waitForTeIdle
} from "../utils/utils";


let teApi: ITaskExplorerApi;
let testsApi: ITestsApi;


suite("Initialization", () =>
{
    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, testsApi } = await activate(this));
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await closeEditors();
        suiteFinished(this);
    });


    test("Show/Hide Output Window", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.commands.showOutput * 3) + 100);
        await executeTeCommand2("showOutput", [ true ]);
        await sleep(25);
        await executeTeCommand2("showOutput", [ false ]);
        await sleep(25);
        await executeTeCommand2("showOutput", [ tc.log.enabled && tc.log.output ]);
        endRollingCount(this);
    });


    test("Focus SideBar Tree", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refresh);
        await focusSidebarView();
        await waitForTeIdle(tc.waitTime.refreshCommand);
        await testsApi.treeManager.enableTaskTree("taskExplorerSideBar", true, ""); // cover edge if
        endRollingCount(this);
    });


    test("Disable Explorer Views", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        await testsApi.treeManager.enableTaskTree("taskExplorer", false, "");
        expect(teApi.sidebar).to.not.be.undefined;
        expect(teApi.sidebarView).to.not.be.undefined;
        expect(teApi.explorer).to.be.undefined;
        expect(teApi.explorerView).to.be.undefined;
        expect(teApi.testsApi.explorer).to.not.be.undefined;
        endRollingCount(this);
    });


    test("Refresh SideBar Tree", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refresh);
        await refreshTree(undefined, undefined, "");
        await waitForTeIdle(tc.waitTime.refreshCommand);
        endRollingCount(this);
    });


    test("Re-enable Explorer View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", true, tc.waitTime.config.enableEvent);
        setExplorer(teApi.explorer as ITaskTree);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        await testsApi.treeManager.enableTaskTree("taskExplorer", true, ""); // cover edge if
        expect(teApi.sidebar).to.not.be.undefined;
        expect(teApi.sidebarView).to.not.be.undefined;
        expect(teApi.explorer).to.be.not.undefined;
        expect(teApi.explorerView).to.not.be.undefined;
        expect(teApi.testsApi.explorer).to.not.be.undefined;
        endRollingCount(this);
    });


    test("Refresh Trees (Both Views Enabled)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refreshNoChanges * 2);
        await refreshTree(undefined, undefined, "");
        endRollingCount(this);
    });


    test("Disable SideBar View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        // teApi.sidebar?.setEnabled(false, "");
        testsApi.treeManager.refresh(undefined, undefined, ""); // cover getChildren new InitScripts() || new NoScripts()
        await executeSettingsUpdate("enableSideBar", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        await testsApi.treeManager.enableTaskTree("taskExplorerSideBar", false, ""); // cover edge if
        expect(teApi.sidebar).to.be.undefined;
        expect(teApi.sidebarView).to.be.undefined;
        expect(teApi.explorer).to.be.not.undefined;
        expect(teApi.explorerView).to.not.be.undefined;
        expect(teApi.testsApi.explorer).to.not.be.undefined;
        endRollingCount(this);
    });


    test("Focus FileExplorer View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews);
        await focusFileExplorer();
        endRollingCount(this);
    });

});
