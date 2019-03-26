//
// PLEASE DO NOT MODIFY / DELETE UNLESS YOU KNOW WHAT YOU ARE DOING
//
// This file is providing the test runner to use when running extension tests.
// By default the test runner in use is Mocha based.
//
// You can provide your own test runner if you want to override it by exporting
// a function run(testsRoot: string, clb: (error: Error, failures?: number) => void): void
// that the extension host can call to run the tests. The test runner is expected to use console.log
// to report the results back to the caller. When the tests are finished, return
// a possible error to the callback or null if none.

import * as IstanbulTestRunner from "./istanbultestrunner";

const testRunner = IstanbulTestRunner;

const mochaOpts: Mocha.MochaOptions = {
  ui: "tdd", // the TDD UI is being used in extension.test.ts (suite, test, etc.)
  useColors: true, // colored output from test results,
  timeout: 10000, // default timeout: 10 seconds
  retries: 1,
  reporter: "mocha-junit-reporter",
  reporterOptions: {
    mochaFile: __dirname + "/../../test-reports/extension_tests.xml",
    suiteTitleSeparatedBy: ": "
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
