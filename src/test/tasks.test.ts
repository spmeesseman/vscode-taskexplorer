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
import { TaskFolder } from "../taskFolder";
import { TaskFile} from "../taskFile";
import { TaskItem } from "../taskItem";
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
    const file3 = path.join(dirName, "emptytarget.xml");
    const file4 = path.join(dirName, "emtyproject.xml");
    
    tempFiles.push(file);
    tempFiles.push(file2);
    tempFiles.push(file3);
    tempFiles.push(file4);

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

    fs.writeFileSync(file3,'<?xml version="1.0"?>' +
                           '<project basedir="." default="test1">' +
                           '    <property environment="env" />' +
                           '    <property name="test" value="test" />' +
                           '</project>');

    fs.writeFileSync(file4, '<?xml version="1.0"?>');
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

  test("Create tsc config files", async function() 
  {
    const file = path.join(dirName, "tsconfig.json");
    tempFiles.push(file);

    fs.writeFileSync(file, '{' +
                           '    "compilerOptions": ' +
                           '  {' +
                           '    "target": "es6",' +
                           '    "lib": ["es2016"],' +
                           '    "module": "commonjs",' +
                           '    "outDir": "./out",' +
                           '    "typeRoots": ["./node_modules/@types"],' +
                           '    "strict": true,' +
                           '    "experimentalDecorators": true,' +
                           '    "sourceMap": true,' +
                           '    "noImplicitThis": false' +
                           '  },' +
                           '  "include": ["**/*"],' +
                           '  "exclude": ["node_modules"]' +
                           '}');
  });

  test("Create gulp task files", async function() 
  {
    const file = path.join(workspace.rootPath, 'gulpfile.js');
    tempFiles.push(file);

    fs.writeFileSync(file, "var gulp = require('gulp');" +
                           "var sass = require('gulp-sass');" +                      
                           "gulp.task('hello', function() {" +
                           "    console.log('Hello Cam!');" +
                           "});");
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
    let foundAnt: boolean = false;
    let foundGrunt: boolean = false;
    let foundGulp: boolean = false;
    let foundNpm: boolean = false;
    let foundTsc: boolean = false;
    let foundVscode: boolean = false;

    if (treeItems.length)
    {
      let item: any;
      while ((item = treeItems.shift())) {
        try {
          if (item instanceof TaskFolder) {
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
                        if (item3.taskSource === 'ant') {
                          foundAnt = true;
                        }
                        else if (item3.taskSource === 'gulp') {
                          foundGulp = true;
                        }
                        else if (item3.taskSource === 'grunt') {
                          foundGrunt = true;
                        }
                        else if (item3.taskSource === 'npm') {
                          foundNpm = true;
                        }
                        else if (item3.taskSource === 'tsc') {
                          foundTsc = true;
                        }
                        else if (item3.taskSource === 'Workspace') {
                          foundVscode = true;
                        }
                      }
                      else {
                        assert.fail('Invalid taskitem node found');
                        return;
                      }
                    }
                  }
                }
                else {
                  assert.fail('Invalid taskfile node found');
                  return;
                }
              }
            }
            else {
              assert.fail('No task files found');
              return;
            }
          }
          else {
            assert.fail('Invalid root folder');
            return;
          }
        } catch (error) {}
      }
    }
    else {
      assert.fail('No tree items found');
      return;
    }

    if (!foundAnt) {
      assert.fail('No ant items found');
    }
    else if (!foundGulp) {
      assert.fail('No gulp items found');
    }/*
    else if (!foundGrunt) {
      assert.fail('No grunt items found');
    }*/
    else if (!foundNpm) {
      assert.fail('No npm items found');
    }
    else if (!foundTsc) {
      assert.fail('No tsc items found');
    }
    else if (!foundVscode) {
      assert.fail('No vscode items found');
    }

  });

});
