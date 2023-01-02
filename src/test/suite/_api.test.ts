/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { configuration } from "../../lib/utils/configuration";
import { IExplorerApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, executeTeCommand, isReady, testsControl } from "../helper";
import { refreshTree } from "../../lib/refreshTree";
import { getInstallPath, isBoolean, isObject, isString } from "../../lib/utils/utils";
import { enableConfigWatcher } from "../../lib/configWatcher";

let teApi: ITaskExplorerApi;
let explorer: IExplorerApi;


suite("API Init and Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
        if (!teApi.explorer) {
            assert.fail("        ✘ Explorer instance does not exist");
        }
        explorer = teApi.explorer;
        await executeSettingsUpdate("debug", true);
    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate("debug", testsControl.writeToOutput || testsControl.writeToConsole);
        enableConfigWatcher(true); // in case misc test fails after setting to `false`.
    });


    test("Hide / Show Log", async function()
    {
        await executeTeCommand("showOutput", 10, 50, false);
        await executeTeCommand("showOutput", 10, 50, true);
        await executeTeCommand("showOutput", 10, 50, testsControl.writeToOutput);
    });


    test("Misc Coverage", async function()
    {
        assert(!explorer.isVisible());
        assert(getInstallPath());
        //
        // Multi-part settingsupdates (behaviordiffers when value is an object)
        //
        enableConfigWatcher(false);
        let v = configuration.get<any>("pathToPrograms.ant");
        assert(isString(v));
        v = configuration.get<any>("pathToPrograms");
        assert(isObject(v));
        let cv = v.ant;
        await configuration.updateWs("pathToPrograms.ant", "/my/path/to/ant");
        v = configuration.get<any>("pathToPrograms");
        assert(isObject(v) && v.ant === "/my/path/to/ant");
        await configuration.updateWs("pathToPrograms.ant", cv);
        v = configuration.get<any>("pathToPrograms");
        assert(isObject(v) && v.ant === cv);
        cv = configuration.get<any>("visual.disableAnimatedIcons");
        assert(isBoolean(cv));
        await configuration.updateWs("visual.disableAnimatedIcons", false);
        v = configuration.get<any>("visual.disableAnimatedIcons");
        assert(isBoolean(v) && v === false);
        await configuration.updateWs("visual.disableAnimatedIcons", cv);
        v = configuration.get<any>("visual.disableAnimatedIcons");
        assert(isBoolean(v) && v === cv);
        enableConfigWatcher(true);
    });


    test("Enable SideBar View", async function()
    {
        await executeSettingsUpdate("enableSideBar", true);
    });


    test("Refresh for SideBar Coverage", async function()
    {
        await refreshTree(teApi);
    });


    test("Disable Explorer Views", async function()
    {
        await executeSettingsUpdate("enableExplorerView", false);
    });


    test("Disable SideBar View", async function()
    {
        await executeSettingsUpdate("enableSideBar", false);
    });


    test("Re-enable Explorer View", async function()
    {
        await executeSettingsUpdate("enableExplorerView", true);
    });


    test("Refresh", async function()
    {
        await executeTeCommand("refresh");
    });

});
