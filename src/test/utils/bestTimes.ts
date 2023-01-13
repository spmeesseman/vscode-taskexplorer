

import figures from "../../lib/figures";
import { lowerCaseFirstChar, properCase } from "../../lib/utils/utils";
import { testControl } from "../control";
import { teApi } from "./utils";


const clearProcessTimeStorage = async (key: string, force?: boolean) =>
{
    if (testControl.tests.clearBestTime || testControl.tests.clearAllBestTimes || force)
    {
        await teApi.testsApi.storage.update2(key, undefined);
        await teApi.testsApi.storage.update2(key + "Fmt", undefined);
        await teApi.testsApi.storage.update2(key + "NumTests", undefined);
    }
};


export const getSuiteFriendlyName = (suiteName: string) => suiteName.replace(" Tests", "");


export const getSuiteKey = (suiteName: string, preKey = "") =>
{
    if (preKey) {
        return preKey + properCase(suiteName.replace(" Tests", "")).replace(/[ \W]/g, "");
    }
    return lowerCaseFirstChar(properCase(suiteName.replace(" Tests", "")), true).replace(/\W/g, "");
};


const getTimeElapsedFmt = (timeElapsed: number) =>
{
    const m = Math.floor(timeElapsed / 1000 / 60),
          s = Math.floor(timeElapsed / 1000 % 60),
          ms = Math.round(timeElapsed % 1000);
    return `${m} minutes, ${s} seconds, ${ms} milliseconds`;
};


const logBestTime = async (title: string, storageKey: string, timeElapsedFmt: string) =>
{
    let msg: string;
    const prevBestTimeElapsedFmt = await teApi.testsApi.storage.get2<string>(storageKey + "Fmt", ""),
          prevMsg = ` The previous fastest time recorded was ${prevBestTimeElapsedFmt}`,
          preMsg = `    ${figures.color.info} ${figures.withColor("!!!", figures.colors.cyan)}`;
    if (title)
    {
        if (title.includes("Logging")) {
            msg = ` New Fastest Time with ${title} ${figures.withColor(timeElapsedFmt, figures.colors.cyan)}`;
        }
        else {
            if (testControl.tests.numSuites > 1) {
                msg = ` New Fastest Time for Suite '${title}' ${figures.withColor(timeElapsedFmt, figures.colors.cyan)}`;
            }
            else {
                msg = ` New Fastest Time for Suite '${title}' (Single Test) ${figures.withColor(timeElapsedFmt, figures.colors.cyan)}`;
            }
        }
    }
    else {
        msg = ` New Fastest Time for 'All Tests' ${figures.withColor(timeElapsedFmt, figures.colors.cyan)}`;
    }
    console.log(preMsg);
    console.log(preMsg + figures.withColor(msg, figures.colors.grey));
    console.log(preMsg + figures.withColor(prevMsg, figures.colors.grey));
    console.log(preMsg);
};


const timeSep = "--------------------------------------------------------------------------------";


const processBestTime = async (logTitle: string, storageKey: string, timeElapsed: number, numTests: number) =>
{
    const msg = "------- " + (!logTitle || logTitle.includes("Logging") ? "All Tests " + logTitle : logTitle).toUpperCase() + ` ${timeSep}`;
    console.log(`    ${figures.color.info} ${figures.withColor(msg, figures.colors.magenta)}`);
    await clearProcessTimeStorage(storageKey);
    const prevNumTests = await teApi.testsApi.storage.get2<number>(storageKey + "NumTests");
    if (prevNumTests !== numTests) {
        await clearProcessTimeStorage(storageKey, true);
    }
    let bestTimeElapsed = await teApi.testsApi.storage.get2<number>(storageKey, 0);
    if (bestTimeElapsed === 0) {
        bestTimeElapsed = timeElapsed + 1;
    }
    const timeElapsedFmt = getTimeElapsedFmt(timeElapsed);
    if (timeElapsed < bestTimeElapsed)
    {
        await logBestTime(logTitle, storageKey, timeElapsedFmt);
        await saveProcessTimeToStorage(storageKey, timeElapsed, timeElapsedFmt, numTests);
    }
    else {
        const bestTimeElapsedFmt = await teApi.testsApi.storage.get2<string>(storageKey + "Fmt", ""),
              msg1 = `The time elapsed ${logTitle ? `for '${figures.withColor(logTitle.toLowerCase(), figures.colors.white)}' tests` : ""} was ${timeElapsedFmt}`,
              msg2 = `The fastest time recorded is ${bestTimeElapsedFmt}`;
        console.log(`    ${figures.color.info} ${figures.withColor(msg1, figures.colors.grey)}`);
        console.log(`    ${figures.color.info} ${figures.withColor(msg2, figures.colors.grey)}`);
    }
};


const processSuiteTimes = async () =>
{
    const suiteResults = Object.values(testControl.tests.suiteResults).filter(v => v.suiteName !== "Deactivate Extension");
    for (const suiteResult of suiteResults)
    {
        const typeKey = testControl.tests.numSuites === 1 ? "Single" : "",
              storageKey = getSuiteKey(suiteResult.suiteName, "bestTimeElapsedSuite" + typeKey);
        if (testControl.tests.clearAllBestTimes) {
            await clearProcessTimeStorage(storageKey);
        }
        if (suiteResult.timeFinished && suiteResult.timeStarted)
        {
            const timeElapsed = suiteResult.timeFinished - suiteResult.timeStarted;
            await processBestTime(suiteResult.suiteName, storageKey, timeElapsed, testControl.tests.numTests);
        }
    }
};


const processTimesWithLogEnabled = async (timeElapsed: number) =>
{
    if (testControl.tests.clearAllBestTimes)
    {
        await clearProcessTimeStorage("bestTimeElapsedWithLogging");
        await clearProcessTimeStorage("bestTimeElapsedWithLoggingFile");
        await clearProcessTimeStorage("bestTimeElapsedWithLoggingOutput");
        await clearProcessTimeStorage("bestTimeElapsedWithLoggingConsole");
    }
    if (testControl.log.enabled)
    {
        await processBestTime("Logging Enabled", "bestTimeElapsedWithLogging", timeElapsed, testControl.tests.numTests);
        if (testControl.log.file)
        {
            await processBestTime("File Logging Enabled", "bestTimeElapsedWithLoggingFile", timeElapsed, testControl.tests.numTests);
        }
        if (testControl.log.output)
        {
            await processBestTime("Output Window Logging Enabled", "bestTimeElapsedWithLoggingOutput", timeElapsed, testControl.tests.numTests);
        }
        if (testControl.log.console)
        {
            await processBestTime("Console Logging Enabled", "bestTimeElapsedWithLoggingConsole", timeElapsed, testControl.tests.numTests);
        }
    }
};


export const processTimes = async (timeStarted: number) =>
{
    const timeFinished = Date.now(),
          timeElapsed = timeFinished - timeStarted,
          tzOffset = (new Date()).getTimezoneOffset() * 60000,
          timeFinishedFmt = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1).replace("T", " ").replace(/[\-]/g, "/");

    console.log(`    ${figures.color.info} ${figures.withColor("Cleanup complete", figures.colors.grey)}`);
    console.log(`    ${figures.color.info} ${figures.withColor("Time Finished: " + timeFinishedFmt, figures.colors.grey)}`);
    console.log(`    ${figures.color.info} ${figures.withColor("Time Elapsed: " + getTimeElapsedFmt(timeElapsed), figures.colors.grey)}`);

    if (testControl.tests.numTestsFail === 0)
    {
        if (testControl.tests.numSuites > 3)  { // > 3, sometimes i string the single test together with a few others temp
            await processBestTime("", "bestTimeElapsed", timeElapsed, testControl.tests.numTests);
            await processTimesWithLogEnabled(timeElapsed);
        }
        await processSuiteTimes();
    }
    else {
        const skipMsg = `There were ${testControl.tests.numTestsFail} failed tests, best time processing skipped`;
        console.log(`    ${figures.color.info} ${figures.withColor(skipMsg, figures.colors.grey)}`);
    }
};


const saveProcessTimeToStorage = async (key: string, timeElapsed: number, timeElapseFmt: string, numTests: number) =>
{
    await teApi.testsApi.storage.update2(key, timeElapsed);
    await teApi.testsApi.storage.update2(key + "Fmt", timeElapseFmt);
    await teApi.testsApi.storage.update2(key + "NumTests", numTests);
};

