/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//

import * as assert from "assert";
import * as fs from "original-fs";
import * as path from "path";
import { commands, workspace } from "vscode";
import * as testUtil from "./testUtil";
import { timeout } from "../util";
import { treeDataProvider2 } from "../extension";
import { Folder, TaskFile, TaskItem } from "../taskView";
import { configuration } from "../common/configuration";

let tempFiles: Array<string> = [];
let dirName: string = '';
let dirNameCode: string = '';
let treeItems: any[] = [];
let didCodeDirExist: boolean = false;

suite("Task tests", () => 
{
  suiteSetup(async () => {
    await testUtil.activeExtension();
    dirName = path.join(workspace.rootPath, 'tasks_test_');
    dirNameCode = path.join(workspace.rootPath, '.vscode');
    await workspace.getConfiguration('taskExplorer').update('exclude', []);
    await configuration.update('exclude', []);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName);
      //await testUtil.createTempDir(dirName);
    }
    if (!fs.existsSync(dirNameCode)) {
      fs.mkdirSync(dirNameCode);
    }
    else {
      didCodeDirExist = true;
    }
  });


  suiteTeardown(() => {
    //testUtil.destroyAllTempPaths();
    if (tempFiles.length)
    {
      let file;
      while ((file = tempFiles.shift())) {
        try {
          fs.unlinkSync(file);
        } catch (error) { console.log(error);}
      }
    }
    if (!didCodeDirExist) {
      fs.rmdirSync(dirNameCode);
    }
    fs.rmdirSync(dirName);
  });


  test("Create ant target files", async function()
  {
    const file = path.join(dirName, "build.xml");
    const file2 = path.join(dirName, "test.xml");
    tempFiles.push(file);
    tempFiles.push(file2);

    fs.writeFileSync(file, '<?xml version="1.0"?>' +
                           '<project basedir="." default="test1">' +
                           '    <property environment="env" />' +
                           '    <property name="test" value="test" />' +
                           '    <target name="test1" depends="init"></target>' +
                           '    <target name="test2" depends="init"></target>' +
                           '</project>');

    fs.writeFileSync(file2,'<?xml version="1.0"?>' +
                           '<project basedir="." default="test2">' +
                           '    <property name="test2" value="test2" />' +
                           '    <target name="test3"></target>' +
                           '    <target name="test4"></target>' +
                           '</project>');
  });


  test("Create npm package files", async function() 
  {
    const file = path.join(dirName, "package.json");
    tempFiles.push(file);

    fs.writeFileSync(file, '{ ' +
                           '    "scripts":{ ' +
                           '        "test":"node ./node_modules/vscode/bin/test",' +
                           '        "compile":"npx tsc -p ./" ' +
                           '    }' +
                           '}');
  });


  test("Create vscode task files", async function() 
  {
    const file = path.join(dirNameCode, 'tasks.json');
    tempFiles.push(file);

    fs.writeFileSync(file, '{ ' +
                           '    "version": "2.0.0", ' +
                           '    "tasks": [ ' +
                           '    { ' +
                           '        "label": "test1", ' +
                           '        "type": "shell", ' +
                           '        "command": "ant.bat", ' +
                           '        "args": [ "-logger", "org.apache.tools.ant.listener.AnsiColorLogger", "test1" ], ' +
                           '        "group": "build", ' +
                           '        "options": { ' +
                           '            "shell": { ' +
                           '                "executable": "${env:CODE_HOME}\\ansicon\\x64\\ansicon.exe", ' +
                           '            } ' +
                           '        } ' +
                           '    }]' +
                           '}');

  });
  

  test("Scan tasks", async function() 
  {
    await timeout(1000);
    treeItems = await treeDataProvider2.getChildren(); // mock explorer open view which would call this function
    await timeout(100);
  });


  test("Verify tree validity and open tasks", async function() 
  {
    if (treeItems.length)
    {
      let item: any;
      while ((item = treeItems.shift())) {
        try {
          if (item instanceof Folder) {
            let treeFiles: any[] = await treeDataProvider2.getChildren(item);
            if (treeFiles.length) {
              let item2: any;
              while ((item2 = treeFiles.shift())) {
                if (item2 instanceof TaskFile) {
                  let treeTasks: any[] = await treeDataProvider2.getChildren(item2);
                  if (treeTasks.length) {
                    let item3: any;
                    while ((item3 = treeTasks.shift())) {
                      if (item3 instanceof TaskItem) {
                        await commands.executeCommand("taskExplorer.open", item3);
                      }
                      else {
                        assert.fail('Invalid taskitem node found');
                      }
                    }
                  }
                }
                else {
                  assert.fail('Invalid taskfile node found');
                }
              }
            }
            else {
              assert.fail('No task files found');
            }
          }
          else {
            assert.fail('Invalid root folder');
          }
        } catch (error) {}
      }
    }
  });

});
