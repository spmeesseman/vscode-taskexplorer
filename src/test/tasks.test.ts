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

    await configuration.update('exclude', [ "**/coveronly/**"]);

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

    fs.writeFileSync(file, '<?xml version="1.0"?>\n' +
                           '<project basedir="." default="test1">\n' +
                           '    <property environment="env" />\n' +
                           '    <property name="test" value="test" />\n' +
                           '    <target name="test1" depends="init"></target>\n' +
                           '    <target name="test2" depends="init"></target>\n' +
                           '</project>\n');

    fs.writeFileSync(file2,'<?xml version="1.0"?>\n' +
                           '<project basedir="." default="test2">\n' +
                           '    <property name="test2" value="test2" />\n' +
                           '    <target name=\'test3\'></target>\n' +
                           '    <target name="test4"></target>\n' +
                           '</project>\n');

    fs.writeFileSync(file3,'<?xml version="1.0"?>\n' +
                           '<project basedir="." default="test1">\n' +
                           '    <property environment="env" />\n' +
                           '    <property name="test" value="test" />\n' +
                           '</project>\n');

    fs.writeFileSync(file4, '<?xml version="1.0"?>\n');
  });


  test("Create npm package files", async function() 
  {
    const file = path.join(dirName, "package.json");
    tempFiles.push(file);

    fs.writeFileSync(file, '{\n' +
                           '    "scripts":{\n' +
                           '        "test":"node ./node_modules/vscode/bin/test",\n' +
                           '        "compile":"npx tsc -p ./"\n' +
                           '        "install":"npm install"\n' +
                           '    }\n' +
                           '}\n');
  });

  test("Create tsc config files", async function() 
  {
    const file = path.join(workspace.rootPath, "tsconfig.json");
    tempFiles.push(file);

    fs.writeFileSync(file, '{\n' +
                           '    "compilerOptions":\n' +
                           '  {\n' +
                           '    "target": "es6",\n' +
                           '    "lib": ["es2016"],\n' +
                           '    "module": "commonjs",\n' +
                           '    "outDir": "./out",\n' +
                           '    "typeRoots": ["./node_modules/@types"],\n' +
                           '    "strict": true,\n' +
                           '    "experimentalDecorators": true,\n' +
                           '    "sourceMap": true,\n' +
                           '    "noImplicitThis": false\n' +
                           '  },\n' +
                           '  "include": ["**/*"],\n' +
                           '  "exclude": ["node_modules"]\n' +
                           '}\n');
  });


  test("Create gulp task files", async function() 
  {
    const file = path.join(workspace.rootPath, 'gulpfile.js');
    tempFiles.push(file);

    fs.writeFileSync(file, "var gulp = require('gulp');\n" +                     
                           "gulp.task('hello', (done) => {\n" +
                           "    console.log('Hello!');\n" +
                           "    done();\n" +
                           "});\n" +
                           "gulp.task(\"hello2\", (done) => {\n" +
                           "    console.log('Hello2!');\n" +
                           "    done();\n" +
                           "});\n");
  });


  test("Create makefiles", async function() 
  {
    const file = path.join(dirName, 'Makefile');
    tempFiles.push(file);

    fs.writeFileSync(file, "all   : temp.exe\r\n" +
                           "    @echo Building app\r\n" +
                           "clean: t1\r\n" +
                           "    rmdir /q /s ../build\r\n");
  });


  test("Create batch files", async function() 
  {
    const file = path.join(dirName, 'test.bat');
    tempFiles.push(file);

    const file2 = path.join(dirName, 'test2.BAT');
    tempFiles.push(file2);

    fs.writeFileSync(file, "@echo testing batch file\r\n");
    fs.writeFileSync(file2, "@echo testing batch file 2\r\n");
  });


  test("Create grunt task files", async function() 
  {
    const file = path.join(workspace.rootPath, 'GRUNTFILE.js');

    tempFiles.push(file);

    fs.writeFileSync(file, "module.exports = function(grunt) {\n" +
                           "    grunt.registerTask('default', ['jshint:myproject']);\n" +
                           "    grunt.registerTask(\"upload\", ['s3']);\n" +
                           "};\n");
  });


  test("Create vscode task files", async function() 
  {
    const file = path.join(dirNameCode, 'tasks.json');
    tempFiles.push(file);

    fs.writeFileSync(file, '{\n' +
                           '    "version": "2.0.0",\n' +
                           '    "tasks": [\n' +
                           '    {\n' +
                           '        "label": "test1",\n' +
                           '        "type": "shell",\n' +
                           '        "command": "ant.bat",\n' +
                           '        "args": [ "-logger", "org.apache.tools.ant.listener.AnsiColorLogger", "test1" ],\n' +
                           '        "group": "build",\n' +
                           '        "options": {\n' +
                           '            "shell": {\n' +
                           '                "executable": "${env:CODE_HOME}\\ansicon\\x64\\ansicon.exe",\n' +
                           '            }\n' +
                           '        }\n' +
                           '    }]\n' +
                           '}\n');

  });
  

  test("Scan tasks", async function() 
  {
    await timeout(2000);
    //
    // Refresh for better coverage
    //
    treeItems = await treeDataProvider2.getChildren(); // mock explorer open view which would call this function
    await timeout(100);
    await configuration.update('exclude', "**/coveronly/**");
    await treeDataProvider2.refresh();
    treeItems = await treeDataProvider2.getChildren(); // mock explorer open view which would call this function
  });


  test("Verify tree validity and open tasks", async function() 
  {
    let foundAnt: boolean = false;
    let foundGrunt: boolean = false;
    let foundGulp: boolean = false;
    let foundNpm: boolean = false;
    let foundTsc: boolean = false;
    let foundVscode: boolean = false;

    if (treeItems.length > 0)
    {
      let item: any;
      while ((item = treeItems.shift())) {
        try {
          if (item instanceof TaskFolder) 
          {
            let tmp: any = await treeDataProvider2.getParent(item);
            assert(tmp === null, 'Invaid parent type, should be null for TaskFolder');

            let treeFiles: any[] = await treeDataProvider2.getChildren(item);
            if (treeFiles.length > 0) 
            {
              let item2: any;
              while ((item2 = treeFiles.shift())) 
              {
                if (item2 instanceof TaskFile) 
                {
                  tmp = await treeDataProvider2.getParent(item2);
                  assert(tmp instanceof TaskFolder, 'Invaid parent type, should be TaskFolder for TaskFile');

                  let treeTasks: any[] = await treeDataProvider2.getChildren(item2);
                  if (treeTasks.length > 0) 
                  {
                    let item3: any;
                    while ((item3 = treeTasks.shift())) 
                    {
                      if (item3 instanceof TaskItem) 
                      {
                        await commands.executeCommand("taskExplorer.open", item3);

                        tmp = await treeDataProvider2.getParent(item3);
                        assert(tmp instanceof TaskFile, 'Invaid parent type, should be TaskFile for TaskItem');

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
                  else {
                    assert.fail('No tasks found in treefile');
                    return;
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
        } 
        catch (error) { 
          assert.fail('Exception error: ' + error.toString()); 
        }
      }
    }
/*
    if (foundAnt !== true) {
      assert.fail('No ant items found');
    }
    else if (!foundGulp) {
      assert.fail('No gulp items found');
    }
    //else if (!foundGrunt) {
    //  assert.fail('No grunt items found');
    //}
    else if (!foundNpm) {
      assert.fail('No npm items found');
    }
    else if (!foundTsc) {
      assert.fail('No tsc items found');
    }
    else if (!foundVscode) {
      assert.fail('No vscode items found');
    }
*/
  });

});
