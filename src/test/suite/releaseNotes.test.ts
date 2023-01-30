/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { Extension, Uri, WebviewPanel } from "vscode";
import { startupFocus } from "../utils/suiteUtils";
import { executeTeCommand } from "../utils/commandUtils";
import {
	activate, closeEditors, testControl, suiteFinished, sleep, exitRollingCount, endRollingCount
} from "../utils/utils";

let extension: Extension<any>;
let webviewPanel: WebviewPanel | undefined;


suite("Release Notes Page Tests", () =>
{
	suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ extension } = await activate(this));
        endRollingCount(this, true);
	});


	suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
		webviewPanel?.dispose();
		webviewPanel = undefined;
		await closeEditors();
        suiteFinished(this);
	});


	test("Focus Tree View", async function()
	{
        await startupFocus(this);
	});


	test("Open Release Notes", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 200);
		webviewPanel = await executeTeCommand("viewReleaseNotes", testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(100);
        endRollingCount(this);
	});


	test("Open Release Notes (Error No Version)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 200);
		await closeEditors();
		const version = extension.packageJSON.version;
		extension.packageJSON.version = "17.4444.0";
		try {
			webviewPanel = await executeTeCommand("viewReleaseNotes", testControl.waitTime.viewReport) as WebviewPanel;
			await sleep(100);
		}
		catch (e) { throw e; }
		finally { extension.packageJSON.version = version; }
        endRollingCount(this);
	});


	test("View License Info from Webview", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgr.pageWithDetail + 1000);
		await webviewPanel?.webview.postMessage({ command: "viewLicense" });
		await sleep(500);
        endRollingCount(this);
	});


	test("View Parsing Report from Webview", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgr.pageWithDetail + 1000);
	    await webviewPanel?.webview.postMessage({ command: "viewReport" });
		await sleep(500);
		webviewPanel?.dispose();
		webviewPanel = undefined;
        endRollingCount(this);
	});

});
