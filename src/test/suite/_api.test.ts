/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { configuration } from "../../common/configuration";
import { activate, executeTeCommand, isReady, testsControl } from "../helper";


suite("API Init and Tests", () =>
{
    suiteSetup(async function()
    {
        await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
        await configuration.updateWs("debug", true);
    });

    suiteTeardown(async function()
    {
        await configuration.updateWs("debug", testsControl.writeToOutput);
    });


    test("Show log", async function()
    {
        await executeTeCommand("showOutput", 10, 50, false);
        await executeTeCommand("showOutput", 10, 50, true);
    });

});
