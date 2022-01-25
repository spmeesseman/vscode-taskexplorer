/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as vscode from "vscode";
import constants from "../../common/constants";
import { commands, tasks } from "vscode";
import { TaskExplorerApi } from "../../interface/taskExplorerApi";
import { activate, initSettings, isReady, sleep } from "../helper";


let teApi: TaskExplorerApi;


suite("API Init and Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "Setup failed");
    });


    test("Show log", async function()
    {
        await vscode.commands.executeCommand("taskExplorer.showOutput", false);
        await vscode.commands.executeCommand("taskExplorer.showOutput", true);
    });


    test("Cover pre-init cases", async function()
    {
        await initSettings(false);
        teApi.explorerProvider?.showSpecialTasks(true);
        teApi.explorerProvider?.showSpecialTasks(true, true);
        await initSettings();
        await teApi.explorerProvider?.refresh("tests");
        await commands.executeCommand("taskExplorer.refresh");
    });


    test("Clear Special Folders", async function()
    {
        await commands.executeCommand("taskExplorer.clearSpecialFolder", constants.LAST_TASKS_LABEL);
        await commands.executeCommand("taskExplorer.clearSpecialFolder", constants.FAV_TASKS_LABEL);
    });

});
