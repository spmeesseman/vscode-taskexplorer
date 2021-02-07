
import * as TestRunner from "./istanbultestrunner";
// import * as TestRunner from "./nyctestrunner";

const testRunner = TestRunner;

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

testRunner.configure(mochaOpts,
{
    coverConfig: "../../.coverconfig.json"
});

module.exports = testRunner;


//import * as path from "path";
//import * as Mocha from "mocha";
//import * as glob from "glob";
//import NYC from "nyc";
//const NYC = require("../../node_modules/nyc/index.js")

// export async function run(testsRoot: string, cb: (error: any, failures?: number) => void): Promise<void>
// {
//     const nyc = new NYC({
//         extends: "@istanbuljs/nyc-config-typescript",
//         branches: 80,
//         lines: 80,
//         functions: 80,
//         statements: 80,
//         reportDir: '../../coverage',
//         tempDir: '../../.nyc_output',
//         excludeNodeModules: true,
//         all: false,
//         sourceMap: false,
//         instrument: false,
//         cwd: testsRoot,
//         require: [
//             '@babel/register'
//         ],
//         include: [
//             '../../src/**/*.ts',
//         ],
//         exclude: [
//             'node_modules',
//             '.vscode-test',
//             'coverage',
//             'test-files',
//             '../../src/**/*.test.ts',
//             'src/**/*.d.ts'
//         ],
//         reporter: [
//             'json',
//             'lcov',
//             'cobertura'
//         ]
//     });
//     await nyc.createTempDirectory();
//     // Create the mocha test
//     //const mocha = new Mocha({
//     //    ui: "tdd"
//     //});
//     //mocha.useColors(true);
//
//
//     const mocha = new Mocha({
//             ui: "tdd",
//             timeout: 30000, // default timeout: 10 seconds
//             retries: 1,
//             reporter: "mocha-multi-reporters",
//             reporterOptions: {
//                 reporterEnabled: "spec, mocha-junit-reporter",
//                 mochaJunitReporterReporterOptions: {
//                     mochaFile: __dirname + "/../../test-reports/extension_tests.xml",
//                     suiteTitleSeparatedBy: ": "
//                 }
//             }
//         });
//         mocha.useColors(true);
//
//
//     const files: string[] = await new Promise((resolve, reject) =>
//         glob(
//         "**/**.test.js",
//         {
//             cwd: testsRoot,
//         },
//         (err, files) => {
//             if (err) reject(err);
//             else resolve(files);
//         }
//         )
//     )
//
//     // Add files to the test suite
//     files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
// 
//     const failures: number = await new Promise(resolve => mocha.run(resolve));
//     await nyc.writeCoverageFile();
//
//     cb(null, failures);
//
//     if (failures > 0) {
//         throw new Error(`${failures} tests failed.`)
//     }
// }