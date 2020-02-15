// import * as path from "path";
// import * as Mocha from "mocha";
// import * as glob from "glob";
// import * as NYC from "nyc";
// 
// export async function run(): Promise<void> {
//   const nyc = new NYC();
//   await nyc.createTempDirectory();
//   // Create the mocha test
//   const mocha = new Mocha({
//     ui: "tdd",
//   });
//   mocha.useColors(true);
// 
//   const testsRoot = path.resolve(__dirname, "..");
// 
//   const files: string[] = await new Promise((resolve, reject) =>
//     glob(
//       "**/**.test.js",
//       {
//         cwd: testsRoot,
//       },
//       (err, files) => {
//         if (err) reject(err);
//         else resolve(files);
//       }
//     )
//   )
// 
//   // Add files to the test suite
//   files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
// 
//   const failures: number = await new Promise(resolve => mocha.run(resolve));
//   await nyc.writeCoverageFile();
// 
//   if (failures > 0) {
//     throw new Error(`${failures} tests failed.`)
//   }
// }



//import * as path from "path";
//import * as Mocha from "mocha";
//import * as glob from "glob";
//
//
//export function run(testsRoot: string, cb: (error: any, failures?: number) => void): void
//{
//    // Create the mocha test
//    const mocha = new Mocha({
//        ui: "tdd",
//        timeout: 30000, // default timeout: 10 seconds
//        retries: 1
//    });
//    mocha.useColors(true);
//
//    glob("**/**.test.js", { cwd: testsRoot }, (err, files) =>
//    {
//        if (err) {
//            return cb(err);
//        }
//
//        // Add files to the test suite
//        files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
//
//        try {
//            // Run the mocha test
//            mocha.run(failures => {
//                // tslint:disable-next-line: no-null-keyword
//                cb(null, failures);
//            });
//        } catch (err) {
//            console.error(err);
//            cb(err);
//        }
//    });
//}



//import * as path from "path";
//import * as Mocha from "mocha";
//import * as glob from "glob";
//import * as NYC from "nyc";
//
//
//export async function run(testsRoot: string, cb: (error: any, failures?: number) => void)
//{
//    const nyc = new NYC();
//    await nyc.createTempDirectory();
//
//    // Create the mocha test
//    const mocha = new Mocha({
//        ui: "tdd",
//        timeout: 30000, // default timeout: 10 seconds
//        retries: 1
//    });
//    mocha.useColors(true);
//
//    glob("**/**.test.js", { cwd: testsRoot }, async (err, files) =>
//    {
//        if (err) {
//            return cb(err);
//        }
//
//        // Add files to the test suite
//        files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
//
//        try {
//            // Run the mocha test
//            mocha.run(async failures => {
//                // tslint:disable-next-line: no-null-keyword
//                cb(null, failures);
//                await nyc.writeCoverageFile();
//            });
//        } catch (err) {
//            console.error(err);
//            cb(err);
//        }
//    });
//}


//
// PLEASE DO NOT MODIFY / DELETE UNLESS YOU KNOW WHAT YOU ARE DOING
//
// This file is providing the test runner to use when running extension tests.
// By default the test runner in use is Mocha based.

import * as IstanbulTestRunner from "./istanbultestrunner";

const testRunner = IstanbulTestRunner;

const mochaOpts: Mocha.MochaOptions = {
    ui: "tdd", // the TDD UI is being used in extension.test.ts (suite, test, etc.)
    useColors: true, // colored output from test results,
    timeout: 30000, // default timeout: 10 seconds
    retries: 1,
    reporter: "mocha-multi-reporters",
    reporterOptions: {
        reporterEnabled: "spec, mocha-junit-reporter",
        mochaJunitReporterReporterOptions: {
            mochaFile: __dirname + "/../../test-reports/extension_tests.xml",
            suiteTitleSeparatedBy: ": "
        }
    }
};

testRunner.configure(
    mochaOpts,
    // Coverage configuration options
    {
        coverConfig: "../../coverconfig.json"
    }
);

module.exports = testRunner;

