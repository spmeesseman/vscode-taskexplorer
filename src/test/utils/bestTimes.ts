

import figures from "../../lib/figures";
import { lowerCaseFirstChar, properCase } from "../../lib/utils/utils";
import { testControl as tc } from "../control";
import { teApi } from "./utils";

const tct = tc.tests;
const timeSep = "----------------------------------------------------------------------------------------------------";


const clearProcessTimeStorage = async (storageKey: string, numTests: number) =>
{
    const _clr = async () => {
        await teApi.testsApi.storage.update2(storageKey, undefined);
        await teApi.testsApi.storage.update2(storageKey + "Fmt", undefined);
        await teApi.testsApi.storage.update2(storageKey + "NumTests", undefined);
    };
    if (tct.clearBestTime || tct.clearAllBestTimes)
    {
        await _clr();
    }
    else if (tct.clearBestTimesOnTestCountChange)
    {
        const prevNumTests = await teApi.testsApi.storage.get2<number>(storageKey + "NumTests", 0);
        if (prevNumTests < numTests) {
            await _clr();
        }
    }
};


const getStorageKey = (baseKey: string) => baseKey + (tc.isMultiRootWorkspace ? "MWS" : "");


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
            if (tct.numSuites > 1) {
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
    // console.log(preMsg);
    console.log(preMsg + figures.withColor(msg, figures.colors.grey));
    console.log(preMsg + figures.withColor(prevMsg, figures.colors.grey));
    // console.log(preMsg);
};


const processBestTime = async (logTitle: string, storageKey: string, timeElapsed: number, numTests: number) =>
{
    const title = !logTitle || logTitle.includes("Logging") ? "All Tests " + logTitle : logTitle,
          msg = (figures.withColor("-- ", figures.colors.magenta) +
                 figures.withColor(title.toUpperCase(), figures.colors.white) +
                 figures.withColor(` ${timeSep.substring(0, timeSep.length - title.length - 4)}`, figures.colors.magenta));
    console.log(`    ${figures.color.info} ${msg}`);

    await clearProcessTimeStorage(storageKey, numTests);

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
              msg1 = `The time elapsed was ${timeElapsedFmt}`,
              msg2 = `The fastest time recorded is ${bestTimeElapsedFmt}`;
        console.log(`    ${figures.color.info} ${figures.withColor(msg1, figures.colors.grey)}`);
        console.log(`    ${figures.color.info} ${figures.withColor(msg2, figures.colors.grey)}`);
    }
};


const processSuiteTimes = async () =>
{
    const suiteResults = Object.values(tct.suiteResults).filter(v => v.suiteName !== "Deactivate Extension");
    for (const suiteResult of suiteResults)
    {
        const typeKey = tct.numSuites === 1 ? "Single" : "",
              storageKey = getSuiteKey(suiteResult.suiteName, getStorageKey("bestTimeElapsedSuite" + typeKey));
        if (tct.clearAllBestTimes) {
            await clearProcessTimeStorage(storageKey, tct.numTests);
        }
        if (suiteResult.timeFinished && suiteResult.timeStarted)
        {
            const timeElapsed = suiteResult.timeFinished - suiteResult.timeStarted;
            await processBestTime(suiteResult.suiteName, storageKey, timeElapsed, tct.numTests);
        }
    }
};


const processTimesWithLogEnabled = async (timeElapsed: number) =>
{
    if (tct.clearAllBestTimes)
    {
        await clearProcessTimeStorage(getStorageKey("bestTimeElapsedWithLogging"), tct.numTests);
        await clearProcessTimeStorage(getStorageKey("bestTimeElapsedWithLoggingFile"), tct.numTests);
        await clearProcessTimeStorage(getStorageKey("bestTimeElapsedWithLoggingOutput"), tct.numTests);
        await clearProcessTimeStorage(getStorageKey("bestTimeElapsedWithLoggingConsole"), tct.numTests);
    }
    if (tc.log.enabled)
    {
        await processBestTime("Logging Enabled", getStorageKey("bestTimeElapsedWithLogging"), timeElapsed, tct.numTests);
        if (tc.log.file)
        {
            await processBestTime("File Logging Enabled", getStorageKey("bestTimeElapsedWithLoggingFile"), timeElapsed, tct.numTests);
        }
        if (tc.log.output)
        {
            await processBestTime("Output Window Logging Enabled", getStorageKey("bestTimeElapsedWithLoggingOutput"), timeElapsed, tct.numTests);
        }
        if (tc.log.console)
        {
            await processBestTime("Console Logging Enabled", getStorageKey("bestTimeElapsedWithLoggingConsole"), timeElapsed, tct.numTests);
        }
    }
};


export const processTimes = async (timeStarted: number, hadRollingCountError: boolean) =>
{
    const timeFinished = Date.now(),
          timeElapsed = timeFinished - timeStarted,
          tzOffset = (new Date()).getTimezoneOffset() * 60000,
          timeFinishedFmt = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1).replace("T", " ").replace(/[\-]/g, "/");

    console.log(`    ${figures.color.info} ${figures.withColor("Time Finished: " + timeFinishedFmt, figures.colors.grey)}`);
    console.log(`    ${figures.color.info} ${figures.withColor("Time Elapsed: " + getTimeElapsedFmt(timeElapsed), figures.colors.grey)}`);

    if (tct.numTestsFail === 0 && !hadRollingCountError)
    {
        if (tct.numSuites > 3)  { // > 3, sometimes i string the single test together with a few others temp
            await processBestTime("", getStorageKey("bestTimeElapsed"), timeElapsed, tct.numTests);
            await processTimesWithLogEnabled(timeElapsed);
        }
        await processSuiteTimes();
    }
    else {
        const skipMsg = tct.numTestsFail > 0 ?
                            `There were ${tct.numTestsFail} failed tests, best time processing skipped` :
                            "There was a rolling count failure, best time processing skipped";
        console.log(`    ${figures.color.info} ${figures.withColor(skipMsg, figures.colors.grey)}`);
    }

    console.log(`    ${figures.color.info} ${figures.withColor(timeSep, figures.colors.magenta)}`);
};


const saveProcessTimeToStorage = async (key: string, timeElapsed: number, timeElapseFmt: string, numTests: number) =>
{
    await teApi.testsApi.storage.update2(key, timeElapsed);
    await teApi.testsApi.storage.update2(key + "Fmt", timeElapseFmt);
    await teApi.testsApi.storage.update2(key + "NumTests", numTests);
};

