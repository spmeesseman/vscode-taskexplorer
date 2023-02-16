/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { TeWrapper } from "../../../lib/wrapper";
import { activate, endRollingCount, exitRollingCount, suiteFinished } from "../../utils/utils";

let aKey: string;
let teWrapper: TeWrapper;


suite("Usage / Telemetry Tests", () =>
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


    test("List Usage", async function()
    {
        if (exitRollingCount(this)) return;
        const usage = teWrapper.usage.getAll();
        Object.keys(usage).forEach((k) => {
            teWrapper.usage.get(k as any);
console.log(k);
            aKey = k;
        });
console.log("aKey = " + aKey);
        endRollingCount(this);
    });


    test("Reset Usage", async function()
    {
        if (exitRollingCount(this)) return;
        const usage = teWrapper.usage.getAll();
        const d = teWrapper.usage.onDidChange(() => {});
        d.dispose();
        await teWrapper.usage.reset(aKey as any);
        await teWrapper.usage.reset();
        await teWrapper.usage.reset();
        await teWrapper.storage.update("usages", usage);
        endRollingCount(this);
    });

});
