/* tslint:disable */

//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//
/*
// The module 'assert' provides assertion methods from node
import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as fs from "original-fs";
import * as path from "path";
import { commands, Uri } from "vscode";
import * as testUtil from "./testUtil";
import { timeout } from "../util";

// Defines a Mocha test suite to group tests of similar kind together
suite("NPM Tests", () => {
  let repoUri: Uri;
  let checkoutDir: Uri;

  suiteSetup(async () => {
    await testUtil.activeExtension();
    repoUri = await testUtil.createRepoServer();
    await testUtil.createStandardLayout(testUtil.getSvnUrl(repoUri));
    checkoutDir = await testUtil.createNpmDir();
  });

  suiteTeardown(() => {
    testUtil.destroyAllTempPaths();
  });

  test("File Open", async function() {
    const file = path.join(checkoutDir.fsPath, "package.json");
    fs.writeFileSync(file, "test");

    //await commands.executeCommand("svn.fileOpen", Uri.file(file));
  });

});
*/