/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { expect } from "chai";
import { ContextKeys } from "../../../lib/context";
import { ITeWrapper } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, endRollingCount, exitRollingCount, suiteFinished } from "../../utils/utils";

let teWrapper: ITeWrapper;


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
