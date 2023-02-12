/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { TeWrapper } from "../../../lib/wrapper";
import { ContextKeys, getContext, setContext } from "../../../lib/context";
import { activate, endRollingCount, exitRollingCount, suiteFinished } from "../../utils/utils";
import { expect } from "chai";

let teWrapper: TeWrapper;


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
        expect(getContext<boolean>(ContextKeys.Enabled)).to.be.a("boolean").that.is.equal(true);
        expect(getContext<boolean>(ContextKeys.Enabled,  true)).to.be.a("boolean").that.is.equal(true);
        expect(getContext<string>(ContextKeys.TestsTest)).to.be.a("string").that.is.equal("testing");
        expect(getContext<string>(ContextKeys.TestsTest, "testing")).to.be.a("string").that.is.equal("testing");
        endRollingCount(this);
    });


    test("Set Context", async function()
    {
        if (exitRollingCount(this)) return;
        setContext(ContextKeys.TestsTest, "testing");
        setContext(ContextKeys.TestsTest, undefined);
        endRollingCount(this);
    });

});
