/* tslint:disable */

//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { Uri } from "vscode";
import * as testUtil from "./testUtil";

// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", () => {
  // Before Each
  setup(async () => { });

  teardown(() => {
    testUtil.destroyAllTempPaths();
  });

  test("should be present", () => {
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
  test("should be able to activate the extension", function (done) {

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
          done();
        },
        () => {
          assert.fail("Failed to activate extension");
        }
      );
    } else {
      done();
    }
  });
});


