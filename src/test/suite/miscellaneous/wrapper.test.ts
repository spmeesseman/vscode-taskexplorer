/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { expect } from "chai";
import { TeWrapper } from "../../../lib/wrapper";
import { startupFocus } from "../../utils/suiteUtils";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, endRollingCount, exitRollingCount, suiteFinished, testControl as tc } from "../../utils/utils";

let teApi: ITaskExplorerApi;
let teWrapper: TeWrapper;


suite("Wrapper Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, teWrapper } = await activate(this));
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
        expect(teWrapper.env).to.equal("tests");
        expect(teWrapper.id).to.be.a("string");
        expect(teWrapper.prerelease).to.equal(false);
        expect(teWrapper.prereleaseOrDebugging).to.equal(false);
        expect(teWrapper.tests).to.equal(true);
        expect(teWrapper.storage).to.not.be.undefined;
        expect(teWrapper.licensePage).to.not.be.undefined;
        expect(teWrapper.parsingReportPage).to.not.be.undefined;
        expect(teWrapper.releaseNotesPage).to.not.be.undefined;
        expect(teWrapper.licenseManager).to.not.be.undefined;
        expect(teWrapper.treeManager).to.not.be.undefined;
        expect(teWrapper.homeView).to.not.be.undefined;
        expect(teWrapper.taskCountView).to.not.be.undefined;
        endRollingCount(this);
    });


    test("Re-Access Initialization Properties (Throws)", async function()
    {
        if (exitRollingCount(this)) return;
        try {
            TeWrapper.create(teWrapper.context, teWrapper.storage, teWrapper.configuration,
                             teWrapper.log, false, teWrapper.version, teWrapper.version);
        }
        catch { /* will throw */ }
        try { await teWrapper.ready(); } catch { /* will throw */ }
        endRollingCount(this);
    });


    test("Access API Getter Properties", async function()
    {
        if (exitRollingCount(this)) return;
        expect(teWrapper.explorer).to.not.be.undefined;
        expect(teWrapper.explorerView).to.not.be.undefined;
        expect(teWrapper.sidebar).to.be.undefined;
        expect(teWrapper.sidebarView).to.be.undefined;
        expect(teWrapper.licenseManager.isLicensed()).to.be.oneOf([ true, false ]);
        expect(teWrapper.busy).to.be.oneOf([ true, false ]);
        expect(teWrapper.tests).to.be.equal(true);
        endRollingCount(this);
    });

});
