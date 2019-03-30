/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//

import * as assert from "assert";
import * as fs from "original-fs";
import * as path from "path";
import { commands, Uri, workspace, window, TextDocument } from "vscode";
import * as testUtil from "./testUtil";
import { timeout } from "../util";
import { treeDataProvider2 } from "../extension";

suite("NPM tests", () => 
{
  suiteSetup(async () => {
    await testUtil.activeExtension();
  });

  suiteTeardown(() => {
    //testUtil.destroyAllTempPaths();
  });

  test("File Open", async function() 
  {
    const dir = path.join(workspace.rootPath, "npm_test_");
    const file = path.join(dir, "package.json");

    //await testUtil.createTempDir(dir);

    if (!fs.existsSync(dir))
    {
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(file, '{"scripts":{"test":"node ./node_modules/vscode/bin/test","compile":"npx tsc -p ./"}');

    let document: TextDocument;
    document = await workspace.openTextDocument(file);
    await window.showTextDocument(document);

    
    await treeDataProvider2.getChildren(); // mock explorer open view which would call this function
    await timeout(1000);
    
    fs.unlinkSync(file);
    fs.rmdirSync(dir);
    assert('ok');

  });

});
