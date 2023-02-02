/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { refreshTree } from "../../lib/refreshTree";
import { ITaskExplorer, ITaskExplorerApi, ITestsApi } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand2, focusFileExplorer, focusSidebarView } from "../utils/commandUtils";
import {
    activate, closeEditors, endRollingCount, exitRollingCount, setExplorer, sleep, suiteFinished, testControl as tc, waitForTeIdle
} from "../utils/utils";


let teApi: ITaskExplorerApi;
let testsApi: ITestsApi;
let favoritesExpanded: boolean;
let lastTasksExpanded: boolean;


suite("Initialization", () =>
{
    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, testsApi } = await activate(this));
        favoritesExpanded = teApi.config.get<boolean>("specialFolders.expanded.favorites");
        lastTasksExpanded = teApi.config.get<boolean>("specialFolders.expanded.lastTasks");
        await executeSettingsUpdate("specialFolders.expanded.favorites", false);
        await executeSettingsUpdate("specialFolders.expanded.lastTasks", false);
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await executeSettingsUpdate("specialFolders.expanded.favorites", favoritesExpanded);
        await executeSettingsUpdate("specialFolders.expanded.lastTasks", lastTasksExpanded);
        await closeEditors();
        suiteFinished(this);
    });


    test("Show/Hide Output Window", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.commands.showOutput * 3) + 300);
        await executeTeCommand2("showOutput", [ true ]);
        await sleep(75);
        await executeTeCommand2("showOutput", [ false ]);
        await sleep(75);
        await executeTeCommand2("showOutput", [ tc.log.enabled && tc.log.output ]);
        endRollingCount(this);
    });


    test("Focus SideBar Tree", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refresh);
        await focusSidebarView();
        await waitForTeIdle(tc.waitTime.refreshCommand);
        testsApi.enableExplorer("taskExplorerSideBar", true, ""); // cover edge if
        endRollingCount(this);
    });


    test("Disable Explorer Views", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        testsApi.enableExplorer("taskExplorer", false, "");
        endRollingCount(this);
    });


    test("Refresh SideBar Tree", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refresh);
        await refreshTree(teApi, undefined, undefined, "");
        await waitForTeIdle(tc.waitTime.refreshCommand);
        endRollingCount(this);
    });


    test("Re-enable Explorer View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", true, tc.waitTime.config.enableEvent);
        setExplorer(teApi.explorer as ITaskExplorer);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        testsApi.enableExplorer("taskExplorer", true, ""); // cover edge if
        endRollingCount(this);
    });


    test("Refresh Trees (Both Views Enabled)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refreshNoChanges);
        await refreshTree(teApi, undefined, undefined, "");
        endRollingCount(this);
    });


    test("Disable SideBar View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        teApi.sidebar?.setEnabled(false, "");
        await teApi.sidebar?.refresh(undefined, undefined, ""); // cover getChildren new InitScripts() || new NoScripts()
        await executeSettingsUpdate("enableSideBar", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        testsApi.enableExplorer("taskExplorerSideBar", false, ""); // cover edge if
        endRollingCount(this);
    });


    test("Focus File Explorer View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refreshNoChanges);
        await focusFileExplorer();
        endRollingCount(this);
    });

});
