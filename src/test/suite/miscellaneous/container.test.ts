/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { expect } from "chai";
import { TeContainer } from "../../../lib/container";
import { startupFocus } from "../../utils/suiteUtils";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, endRollingCount, exitRollingCount, suiteFinished, testControl as tc } from "../../utils/utils";

let teApi: ITaskExplorerApi;
let teContainer: TeContainer;


suite("Container Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, teContainer } = await activate(this));
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        suiteFinished(this);
    });


	test("Focus Explorer View", async function()
	{
        await startupFocus(this);
	});


    test("Access Getter Properties", async function()
    {
        if (exitRollingCount(this)) return;
        expect(teContainer.env).to.equal("tests");
        expect(teContainer.id).to.be.a("string");
        expect(teContainer.prerelease).to.equal(false);
        expect(teContainer.prereleaseOrDebugging).to.equal(false);
        expect(teContainer.tests).to.equal(true);
        expect(teContainer.storage).to.not.be.undefined;
        expect(teContainer.licensePage).to.not.be.undefined;
        expect(teContainer.parsingReportPage).to.not.be.undefined;
        expect(teContainer.releaseNotesPage).to.not.be.undefined;
        expect(teContainer.licenseManager).to.not.be.undefined;
        expect(teContainer.treeManager).to.not.be.undefined;
        expect(teContainer.homeView).to.not.be.undefined;
        expect(teContainer.taskCountView).to.not.be.undefined;
        endRollingCount(this);
    });


    test("Re-Access Initialization Properties (Throws)", async function()
    {
        if (exitRollingCount(this)) return;
        try { TeContainer.create(teContainer.context, teContainer.storage, false, teContainer.version, teContainer.version); } catch { /* will throw */ }
        try { await teContainer.ready(); } catch { /* will throw */ }
        endRollingCount(this);
    });


    test("Access API Getter Properties", async function()
    {
        if (exitRollingCount(this)) return;
        expect(teApi.explorer).to.not.be.undefined;
        expect(teApi.explorerView).to.not.be.undefined;
        expect(teApi.sidebar).to.be.undefined;
        expect(teApi.sidebarView).to.be.undefined;
        expect(teApi.isLicensed()).to.be.oneOf([ true, false ]);
        expect(teApi.isBusy()).to.be.oneOf([ true, false ]);
        expect(teApi.isTests()).to.be.equal(true);
        endRollingCount(this);
    });

});
