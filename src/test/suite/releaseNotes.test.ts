/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { Extension } from "vscode";
import { Commands } from "../../lib/command";
import { TeWrapper } from "../../lib/wrapper";
import { startupFocus } from "../utils/suiteUtils";
import { executeTeCommand } from "../utils/commandUtils";
import { TeWebviewPanel } from "../../webview/webviewPanel";
import {
	activate, closeEditors, testControl, suiteFinished, sleep, exitRollingCount, endRollingCount, createwebviewForRevive
} from "../utils/utils";

let teWrapper: TeWrapper;
let extension: Extension<any>;


suite("Release Notes Page Tests", () =>
{
	suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teWrapper, extension } = await activate(this));
        endRollingCount(this, true);
	});


	suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
		await closeEditors();
        suiteFinished(this);
	});


	test("Focus Explorer View", async function()
	{
        await startupFocus(this);
	});


	test("Open Release Notes", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReleaseNotes + 200);
		await executeTeCommand<TeWebviewPanel<any>>(Commands.ShowReleaseNotesPage, testControl.waitTime.viewReport);
		await sleep(100);
        endRollingCount(this);
	});


	test("Open Release Notes (Error No Version)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReleaseNotes + 200);
		await closeEditors();
		const version = extension.packageJSON.version;
		extension.packageJSON.version = "17.4444.0";
		try {
			await executeTeCommand<TeWebviewPanel<any>>(Commands.ShowReleaseNotesPage, testControl.waitTime.viewReport);
			await sleep(100);
		}
		catch (e) { throw e; }
		finally { extension.packageJSON.version = version; }
        endRollingCount(this);
	});


	test("View License Info from Webview", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReleaseNotes + testControl.slowTime.licenseMgr.pageWithDetail + 1000);
		await teWrapper.releaseNotesPage.view?.webview.postMessage({ command: "showLicensePage" });
		await sleep(500);
        endRollingCount(this);
	});


	test("View Parsing Report from Webview", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReleaseNotes + testControl.slowTime.licenseMgr.pageWithDetail + 1000);
	    await teWrapper.releaseNotesPage.view?.webview.postMessage({ command: "showParsingReport" });
		await sleep(500);
		await closeEditors();
        endRollingCount(this);
	});

/*
	test("Deserialize Release Notes Page", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReleaseNotes + 200);
		const panel = createwebviewForRevive(getViewTitle(), getViewType());
	    await getReleaseNotesSerializer().deserializeWebviewPanel(panel, null);
		await sleep(50);
		teApi.testsApi.isBusy = true;
		setTimeout(() => { teApi.testsApi.isBusy = false; }, 50);
	    await getReleaseNotesSerializer().deserializeWebviewPanel(panel, null);
		await sleep(50);
		await closeEditors();
        endRollingCount(this);
	});
*/
});
