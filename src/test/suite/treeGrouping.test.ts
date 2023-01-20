/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import { ITaskExplorerApi, IFilesystemApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, exitRollingCount, focusExplorerView, needsTreeBuild,
    suiteFinished, testControl as tc
} from "../utils/utils";


let successCount = -1;


suite("Tree Grouping Tests", () =>
{

    suiteSetup(async function()
    {
        await activate(this);
        ++successCount;
    });


    suiteTeardown(async function()
    {
        if (successCount < 10) {
            await executeSettingsUpdate("groupMaxLevel", 5, tc.waitTime.config.groupingEvent);
            await executeSettingsUpdate("groupSeparator", "-", tc.waitTime.config.groupingEvent);
            await executeSettingsUpdate("groupWithSeparator", true, tc.waitTime.config.groupingEvent);
            await executeSettingsUpdate("groupStripTaskLabel", true, tc.waitTime.config.groupingEvent);
        }
        suiteFinished(this);
    });


	test("Focus Tree View", async function()
	{
        if (exitRollingCount(0, successCount)) return;
        if (needsTreeBuild()) {
            await focusExplorerView(this);
        }
        ++successCount;
	});


    test("Disable Grouping", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupWithSeparator", false, tc.waitTime.config.groupingEvent);
        ++successCount;
    });


    test("Enable Grouping Max Level 2", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupWithSeparator", true, tc.waitTime.config.groupingEvent);
        ++successCount;
    });


    test("Change Grouping Max Level 2", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupMaxLevel", 2, tc.waitTime.config.groupingEvent);
        ++successCount;
    });


    test("Change Grouping Max Level 4", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupMaxLevel", 4, tc.waitTime.config.groupingEvent);
        ++successCount;
    });


    test("Disable Strip Task Label", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupStripTaskLabel", false, tc.waitTime.config.groupingEvent);
        ++successCount;
    });


    test("Change Grouping Max Level 3", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupMaxLevel", 3, tc.waitTime.config.groupingEvent);
        ++successCount;
    });


    test("Change Grouping Max Level 1", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupMaxLevel", 1, tc.waitTime.config.groupingEvent);
        ++successCount;
    });


    test("Enable Strip Task Label", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupStripTaskLabel", true, tc.waitTime.config.groupingEvent);
        ++successCount;
    });


    test("Change Grouping Separator", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupSeparator", "_", tc.waitTime.config.groupingEvent);
        ++successCount;
    });


    test("Change Grouping Max Level 3", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupMaxLevel", 3, tc.waitTime.config.groupingEvent);
        ++successCount;
    });


    test("Change Grouping Max Level 4", async function()
    {
        if (exitRollingCount(11, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupMaxLevel", 3, tc.waitTime.config.groupingEvent);
        ++successCount;
    });


    test("Reset Grouping Separator", async function()
    {
        if (exitRollingCount(12, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupSeparator", "-", tc.waitTime.config.groupingEvent);
        ++successCount;
    });


    test("Reset Grouping Max Level 5", async function()
    {
        if (exitRollingCount(13, successCount)) return;
        this.slow(tc.slowTime.config.groupingEvent);
        await executeSettingsUpdate("groupMaxLevel", 5, tc.waitTime.config.groupingEvent);
        ++successCount;
    });

});
