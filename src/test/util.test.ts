/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//

import * as assert from "assert";
import { workspace, Uri, ConfigurationTarget } from "vscode";
import * as testUtil from "./testUtil";
import * as util from "../util";


suite("Util tests", () => 
{
  let repoUri: Uri;
  let checkoutDir: Uri;

  suiteSetup(async () => {
    await testUtil.activeExtension();
    //workspace.getConfiguration('taskExplorer').update('debug', true, ConfigurationTarget.Global);
  });

  suiteTeardown(() => {
    //workspace.getConfiguration('taskExplorer').update('debug', false, ConfigurationTarget.Global);
    testUtil.destroyAllTempPaths();
  });

  test("Turn logging on", () => {
    assert.ok(workspace.getConfiguration('taskExplorer').update('debug', true));
  });

  test("Log to output window", () => {
    assert.ok(util.log("spmeesseman.vscode-taskexplorer"));
  });

  test("Log value to output window", () => {
    assert.ok(util.logValue("spmeesseman.vscode-taskexplorer", "true"));
  });

  //test("Turn logging off", () => {
  //  assert.ok(workspace.getConfiguration('taskExplorer').update('debug', false));
  //});

  test("Timeout", () => {
    assert.ok(util.timeout(500));
  });

});
