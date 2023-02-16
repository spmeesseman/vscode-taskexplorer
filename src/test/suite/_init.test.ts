/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { expect } from "chai";
import { TeWrapper } from "../../lib/wrapper";
import {
    executeSettingsUpdate, executeTeCommand2, focusFileExplorer, focusSidebarView
} from "../utils/commandUtils";
import {
    activate, closeEditors, endRollingCount, exitRollingCount, sleep, suiteFinished,
    testControl as tc, waitForTeIdle
} from "../utils/utils";


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


    test("Focus SideBar View Tree", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refresh);
        await focusSidebarView();
        await waitForTeIdle(tc.waitTime.refreshCommand);
        endRollingCount(this);
    });


    test("Disable Explorer Views", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        expect(teWrapper.sidebar).to.not.be.undefined;
        expect(teWrapper.sidebarView).to.not.be.undefined;
        expect(teWrapper.explorer).to.not.be.undefined;
        expect(teWrapper.explorerView).to.not.be.undefined;
        expect(teWrapper.views.taskExplorer.enabled).to.be.equal(false);
        expect(teWrapper.views.taskExplorerSideBar.enabled).to.be.equal(true);
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


    test("Disable SideBar View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableSideBar", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        expect(teWrapper.sidebar).to.not.be.undefined;
        expect(teWrapper.sidebarView).to.not.be.undefined;
        expect(teWrapper.explorer).to.not.be.undefined;
        expect(teWrapper.explorerView).to.not.be.undefined;
        expect(teWrapper.views.taskExplorer.enabled).to.be.equal(false);
        expect(teWrapper.views.taskExplorerSideBar.enabled).to.be.equal(false);
        endRollingCount(this);
    });


    test("Re-enable SideBar View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableSideBar", true, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        expect(teWrapper.sidebar).to.not.be.undefined;
        expect(teWrapper.sidebarView).to.not.be.undefined;
        expect(teWrapper.explorer).to.not.be.undefined;
        expect(teWrapper.explorerView).to.not.be.undefined;
        expect(teWrapper.views.taskExplorer.enabled).to.be.equal(false);
        expect(teWrapper.views.taskExplorerSideBar.enabled).to.be.equal(true);
        endRollingCount(this);
    });



    test("Re-enable Explorer View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", true, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        expect(teWrapper.sidebar).to.not.be.undefined;
        expect(teWrapper.sidebarView).to.not.be.undefined;
        expect(teWrapper.explorer).to.not.be.undefined;
        expect(teWrapper.explorerView).to.not.be.undefined;
        expect(teWrapper.views.taskExplorer.enabled).to.be.equal(true);
        expect(teWrapper.views.taskExplorerSideBar.enabled).to.be.equal(true);
        endRollingCount(this);
    });


    test("Refresh Trees (Both Views Enabled)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refreshNoChanges * 2);
        await executeTeCommand2("refresh", [ undefined, false, "" ]);
        endRollingCount(this);
    });


    test("Disable SideBar View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableSideBar", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        expect(teWrapper.sidebar).to.not.be.undefined;
        expect(teWrapper.sidebarView).to.not.be.undefined;
        expect(teWrapper.explorer).to.not.be.undefined;
        expect(teWrapper.explorerView).to.not.be.undefined;
        expect(teWrapper.views.taskExplorer.enabled).to.be.equal(true);
        expect(teWrapper.views.taskExplorerSideBar.enabled).to.be.equal(false);
        endRollingCount(this);
    });


    test("Focus FileExplorer View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews);
        await focusFileExplorer();
        expect(teWrapper.views.taskExplorer.visible).to.be.equal(false);
        endRollingCount(this);
    });

});
