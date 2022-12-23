/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as util from "../../common/utils";
import TaskFolder from "../../tree/folder";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { configuration } from "../../common/configuration";
import constants from "../../common/constants";
import { storage } from "../../common/storage";
import TaskItem from "../../tree/item";
import { TreeItem, TreeItemCollapsibleState } from "vscode";
import {
    activate, executeTeCommand, getTreeTasks, isReady, overrideNextShowInfoBox, overrideNextShowInputBox, refresh, verifyTaskCount
} from "../helper";


let teApi: TaskExplorerApi;
let favTasks: string[];
let lastTasks: string[];
let ant: TaskItem[];
let workspace: boolean;


suite("Workspace / VSCode Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
        workspace = configuration.get<boolean>("showHiddenWsTasks");
    });


    suiteTeardown(async function()
    {
        await configuration.updateWs("showHiddenWsTasks", workspace);
    });


    test("Show VSCode Tasks Marked Hidden", async function()
    {
        await configuration.updateWs("showHiddenWsTasks", true);
        await verifyTaskCount("Workspace", 10);
    });


    test("Hide VSCode Tasks Marked Hidden", async function()
    {
        await configuration.updateWs("showHiddenWsTasks", false);
        await verifyTaskCount("Workspace", 9);
    });


    test("Disable Workspace Tasks", async function()
    {
        await configuration.updateWs("enabledTasks.workspace", false);
        await verifyTaskCount("Workspace", 0);
    });


    test("HRe-enable Workspace Tasks", async function()
    {
        await configuration.updateWs("enabledTasks.workspace", true);
        await verifyTaskCount("Workspace", 9);
    });


    test("Re-show VSCode Tasks Marked Hidden", async function()
    {
        await configuration.updateWs("showHiddenWsTasks", true);
        await verifyTaskCount("Workspace", 10);
    });

});
