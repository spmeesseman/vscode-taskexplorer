/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { refreshTree } from "../../lib/refreshTree";
import { ITaskExplorer, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, executeTeCommand, executeTeCommand2, setExplorer, sleep, suiteFinished, testControl as tc, waitForTeIdle
} from "../utils/utils";

let teApi: ITaskExplorerApi;


suite("API and Initialization", () =>
{
    suiteSetup(async function()
    {
        ({ teApi } = await activate(this));
    });


    suiteTeardown(async function()
    {
        suiteFinished(this);
    });


    test("Show/Hide Output Window", async function()
    {
        this.slow((tc.slowTime.commandShowOutput * 3) + 300);
        await executeTeCommand2("showOutput", [ true ], tc.waitTime.command);
        await sleep(75);
        await executeTeCommand2("showOutput", [ false ], tc.waitTime.command);
        await sleep(75);
        await executeTeCommand2("showOutput", [ tc.log.enabled && tc.log.output ], tc.waitTime.command);
    });


    test("Enable SideBar View", async function()
    {
        this.slow(tc.slowTime.explorerViewStartup + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableSideBar", true, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.explorerViewStartup);
    });


    test("Refresh Trees", async function()
    {
        this.slow((tc.slowTime.refreshCommandNoChanges * 2) + tc.slowTime.config.enableEvent + tc.slowTime.command);
        await refreshTree(teApi, undefined, undefined, "");
        await waitForTeIdle(tc.waitTime.command);
        // await refreshTree(teApi, false, undefined, ""); // 'false' will not rebuild file cache
        await refreshTree(teApi, undefined, undefined, ""); // 'false' will not rebuild file cache
        await waitForTeIdle(tc.waitTime.refreshCommand);
    });


    test("Disable Explorer Views", async function()
    {
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
    });


    test("Refresh SideBar Tree", async function()
    {
        this.slow(tc.slowTime.refreshCommand);
        await refreshTree(teApi, undefined, undefined, "");
        await waitForTeIdle(tc.waitTime.refreshCommand);
    });


    test("Disable SideBar View", async function()
    {
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        teApi.sidebar?.setEnabled(false, ""); // cover getChildren new InitScripts() || new NoScripts()
        await teApi.sidebar?.getChildren(); // cover getChildren new InitScripts() || new NoScripts()
        await executeSettingsUpdate("enableSideBar", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
    });


    test("Re-enable Explorer View", async function()
    {
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", true, tc.waitTime.config.enableEvent);
        setExplorer(teApi.explorer as ITaskExplorer);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
    });


    test("Refresh Explorer Tree", async function()
    {
        this.slow(tc.slowTime.refreshCommand + tc.slowTime.refreshCommand);
        await refreshTree(teApi, undefined, undefined, "");
    });

});
