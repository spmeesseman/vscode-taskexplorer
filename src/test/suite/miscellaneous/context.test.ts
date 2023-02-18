/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { expect } from "chai";
import { ITeWrapper } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, endRollingCount, exitRollingCount, suiteFinished } from "../../utils/utils";

let teWrapper: ITeWrapper;

const enum ContextKeys
{
	ActionPrefix = "taskexplorer:action:",
	KeyPrefix = "taskexplorer:key:",
	TreeViewPrefix = "taskexplorer:treeView:",
	WebviewPrefix = "taskexplorer:webview:",
	WebviewViewPrefix = "taskexplorer:webviewView:",
	Debugging = "taskexplorer:debugging",
	Disabled = "taskexplorer:disabled",
	Enabled = "taskexplorer:enabled",
	Untrusted = "taskexplorer:untrusted",
	licensePage = "taskexplorer:licensePage",
	ParsingReport = "taskexplorer:parsingReport",
	ReleaseNotes = "taskexplorer:releaseNotes",
	TaskFiles = "taskexplorer:taskFiles",
	Tests = "taskexplorer:tests",
	TestsTest = "taskexplorer:testsTest"
}


suite("Context Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teWrapper } = await activate(this));
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        suiteFinished(this);
    });


    test("Get Context", async function()
    {
        if (exitRollingCount(this)) return;
        expect(teWrapper.contextTe.getContext<boolean>(ContextKeys.Enabled)).to.be.a("boolean").that.is.equal(true);
        expect(teWrapper.contextTe.getContext<boolean>(ContextKeys.Enabled,  true)).to.be.a("boolean").that.is.equal(true);
        expect(teWrapper.contextTe.getContext<string>(ContextKeys.TestsTest)).to.be.undefined;
        expect(teWrapper.contextTe.getContext<string>(ContextKeys.TestsTest, "testing")).to.be.a("string").that.is.equal("testing");
        endRollingCount(this);
    });


    test("Set Context", async function()
    {
        if (exitRollingCount(this)) return;
        await teWrapper.contextTe.setContext(ContextKeys.TestsTest, "testing");
        expect(teWrapper.contextTe.getContext<string>(ContextKeys.TestsTest)).to.be.a("string").that.is.equal("testing");
        await teWrapper.contextTe.setContext(ContextKeys.TestsTest, undefined);
        endRollingCount(this);
    });

});
