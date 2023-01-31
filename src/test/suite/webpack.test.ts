/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { expect } from "chai";
import { WebpackTaskProvider } from "../../providers/webpack";
import { executeSettingsUpdate, focusExplorerView } from "../utils/commandUtils";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, endRollingCount, exitRollingCount, getWsPath, needsTreeBuild,
    suiteFinished, testControl as tc, testInvDocPositions, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const testsName = "webpack";
const startTaskCount = tc.isMultiRootWorkspace ? 6 : 0;
const dirName = getWsPath("tasks_test_");
const fileUri = Uri.file(path.join(dirName, "webpack.config.js"));
const fileUri2 = Uri.file(path.join(getWsPath("."), "webpack.config.test.js"));

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: WebpackTaskProvider;


suite("Webpack Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, fsApi } = await activate(this));
        provider = teApi.providers[testsName] as WebpackTaskProvider;
        await fsApi.createDir(dirName);
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteDir(dirName);
        suiteFinished(this);
    });


	test("Enable (Off by Default)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, tc.waitTime.config.enableEvent);
        endRollingCount(this);
    });


	test("Focus Tree View", async function()
	{
        if (exitRollingCount(this)) return;
        if (needsTreeBuild()) {
            await focusExplorerView(this);
        }
        endRollingCount(this);
	});


    test("Start", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.taskCount.verify);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Disable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(fileUri2.fsPath,
`
module.exports = (env) =>
{
	const wpConfig = {
		target: "node",
		mode: "production",
		resolve: {extensions: ['.ts', '.js'] }
	};
	return wpConfig;
}
`);
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 6);
        endRollingCount(this);
    });


    test("Create File (w/ Folder)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(fileUri.fsPath,
`
module.exports = (env) =>
{
	const wpConfig = {
		target: "node",
		mode: "production",
		resolve: {extensions: ['.ts', '.js'] }
	};
	return wpConfig;
}
`);
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 12);
        endRollingCount(this);
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
        testInvDocPositions(provider);
        const docText = await fsApi.readFileAsync(fileUri.fsPath);
        expect(provider.getDocumentPosition("stage", docText)).to.be.equal(0);
        endRollingCount(this);
    });


    test("Delete File (in Folder)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteFolderEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        await verifyTaskCount(testsName, startTaskCount + 6);
        endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri2.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Re-create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(fileUri.fsPath,
`
module.exports = (env) =>
{
	const wpConfig = {
		target: "node",
		mode: "production",
		resolve: {extensions: ['.ts', '.js'] }
	};
	return wpConfig;
}
`);
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 6);
        endRollingCount(this);
});


    test("Delete File (w/ Folder)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Disable (Default is OFF)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.disableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, tc.waitTime.config.disableEvent);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });

});
