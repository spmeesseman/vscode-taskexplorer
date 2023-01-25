/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { join } from "path";
import { Uri } from "vscode";
import {
    activate, endRollingCount, executeTeCommand2, exitRollingCount, focusExplorerView, getWsPath,
    needsTreeBuild, overrideNextShowInfoBox, suiteFinished, testControl as tc, verifyTaskCount
} from "../utils/utils";

const antUri: Uri = Uri.file(getWsPath("build.xml"));
const gruntFolderUri: Uri = Uri.file(getWsPath("grunt"));
const pythonUri: Uri = Uri.file(getWsPath("test.py"));
const readmeUri: Uri = Uri.file(getWsPath("README.md"));
const antStartCount = 3;
const gruntStartCount = 7;
const pythonStartCount = 2;


suite("Menu Command Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        await activate(this);
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        suiteFinished(this);
    });


	test("Focus Tree View", async function()
	{
        if (exitRollingCount(this)) return;
        if (needsTreeBuild(true)) {
            await focusExplorerView(this);
        }
        endRollingCount(this);
	});


    test("Disable Task Types", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.taskCount.verify * 2) + (tc.slowTime.config.disableEvent * 2));
        await executeTeCommand2("disableTaskType", [ pythonUri ], tc.waitTime.config.disableEvent);
        await verifyTaskCount("python", 0);
        await executeTeCommand2("disableTaskType", [ antUri ], tc.waitTime.config.disableEvent);
        await verifyTaskCount("ant", 0);
        endRollingCount(this);
    });


    test("Enable Task Types", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.taskCount.verify * 2) + (tc.slowTime.config.enableEvent * 2) + tc.slowTime.config.eventFast);
        await executeTeCommand2("enableTaskType", [ pythonUri ], tc.waitTime.config.enableEvent);
        await verifyTaskCount("python", pythonStartCount);
        await executeTeCommand2("enableTaskType", [ antUri ], tc.waitTime.config.enableEvent);
        await verifyTaskCount("ant", antStartCount);
        overrideNextShowInfoBox(undefined);
        await executeTeCommand2("enableTaskType", [ readmeUri ], tc.waitTime.config.eventFast);
        endRollingCount(this);
    });


    test("Add File to Excludes", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.taskCount.verify * 2) + (tc.slowTime.config.excludesEvent * 2));
        await executeTeCommand2("addToExcludesEx", [ pythonUri ], tc.waitTime.config.excludesEvent);
        await verifyTaskCount("python", pythonStartCount - 1);
        await executeTeCommand2("addToExcludesEx", [ antUri ], tc.waitTime.config.excludesEvent);
        await verifyTaskCount("ant", antStartCount - 2);
        endRollingCount(this);
    });


    test("Remove File from Excludes", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.taskCount.verify * 2) + (tc.slowTime.config.excludesEvent * 2));
        await executeTeCommand2("removeFromExcludes", [ pythonUri ], tc.waitTime.config.excludesEvent);
        await verifyTaskCount("python", pythonStartCount);
        await executeTeCommand2("removeFromExcludes", [ antUri ], tc.waitTime.config.excludesEvent);
        await verifyTaskCount("ant", antStartCount);
        endRollingCount(this);
    });


    test("Add Folder to Excludes", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.taskCount.verify + tc.slowTime.config.excludesEvent);
        await executeTeCommand2("addToExcludesEx", [ gruntFolderUri ], tc.waitTime.config.excludesEvent);
        await verifyTaskCount("grunt", 0);
        endRollingCount(this);
    });


    test("Remove Folder from Excludes", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.taskCount.verify + tc.slowTime.config.excludesEvent);
        await executeTeCommand2("removeFromExcludes", [ gruntFolderUri ], tc.waitTime.config.excludesEvent);
        await verifyTaskCount("grunt", gruntStartCount);
        endRollingCount(this);
    });

});
