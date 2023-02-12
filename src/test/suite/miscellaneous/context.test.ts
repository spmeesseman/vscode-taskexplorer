/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { TeWrapper } from "../../../lib/wrapper";
import { ContextKeys, getContext } from "../../../lib/context";
import { activate, endRollingCount, exitRollingCount, suiteFinished } from "../../utils/utils";

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
        getContext<boolean>(ContextKeys.Enabled);
        getContext<boolean>(ContextKeys.Enabled,  true);
        getContext<string>(ContextKeys.TestsTest, "testing");
        endRollingCount(this);
    });


    test("Set Context", async function()
    {
        if (exitRollingCount(this)) return;
        endRollingCount(this);
    });

});
