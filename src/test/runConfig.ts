/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
"use strict";
//
import * as glob from "glob";
import * as path from "path";
import * as Mocha from "mocha";
const NYC = require("nyc");

//
// Simulates the recommended config option
// extends: "@istanbuljs/nyc-config-typescript",
// import * as baseConfig from "@istanbuljs/nyc-config-typescript";

//
// Recommended modules, loading them here to speed up NYC init
// and minimize risk of race condition
//
import "ts-node/register";
import "source-map-support/register";

// const sleep = (ms: number) =>
// {
//     return new Promise(resolve => setTimeout(resolve, ms));
// };


export default async() =>
{
    const xArgs = JSON.parse(process.env.xArgs || "[]"),
          testArgs = JSON.parse(process.env.testArgs || "[]"),
          // testsRoot = path.resolve(__dirname, ".."),  // <- WP    // Webpack is fn'g garbage.  Same paths. but somehow
          // nycRoot = path.resolve(__dirname, "..", "..", ".."),    // fucked up to were everything is mapped one level down.
          testsRoot = path.resolve(__dirname),           // <- TS    // So fng sick of Webpack.  Sick of spending 17 hours for
          nycRoot = path.resolve(__dirname, "..", ".."); // <- TS    // every little thing that needs to be done w/ it.  Fng garbage.

    // Setup coverage pre-test, including post-test hook to report
    const nyc = new NYC({
        // ...baseConfig,
        extends: "@istanbuljs/nyc-config-typescript",
        cwd: nycRoot,
        reporter: [ "text-summary", "html", "lcov", "cobertura" ],
        all: true,
        cache: true,
        silent: false,
        instrument: true,
        hookRequire: true,
        hookRunInContext: true,
        hookRunInThisContext: true,
        // useSpawnWrap: true,
        include: [ "dist/**/*.js" ],
        exclude: [ "dist/test/**" ],
    });
    await nyc.wrap();

    //
    // Check the modules already loaded and warn in case of race condition
    // (ideally, at this point the require cache should only contain one file - this module)
    //
    // console.log("Check requires cache");
    // Object.keys(require.cache).forEach((reqKey) => {
    //     console.log("   " + reqKey);
    // });
    const myFilesRegex = /vscode-taskexplorer\/dist/;
    const filterFn = myFilesRegex.test.bind(myFilesRegex);
    if (Object.keys(require.cache).filter(filterFn).length > 1)
    {
        console.warn("NYC initialized after modules were loaded", Object.keys(require.cache).filter(filterFn));
    }

    //
    // Debug which files will be included/excluded
    // console.log('Glob verification', await nyc.exclude.glob(nyc.cwd));
    //

    if (xArgs.includes("--no-clean"))
    {
        await nyc.createTempDirectory();
    }
    else {
        try {
            await nyc.reset();
        }
        catch {
            await nyc.createTempDirectory();
        }
    }

    //
    // Create the mocha test
    //
    const mocha = new Mocha({
        ui: "tdd", // the TDD UI is being used in extension.test.ts (suite, test, etc.)
        color: true, // colored output from test results,
        timeout: 30000, // default timeout: 10 seconds
        retries: 0, // ,
        slow: 250,
        // reporter: "mocha-multi-reporters",
        // reporterOptions: {
        //     reporterEnabled: "spec, mocha-junit-reporter",
        //     mochaJunitReporterReporterOptions: {
        //         mochaFile: __dirname + "/../../coverage/junit/extension_tests.xml",
        //         suiteTitleSeparatedBy: ": "
        //     }
        // }
    });

    let filesToTest = "**/*.test.js";
    if (testArgs.length > 0)
    {
        filesToTest = (testArgs.length > 1 ? "{" : "");
        testArgs.forEach((a: string) =>
        {
            if (filesToTest.length > 1) {
                filesToTest += ",";
            }
            filesToTest += `**/${a}.test.js`;
        });
        filesToTest += (testArgs.length > 1 ? "}" : "");
    }

    //
    // Add all files to the test suite
    //
    const files = glob.sync(filesToTest, { cwd: testsRoot });
    // const files = glob.sync(`{**/_api.test.js,**/${fileToTest}.test.js}`, { cwd: testsRoot });
    files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

    return {
        nyc,
        mocha
    };
};
