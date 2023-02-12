/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { expect } from "chai";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand2, focusFileExplorer, focusSidebarView } from "../utils/commandUtils";
import {
    activate, closeEditors, endRollingCount, exitRollingCount, setExplorer, sleep, suiteFinished, testControl as tc, waitForTeIdle
} from "../utils/utils";
import { TeWrapper } from "../../lib/wrapper";
import { TaskTree } from "../../tree/tree";
import { Commands, executeCommand } from "../../lib/command";


let teWrapper: TeWrapper;


suite("Initialization", () =>
{
    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teWrapper } = await activate(this));
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


    test("Focus Sidebar Views - Tree", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refresh);
        await focusSidebarView();
        await waitForTeIdle(tc.waitTime.refreshCommand);
        teWrapper.treeManager.enableTaskTree("taskExplorerSideBar", true, ""); // cover edge if
        endRollingCount(this);
    });


    test("Disable Explorer Views", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        teWrapper.treeManager.enableTaskTree("taskExplorer", false, "");
        expect(teWrapper.sidebar).to.not.be.undefined;
        expect(teWrapper.sidebarView).to.not.be.undefined;
        expect(teWrapper.explorer).to.be.undefined;
        expect(teWrapper.explorerView).to.be.undefined;
        endRollingCount(this);
    });


    test("Focus Sidebar Views - Task Usage", async function()
    {
        if (exitRollingCount(this)) return;
        await executeCommand(Commands.FocusTaskUsageView);
        endRollingCount(this);
    });


    test("Focus Sidebar View - Task Counts", async function()
    {
        if (exitRollingCount(this)) return;
        await executeCommand(Commands.FocusTaskCountView);
        endRollingCount(this);
    });


    test("Refresh SideBar Tree", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refresh);
        await executeTeCommand2("refresh", [ undefined, undefined, "" ]);
        await waitForTeIdle(tc.waitTime.refreshCommand);
        endRollingCount(this);
    });


    test("Re-enable Explorer View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", true, tc.waitTime.config.enableEvent);
        setExplorer(teWrapper.explorer as TaskTree);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        await teWrapper.treeManager.enableTaskTree("taskExplorer", true, ""); // cover edge if
        expect(teWrapper.sidebar).to.not.be.undefined;
        expect(teWrapper.sidebarView).to.not.be.undefined;
        expect(teWrapper.explorer).to.be.not.undefined;
        expect(teWrapper.explorerView).to.not.be.undefined;
        endRollingCount(this);
    });


    test("Refresh Trees (Both Views Enabled)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refreshNoChanges * 2);
        await executeTeCommand2("refresh", [ undefined, undefined, "" ]);
        endRollingCount(this);
    });


    test("Disable SideBar View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        // teApi.sidebar?.setEnabled(false, "");
        teWrapper.treeManager.refresh(undefined, undefined, ""); // cover getChildren new InitScripts() || new NoScripts()
        await executeSettingsUpdate("enableSideBar", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        await teWrapper.treeManager.enableTaskTree("taskExplorerSideBar", false, ""); // cover edge if
        expect(teWrapper.sidebar).to.be.undefined;
        expect(teWrapper.sidebarView).to.be.undefined;
        expect(teWrapper.explorer).to.be.not.undefined;
        expect(teWrapper.explorerView).to.not.be.undefined;
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
