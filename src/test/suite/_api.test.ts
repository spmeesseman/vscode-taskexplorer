/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as vscode from "vscode";
import constants from "../../common/constants";
import { commands, tasks } from "vscode";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeTeCommand, initSettings, isReady, sleep } from "../helper";


let teApi: TaskExplorerApi;


suite("API Init and Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
    });


    test("Show log", async function()
    {
        await vscode.commands.executeCommand("taskExplorer.showOutput", false);
        await vscode.commands.executeCommand("taskExplorer.showOutput", true);
    });


    test("Cover pre-init cases", async function()
    {
        await initSettings();
        await teApi.explorer?.refresh("tests");
        await executeTeCommand("refresh", 100);
    });

});
