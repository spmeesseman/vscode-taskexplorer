/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { activate, executeTeCommand, isReady } from "../helper";


suite("API Init and Tests", () =>
{
    suiteSetup(async function()
    {
        await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
    });


    test("Show log", async function()
    {
        await executeTeCommand("showOutput", 50, false);
        await executeTeCommand("showOutput", 50, true);
    });

});
