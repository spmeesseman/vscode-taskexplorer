/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//

import * as assert from 'assert';
import * as vscode from "vscode";
import * as util from '../util';
import { Uri } from "vscode";
import * as testUtil from "./testUtil";
import { utils } from 'mocha';


suite("Extension Tests", () => 
{
  // Before Each
  setup(async () => { });

  teardown(() => {
    //try{
      testUtil.destroyAllTempPaths();
    //} catch(e) {}
  });

  test("Get extension", () => {
    assert.ok(vscode.extensions.getExtension("spmeesseman.vscode-taskexplorer"));
  });

  // Defines a Mocha unit test
  // test("Something 1", function () {
  //   assert.equal(-1, [1, 2, 3].indexOf(5));
  //   assert.equal(-1, [1, 2, 3].indexOf(0));
  // });

  // The extension is already activated by vscode before running mocha test framework.
  // No need to test activate any more. So commenting this case.
  // tslint:disable-next-line: only-arrow-functions
  test("Activate extension", function (done) {

    this.timeout(60 * 1000);

    const extension = vscode.extensions.getExtension(
      "spmeesseman.vscode-taskexplorer"
    ) as vscode.Extension<any>;

    if (!extension) {
      assert.fail("Extension not found");
    }

    if (!extension.isActive) {
      extension.activate().then(
        api => {
          assert(vscode.commands.executeCommand("taskExplorer.showOutput"));
          done();
        },
        () => {
          assert.fail("Failed to activate extension");
        }
      );
    } else {
      assert(vscode.workspace.getConfiguration('taskExplorer').update('debug', true));
      assert(vscode.commands.executeCommand("taskExplorer.showOutput"));
      done();
    }
  });

  

});


