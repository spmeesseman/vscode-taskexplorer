/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { workspace, tasks, commands, Uri, ConfigurationTarget, WorkspaceFolder, WorkspaceEdit } from "vscode";
import * as testUtil from "./testUtil";
import { timeout, removeFromArray, forEachMapAsync } from "../common/utils";
import { teApi } from "./extension.test";
import TaskItem from "../tree/item";
import TaskFile from "../tree/file";
import { waitForCache } from "../cache";
import { addWsFolder, removeWsFolder } from "../extension";
import { configuration } from "../common/configuration";
import constants from "../common/constants";


let rootPath = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : undefined;
let dirName: string | undefined;
let dirNameL2: string | undefined;
let ws2DirName: string | undefined;
let dirNameIgn: string | undefined;
let dirNameCode: string | undefined;
const tempFiles: string[] = [];
let didCodeDirExist = false;
let taskMap: Map<string, TaskItem> = new Map();


suite("Task tests", () =>
{

    suiteSetup(async () =>
    {
        rootPath = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : undefined;

        if (!rootPath) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        dirName = path.join(rootPath, "tasks_test_");
        dirNameL2 = path.join(dirName, "subfolder");
        ws2DirName = path.join(rootPath, "ws2");
        dirNameIgn = path.join(rootPath, "tasks_test_ignore_");
        dirNameCode = path.join(rootPath, ".vscode");

        await testUtil.activeExtension();

        //
        // Add some excludes, use both config update and task explorer addExclude command
        // for full coverage.  The 'addExclude' command will add the setting globally though,
        // so add it to the workspace setting as well
        //
        await configuration.updateWs("exclude", ["**/coveronly/**"]);
        await commands.executeCommand("taskExplorer.addToExcludes", "**/tasks_test_ignore_/**", false);

        //
        // Create the temporary project dirs
        //
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { mode: 0o777 });
        }
        if (!fs.existsSync(dirNameL2)) {
            fs.mkdirSync(dirNameL2, { mode: 0o777 });
        }
        if (!fs.existsSync(ws2DirName)) {
            fs.mkdirSync(ws2DirName, { mode: 0o777 });
        }
        if (!fs.existsSync(dirNameIgn)) {
            fs.mkdirSync(dirNameIgn, { mode: 0o777 });
        }
        if (!fs.existsSync(dirNameCode)) {
            fs.mkdirSync(dirNameCode, { mode: 0o777 });
        }
        else {
            didCodeDirExist = true;
        }

        //
        // Workspace folders
        //
        let wsDirName = path.join(rootPath, "newA");
        if (!fs.existsSync(wsDirName)) {
            fs.mkdirSync(wsDirName, { mode: 0o777 });
        }
        wsDirName = path.join(rootPath, "newB");
        if (!fs.existsSync(wsDirName)) {
            fs.mkdirSync(wsDirName, { mode: 0o777 });
        }
        wsDirName = path.join(rootPath, "newC");
        if (!fs.existsSync(wsDirName)) {
            fs.mkdirSync(wsDirName, { mode: 0o777 });
        }
        wsDirName = path.join(rootPath, "newD");
        if (!fs.existsSync(wsDirName)) {
            fs.mkdirSync(wsDirName, { mode: 0o777 });
        }

        const wsf: WorkspaceFolder[] = [
        {
            uri: Uri.parse(ws2DirName),
            name: "ws2",
            index: 1
        },
        {
            uri: Uri.parse(path.join(rootPath, "newC")),
            name: "C Test Workspace",
            index: 2
        },
        {
            uri: Uri.parse(path.join(rootPath, "newB")),
            name: "B Test Workspace",
            index: 3
        },
        {
            uri: Uri.parse(path.join(rootPath, "newA")),
            name: "A Test Workspace",
            index: 4
        },
        {
            uri: Uri.parse(path.join(rootPath, "newD")),
            name: "D Test Workspace",
            index: 5
        }];

        workspace.workspaceFolders?.concat(wsf);
    });


    suiteTeardown(async () =>
    {
        if (tempFiles.length)
        {
            let file: string | undefined;
            while ((file = tempFiles.shift()))
            {
                try {
                    fs.unlinkSync(file);
                }
                catch (error) {
                    console.log(error);
                }
            }

            if (rootPath && dirName)
            {
                if (fs.existsSync(path.join(rootPath, "package-lock.json"))) {
                    try {
                        fs.unlinkSync(path.join(rootPath, "package-lock.json"));
                    }
                    catch (error) {
                        console.log(error);
                    }
                }

                if (fs.existsSync(path.join(dirName, "package-lock.json"))) {
                    try {
                        fs.unlinkSync(path.join(dirName, "package-lock.json"));
                    }
                    catch (error) {
                        console.log(error);
                    }
                }
            }
        }

        if (dirName && ws2DirName && dirNameCode && dirNameIgn && dirNameL2)
        {
            try {
                if (!didCodeDirExist) {
                    fs.rmdirSync(dirNameCode, {
                        recursive: true
                    });
                }
                fs.rmdirSync(ws2DirName, {
                    recursive: true
                });
                fs.rmdirSync(dirNameL2, {
                    recursive: true
                });
                fs.rmdirSync(dirName, {
                    recursive: true
                });
                fs.rmdirSync(dirNameIgn, {
                    recursive: true
                });
            }
            catch (error) {
                console.log(error);
            }
        }

        rootPath = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : undefined;

        if (!rootPath) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        //
        // Workspace folders
        //
        try {
            let wsDirName = path.join(rootPath, "newA");
            if (fs.existsSync(wsDirName)) {
                fs.rmdirSync(wsDirName);
            }
            wsDirName = path.join(rootPath, "newB");
            if (fs.existsSync(wsDirName)) {
                fs.rmdirSync(wsDirName);
            }
            wsDirName = path.join(rootPath, "newC");
            if (fs.existsSync(wsDirName)) {
                fs.rmdirSync(wsDirName);
            }
            wsDirName = path.join(rootPath, "newD");
            if (fs.existsSync(wsDirName)) {
                fs.rmdirSync(wsDirName);
            }
            wsDirName = path.join(rootPath, ".vscode");
            if (fs.existsSync(wsDirName)) {
                fs.rmdirSync(wsDirName, {
                    recursive: true
                });
            }
        }
        catch(error) {
            console.log(error);
        }

        await timeout(3000); // wait for filesystem change events
    });


    test("Create npm package files", async function()
    {
        if (!rootPath || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        const file = path.join(rootPath, "package.json");
        tempFiles.push(file);

        const file2 = path.join(dirName, "package.json");
        tempFiles.push(file2);

        fs.writeFileSync(
            file,
            "{\r\n" +
            '    "name": "vscode-taskexplorer",\r\n' +
            '    "version": "0.0.1",\r\n' +
            '    "scripts":{\r\n' +
            '        "test": "node ./node_modules/vscode/bin/test",\r\n' +
            '        "compile": "cmd.exe /c test.bat",\r\n' +
            '        "install": "npm install",\r\n' +
            '        "watch": "tsc -watch -p ./",\r\n' +
            '        "build": "npx tsc -p ./"\r\n' +
            "    }\r\n" +
            "}\r\n"
        );

        fs.writeFileSync(
            file2,
            "{\r\n" +
            '    "name": "vscode-taskexplorer2",\r\n' +
            '    "version": "0.0.2",\r\n' +
            '    "scripts":{\r\n' +
            '        "test2": "node ./node_modules/vscode/bin/test",\r\n' +
            '        "compile2": "npx tsc -p ../",\r\n' +
            '        "install2": "npm install"\r\n' +
            "    }\r\n" +
            "}\r\n"
        );
    });


    test("Create vscode task files", async function()
    {
        if (!rootPath || !dirNameCode) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        const file = path.join(dirNameCode, "tasks.json");
        tempFiles.push(file);

        fs.writeFileSync(
            file,
            "{\r\n" +
            '    "version": "2.0.0",\r\n' +
            '    "tasks": [\r\n' +
            "    {\r\n" +
            '        "label": "test1",\r\n' +
            '        "type": "shell",\r\n' +
            '        "command": "ant.bat",\r\n' +
            '        "group": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            "$eslint-stylish"\r\n' +
            "        ]\r\n" +
            "    },\r\n" +
            "    {\r\n" +
            '        "type": "npm",\r\n' +
            '        "script": "watch",\r\n' +
            '        "problemMatcher": "$tsc-watch",\r\n' +
            '        "isBackground": true,\r\n' +
            '        "presentation": {\r\n' +
            '            "reveal": "never"\r\n' +
            "        },\r\n" +
            '        "problemMatcher": [\r\n' +
            '            "$tsc-watch"\r\n' +
            "        ],\r\n" +
            '        "group": {\r\n' +
            '            "kind": "build",\r\n' +
            '            "isDefault": true\r\n' +
            "        }\r\n" +
            "    },\r\n" +
            "    {\r\n" +
            '        "type": "npm",\r\n' +
            '        "script": "build",\r\n' +
            '        "group": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            "$tsc"\r\n' +
            "        ]\r\n" +
            "    },\r\n" +
            "    {\r\n" +
            '        "type": "shell",\r\n' +
            '        "label": "build-dev",\r\n' +
            '        "command": "..\\test.bat",\r\n' +
            '        "group": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            "$eslint-stylish"\r\n' +
            "        ]\r\n" +
            "    },\r\n" +
            "    {\r\n" +
            '        "type": "shell",\r\n' +
            '        "label": "build-prod",\r\n' +
            '        "command": "..\\test.bat",\r\n' +
            '        "group": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            "$eslint-stylish"\r\n' +
            "        ]\r\n" +
            "    },\r\n" +
            "    {\r\n" +
            '        "type": "shell",\r\n' +
            '        "label": "..\\test.bat",\r\n' +
            '        "command": "..\\test.bat",\r\n' +
            '        "group": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            $eslint-stylish"\r\n' +
            "        ]\r\n" +
            "    },\r\n" +
            "    {\r\n" +
            '        "type": "shell",\r\n' +
            '        "label": "build-server",\r\n' +
            '        "command": "..\\test.bat",\r\n' +
            '        "group": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            "$eslint-stylish"\r\n' +
            "        ]\r\n" +
            "    }]\r\n" +
            "}\r\n"
        );
    });


    test("Create ant target files", async function()
    {
        if (!rootPath || !dirNameIgn || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        createAntFile();

        const file2 = path.join(dirName, "test.xml");
        const file3 = path.join(dirName, "emptytarget.xml");
        const file4 = path.join(dirName, "emtyproject.xml");
        const file5 = path.join(dirNameIgn, "build.xml");

        tempFiles.push(file2);
        tempFiles.push(file3);
        tempFiles.push(file4);
        tempFiles.push(file5);

        fs.writeFileSync(
            file2,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test2">\n' +
            '    <property name="test2" value="test2" />\n' +
            "    <target name='test3'></target>\n" +
            '    <target name="test4"></target>\n' +
            "</project>\n"
        );

        fs.writeFileSync(
            file3,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test1">\n' +
            '    <property environment="env" />\n' +
            '    <property name="test" value="test" />\n' +
            "</project>\n"
        );

        fs.writeFileSync(file4, '<?xml version="1.0"?>\n');

        fs.writeFileSync(
            file5,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test2">\n' +
            '    <property name="testv" value="testv" />\n' +
            "    <target name='test5'></target>\n" +
            "</project>\n"
        );
    });


    test("Create gradle target files", async function()
    {
        if (!rootPath || !dirNameIgn || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        createGradleFile();

        const file2 = path.join(dirName, "TEST.GRADLE");
        const file3 = path.join(dirNameIgn, "build.gradle");

        tempFiles.push(file2);
        tempFiles.push(file3);

        fs.writeFileSync(
            file2,
            "task fatJar2(type: Jar) {\n" +
            "    manifest {\n" +
            "        attributes 'Implementation-Title': 'Gradle Jar File Example',\n" +
            "            'Implementation-Version': version,\n" +
            "            'Main-Class': 'com.spmeesseman.test'\n" +
            "    }\n" +
            "    baseName = project.name + '-all'\n" +
            "    from { configurations.compile.collect { it.isDirectory() ? it : zipTree(it) } }\n" +
            "    with jar\n" +
            "}\n"
        );

        fs.writeFileSync(
            file3,
            "task fatJar3(type: Jar) {\n" +
            "    manifest {\n" +
            "        attributes 'Implementation-Title': 'Gradle Jar File Example',\n" +
            "            'Implementation-Version': version,\n" +
            "            'Main-Class': 'com.spmeesseman.test'\n" +
            "    }\n" +
            "    baseName = project.name + '-all'\n" +
            "    from { configurations.compile.collect { it.isDirectory() ? it : zipTree(it) } }\n" +
            "    with jar\n" +
            "}\n"
        );

    });


    test("Create tsc config files", async function()
    {
        if (!rootPath || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        const file = path.join(rootPath, "tsconfig.json");
        tempFiles.push(file);
        const file2 = path.join(dirName, "tsconfig.json");
        tempFiles.push(file2);

        fs.writeFileSync(
            file,
            "{\n" +
            '    "compilerOptions":\n' +
            "  {\n" +
            '    "target": "es6",\n' +
            '    "lib": ["es2016"],\n' +
            '    "module": "commonjs",\n' +
            '    "outDir": "./out",\n' +
            '    "typeRoots": ["./node_modules/@types"],\n' +
            '    "strict": true,\n' +
            '    "experimentalDecorators": true,\n' +
            '    "sourceMap": true,\n' +
            '    "noImplicitThis": false\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "}\n"
        );

        fs.writeFileSync(
            file2,
            "{\n" +
            '    "compilerOptions":\n' +
            "  {\n" +
            '    "target": "es6",\n' +
            '    "lib": ["es2016"],\n' +
            '    "module": "commonjs",\n' +
            '    "outDir": "./out",\n' +
            '    "typeRoots": ["./node_modules/@types"],\n' +
            '    "strict": true,\n' +
            '    "experimentalDecorators": true,\n' +
            '    "sourceMap": true,\n' +
            '    "noImplicitThis": false\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "}\n"
        );
    });


    test("Create gulp task files", async function()
    {
        if (!rootPath || !dirNameIgn || !dirName || !dirNameL2) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        createGulpFile();

        const file2 = path.join(dirName, "Gulpfile.js");
        tempFiles.push(file2);

        const file3 = path.join(dirNameIgn, "gulpfile.js");
        tempFiles.push(file3);

        const file4 = path.join(dirName, "GULPFILE.MJS");
        tempFiles.push(file4);

        const file5 = path.join(dirNameL2, "GULPFILE.js");
        tempFiles.push(file5);


        fs.writeFileSync(
            file2,
            "const { series } = require('gulp');\n" +
            "function clean(cb) {\n" +
            "    console.log('clean!!!');\n" +
            "    cb();\n" +
            "};\n" +
            "function build(cb) {" +
            "    console.log('build!!!');\n" +
            "    cb();\n" +
            "};\n" +
            "exports.build = build;\n" +
            'exports["clean"] = clean;\n' +
            "exports.default = series(clean, build);\n"
        );

        fs.writeFileSync(
            file3,
            "var gulp = require('gulp');\n" +
            "gulp.task('hello3', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n" +
            'gulp.task(\n"hello4", (done) => {\n' +
            "    console.log('Hello4!');\n" +
            "    done();\n" +
            "});\n"
        );

        fs.writeFileSync(
            file4,
            "var gulp = require('gulp');\n" +
            "gulp.task('group-test-build-ui-one', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n" +
            'gulp.task(\n"group-test-build-ui-two", (done) => {\n' +
            "    console.log('Hello4!');\n" +
            "    done();\n" +
            "});\n" +
            "gulp.task('group-test-build-ui-three', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n" +
            "gulp.task('group-test-build-ui-four', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n" +
            "gulp.task('group-test-build-ui-five', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n"
        );

        fs.writeFileSync(
            file5,
            "var gulp = require('gulp');\n" +
            "gulp.task('group2-test2-build-ui-one', (done) => {\n" +
            "    console.log('Hello1!');\n" +
            "    done();\n" +
            "});\n" +
            'gulp.task(\n"group2-test2-build-ui-two", (done) => {\n' +
            "    console.log('Hello2!');\n" +
            "    done();\n" +
            "});\n" +
            "gulp.task('group2-test2-build-ui-three', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n" +
            "gulp.task('group2-test2-build-ui-four', (done) => {\n" +
            "    console.log('Hello4!');\n" +
            "    done();\n" +
            "});\n" +
            "gulp.task('group2-test2-build-ui-five', (done) => {\n" +
            "    console.log('Hello5!');\n" +
            "    done();\n" +
            "});\n"
        );
    });


    test("Create makefiles", async function()
    {
        if (!rootPath || !dirNameIgn || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        createMakeFile();

        const file2 = path.join(dirName, "Makefile");
        tempFiles.push(file2);

        const file3 = path.join(dirNameIgn, "Makefile");
        tempFiles.push(file3);

        fs.writeFileSync(
            file2,
            "# all tasks comment\n" +
            "all   : temp.exe\r\n" + "    @echo Building app\r\n" + "clean: t1\r\n" + "    rmdir /q /s ../build\r\n"
        );

        fs.writeFileSync(
            file3,
            "all   : temp.exe\r\n" + "    @echo Building app\r\n" + "clean: t1\r\n" + "    rmdir /q /s ../build\r\n"
        );
    });


    test("Create batch files", async function()
    {
        if (!rootPath || !dirNameIgn || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        createBatchFile();

        const file2 = path.join(dirName, "test2.BAT");
        tempFiles.push(file2);

        const file3 = path.join(dirNameIgn, "test3.bat");
        tempFiles.push(file3);

        fs.writeFileSync(file2, "@echo testing batch file 2\r\ntimeout /t 5\r\n");
        fs.writeFileSync(file3, "@echo testing batch file 3\r\n");
    });


    test("Create bash files", async function()
    {
        if (!rootPath || !dirNameIgn || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        const file = path.join(rootPath, "test.sh");
        tempFiles.push(file);

        const file2 = path.join(dirName, "test2.SH");
        tempFiles.push(file2);

        const file3 = path.join(dirNameIgn, "test3.sh");
        tempFiles.push(file3);

        fs.writeFileSync(file, "echo testing bash file\n");
        fs.writeFileSync(file2, "echo testing bash file 2\n");
        fs.writeFileSync(file3, "echo testing bash file 3\n");
    });


    test("Create grunt task files", async function()
    {
        if (!rootPath || !dirName || !dirNameIgn || !dirNameL2) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        createGruntFile();

        const file2 = path.join(dirName, "Gruntfile.js");
        tempFiles.push(file2);

        const file3 = path.join(dirNameIgn, "Gruntfile.js");
        tempFiles.push(file3);

        const file4 = path.join(dirNameL2, "GRUNTFILE.JS");
        tempFiles.push(file4);

        fs.writeFileSync(
            file2,
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            "};\n"
        );

        fs.writeFileSync(
            file3,
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default3", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload3", ["s3"]);\n' +
            "};\n"
        );

        fs.writeFileSync(
            file4,
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask("grp-test-svr-build1", ["s1"]);\n' +
            '    grunt.registerTask("grp-test-svr-build2", ["s2"]);\n' +
            '    grunt.registerTask("grp-test-svr-build3", ["s3"]);\n' +
            '    grunt.registerTask("grp-test-svr-build4", ["s4"]);\n' +
            '    grunt.registerTask("grp-test-svr-build5", ["s5"]);\n' +
            '    grunt.registerTask("grp-test-svr-build6", ["s6"]);\n' +
            '    grunt.registerTask("grp-test-svr-build7", ["s7"]);\n' +
            "};\n"
        );
    });


    test("Create app-publisher config file", async function()
    {
        if (!rootPath) {
            assert.fail("        ✘ Workspace folder does not exist");
        }
        createAppPublisherFile();
    });


    test("Perform tree construction", async function()
    {
        if (!teApi || !teApi.explorerProvider || !rootPath || !dirNameIgn || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        this.timeout(45 * 1000);

        console.log("    Constructing task tree");

        // Cover getitems before tree is built
        await teApi.explorerProvider.getTaskItems(undefined, "         ", true) as Map<string, TaskItem>;

        if (!teApi || !teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        await timeout(7500); // wait for filesystem change events
        await waitForCache();

        console.log("         ✔ Cache done building");

        await configuration.updateWs("groupWithSeparator", true);
        await configuration.updateWs("groupSeparator", "-");
        await configuration.updateWs("groupMaxLevel", 5);

        //
        // Refresh for better coverage
        //
        await teApi.explorerProvider.refresh("tests");
        await timeout(4000);
        await waitForCache();

        //
        // Check VSCode provided task types for the hell of it
        //
        let npmTasks = await tasks.fetchTasks({ type: "npm" });
        assert(npmTasks.length > 0, "No npm tasks registered");
        npmTasks = await tasks.fetchTasks({ type: "grunt" });
        assert(npmTasks.length > 0, "No grunt tasks registered");
        npmTasks = await tasks.fetchTasks({ type: "gulp" });
        assert(npmTasks.length > 0, "No gulp tasks registered");

        await teApi.explorerProvider.getChildren(undefined, "        "); // mock explorer open view which would call this function
    });


    test("Verify tree validity and open tasks for edit", async function()
    {
        if (!rootPath || !dirNameIgn || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        if (!teApi || !teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        //
        // Scan task tree using internal explorer scanner fn
        //
        console.log("    Scan task tree for tasks");

        taskMap = await teApi.explorerProvider.getTaskItems(undefined, "   ", true) as Map<string, TaskItem>;

        //
        // Find all created tasks in the task tree and ensure the counts are correct.
        //
        // We added some files in the ignored directory, which would make the
        // task counts higher if these files weren't ignored
        //

        console.log("         Finding and counting tasks");

        let taskCount = testUtil.findIdInTaskMap(":ant", taskMap);
        console.log("            Ant          : " + taskCount.toString());
        if (taskCount !== 4) {
            assert.fail("Unexpected Ant task count (Found " + taskCount + " of 4)");
        }

        taskCount = testUtil.findIdInTaskMap(":app-publisher:", taskMap);
        console.log("            App-Publisher: " + taskCount.toString());
        if (taskCount < 6) {
            assert.fail("Unexpected App-Publisher task count (Found " + taskCount + " of 6)");
        }

        taskCount = testUtil.findIdInTaskMap(":bash:", taskMap);
        console.log("            Bash         : " + taskCount.toString());
        if (taskCount !== 2) {
            assert.fail("Unexpected Bash task count (Found " + taskCount + " of 2)");
        }

        taskCount = testUtil.findIdInTaskMap(":batch:", taskMap);
        console.log("            Batch        : " + taskCount.toString());
        if (taskCount !== 2) {
            assert.fail("Unexpected Batch task count (Found " + taskCount + " of 2)");
        }

        taskCount = testUtil.findIdInTaskMap(":gradle:", taskMap);
        console.log("            Gradle       : " + taskCount.toString());
        if (taskCount !== 2) {
            assert.fail("Unexpected Gradle task count (Found " + taskCount + " of 2)");
        }

        taskCount = testUtil.findIdInTaskMap(":grunt:", taskMap);
        console.log("            Grunt        : " + taskCount.toString());
        if (taskCount !== 11) {
            assert.fail("Unexpected Grunt task count (Found " + taskCount + " of 11)");
        }

        taskCount = testUtil.findIdInTaskMap(":gulp:", taskMap);
        console.log("            Gulp         : " + taskCount.toString());
        if (taskCount !== 15) {
            assert.fail("Unexpected Gulp task count (Found " + taskCount + " of 15)");
        }

        //
        // We just wont check NPM files.  If the vascode engine isnt fast enough to
        // provide the tasks once the package.json files are created, then its not
        // out fault
        //
        taskCount = testUtil.findIdInTaskMap(":npm:", taskMap);
        console.log("            NPM          : " + taskCount.toString());
        if (taskCount !== 5) {
            if (taskCount === 0) {
                console.log("            ℹ NPM tasks are not found when running tests locally");
            }
            else {
                assert.fail("Unexpected NPM task count (Found " + taskCount + " of 5)");
            }
        }

        taskCount = testUtil.findIdInTaskMap(":tsc:", taskMap);
        console.log("            TSC          : " + taskCount.toString());
        if (taskCount !== 4) {
            assert.fail("Unexpected Typescript task count (Found " + taskCount + " of 4)");
        }

        taskCount = testUtil.findIdInTaskMap(":Workspace:", taskMap);
        console.log("            VSCode       : " + taskCount.toString());
        if (taskCount !== 7) {
            assert.fail("Unexpected VSCode task count (Found " + taskCount + " of 7)");
        }
    });


    test("Run, pause, open, and stop a task", async function()
    {
        let ranBash = false;
        let ranBatch = false;

        if (!rootPath) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        if (!teApi || !teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        this.timeout(60 * 1000);

        //
        // Just find and task, a batch task, and run all commands on it
        //
        let lastTask: TaskItem;
        await forEachMapAsync(taskMap, async (value: TaskItem) =>
        {
            if (value && value.taskSource === "batch")
            {
                console.log("Run batch task: " + value.label);
                console.log("   Folder: " + value.getFolder()?.name);
                if (lastTask) {
                    await commands.executeCommand("taskExplorer.open", value);
                    await commands.executeCommand("taskExplorer.addRemoveFromFavorites", value);
                    await configuration.updateWs("keepTermOnStop", true);
                    await commands.executeCommand("taskExplorer.run", lastTask);
                    await timeout(1000);
                    await commands.executeCommand("taskExplorer.pause", value);
                    await timeout(1000);
                    await commands.executeCommand("taskExplorer.run", value);
                    await timeout(1000);
                    await commands.executeCommand("taskExplorer.stop", value);
                    //
                    // Cover code that removes a "Last Task" if it was removed
                    //
                    value.taskFile.removeTreeNode(value);
                    await commands.executeCommand("taskExplorer.runLastTask");
                    await commands.executeCommand("taskExplorer.stop", value);
                    value.taskFile.addTreeNode(value);
                }
                await configuration.updateWs("keepTermOnStop", false);
                await commands.executeCommand("taskExplorer.addRemoveFromFavorites", value);
                await commands.executeCommand("taskExplorer.open", value);
                await commands.executeCommand("taskExplorer.runWithArgs", value, "--test --test2");
                await timeout(250);
                await commands.executeCommand("taskExplorer.stop", value);
                await configuration.updateWs("keepTermOnStop", true);
                await commands.executeCommand("taskExplorer.run", value);
                await timeout(250);
                await commands.executeCommand("taskExplorer.pause", value);
                await commands.executeCommand("taskExplorer.run", value);
                await timeout(250);
                await commands.executeCommand("taskExplorer.openTerminal", value);
                await commands.executeCommand("taskExplorer.pause", value);
                await timeout(250);
                await commands.executeCommand("taskExplorer.stop", value);
                await commands.executeCommand("taskExplorer.runLastTask", value);
                await timeout(250);
                await configuration.updateWs("keepTermOnStop", false);
                await commands.executeCommand("taskExplorer.restart", value);
                await timeout(250);
                await commands.executeCommand("taskExplorer.stop", value);
                await commands.executeCommand("taskExplorer.runNoTerm", value);
                await timeout(250);
                await commands.executeCommand("taskExplorer.stop", value);
                if (lastTask) {
                    await commands.executeCommand("taskExplorer.openTerminal", lastTask);
                }
                ranBatch = !!lastTask;
                lastTask = value;
                return !(ranBash && ranBatch); // break foreach
            }
            else if (value && value.taskSource === "bash")
            {
                console.log("Run bash task: " + value.label);
                console.log("   Folder: " + value.getFolder()?.name);
                await commands.executeCommand("taskExplorer.addRemoveFromFavorites", value);
                await commands.executeCommand("taskExplorer.run", value);
                await timeout(2000);
                await workspace.getConfiguration().update("terminal.integrated.shell.windows",
                                                          "bash.exe", ConfigurationTarget.Workspace);
                await commands.executeCommand("taskExplorer.run", value);
                await timeout(2000);
                await workspace.getConfiguration().update("terminal.integrated.shell.windows",
                                                          "C:\\Windows\\System32\\cmd.exe", ConfigurationTarget.Workspace);
                ranBash = true;
                await commands.executeCommand("workbench.action.terminal.new"); // force openTerminal to search through a set of terminals
                await commands.executeCommand("workbench.action.terminal.new"); // force openTerminal to search through a set of terminals
                await commands.executeCommand("taskExplorer.addRemoveFromFavorites", value);
                await commands.executeCommand("taskExplorer.openTerminal", value);
                return !(ranBash && ranBatch); // break foreach
            }
        });

        //
        // Clear Last Tasks folder
        //
        await commands.executeCommand("taskExplorer.clearSpecialFolder", constants.LAST_TASKS_LABEL);
        await commands.executeCommand("taskExplorer.clearSpecialFolder", constants.FAV_TASKS_LABEL);

        //
        // Find an npm file and run an "npm install"
        //
        console.log("    Run npm install");
        let npmRan = false;
        await forEachMapAsync(taskMap, async (value: TaskItem) =>  {
            if (value && value.taskSource === "npm") {
                await commands.executeCommand("taskExplorer.runInstall", value.taskFile);
                npmRan = true;
                return false; // break foreach
            }
        });
        if (!npmRan) {
            console.log("        ℹ Running npm install in local testing env");
            // TODO - how to run with local test ran in vscode dev host?
            // await commands.executeCommand("taskExplorer.runInstall", value.taskFile);
        }
    });


    test("Test add to excludes", async function()
    {
        if (!rootPath) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        if (!teApi || !teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        let taskItems = await tasks.fetchTasks({ type: "grunt" });
        const gruntCt = taskItems.length;

        console.log("    Simulate add to exclude");
        await forEachMapAsync(taskMap, async (value: TaskItem) =>  {
            if (value && value.taskSource === "grunt") {
                await commands.executeCommand("taskExplorer.addToExcludes", value.taskFile, false, false);
                await teApi.explorerProvider?.invalidateTasksCache("grunt", value.taskFile.resourceUri);
                return false; // break forEachMapAsync()
            }
        });

        taskItems = await tasks.fetchTasks({ type: "grunt" });
        if (taskItems.length !== gruntCt - 2) {
            assert.fail("Unexpected Grunt task count (Found " + taskItems.length + " of " +
                        (gruntCt - 2).toString() + ")");
        }
    });


    test("Invalidation tests", async function()
    {
        if (!rootPath || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        if (!teApi || !teApi.explorerProvider || !workspace.workspaceFolders) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        this.timeout(30 * 1000);

        //
        // App-Publisher - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running app-publisher invalidation");
        let file = path.join(rootPath, ".publishrc.json");
        let uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("app-publisher", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("app-publisher", uri);
        await(timeout(1000));
        createAppPublisherFile();
        await teApi.explorerProvider.invalidateTasksCache("app-publisher", uri);
        await(timeout(100));

        //
        // Ant type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running ant invalidation");
        file = path.join(dirName, "build.xml");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("ant", uri);
        await removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("ant", uri);
        await(timeout(1000));
        createAntFile();
        await teApi.explorerProvider.invalidateTasksCache("ant", uri);
        await(timeout(100));

        //
        // Gradle type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running gradle invalidation");
        file = path.join(dirName, "build.gradle");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("gradle", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("gradle", uri);
        await(timeout(1000));
        createGradleFile();
        await teApi.explorerProvider.invalidateTasksCache("gradle", uri);
        await(timeout(100));

        //
        // Grunt type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running grunt invalidation");
        file = path.join(rootPath, "GRUNTFILE.js");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("grunt", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("grunt", uri);
        await(timeout(1000));
        createGruntFile();
        await teApi.explorerProvider.invalidateTasksCache("grunt", uri);
        await(timeout(100));

        //
        // Gulp type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running gulp invalidation");
        file = path.join(rootPath, "gulpfile.js");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("gulp", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.refresh("gulp", uri);
        await(timeout(1000));
        createGulpFile();
        await teApi.explorerProvider.invalidateTasksCache("gulp", uri);
        await(timeout(100));

        //
        // Make type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running makefile invalidation");
        file = path.join(rootPath, "Makefile");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("make", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("make", uri);
        await(timeout(1000));
        createMakeFile();
        await teApi.explorerProvider.refresh("make", uri);
        await(timeout(100));

        //
        // Script type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running script file invalidation");
        file = path.join(rootPath, "test.bat");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("batch", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("batch", uri);
        await(timeout(1000));
        createBatchFile();
        await teApi.explorerProvider.refresh("batch", uri);
        await(timeout(100));

        console.log("    Running all other invalidations");
        await forEachMapAsync(taskMap, async(value: TaskItem) =>  {
            if (value && value.task && teApi && teApi.explorerProvider && value.taskFile.resourceUri) {
                if (fs.existsSync(value.taskFile.resourceUri.fsPath)) {
                    console.log("         Invalidate task type '" + value.taskSource + "'");
                    await teApi.explorerProvider.invalidateTasksCache(value.taskSource, value.task.definition.uri);
                }
            }
            else {
                assert.fail("        ✘ TaskItem definition is incomplete");
            }
        });

        console.log("     Disable all task providers");
        await configuration.updateWs("enableAnt", false);
        await configuration.updateWs("enableAppPublisher", false);
        await configuration.updateWs("enableBash", false);
        await configuration.updateWs("enableBatch", false);
        await configuration.updateWs("enableGradle", false);
        await configuration.updateWs("enableGrunt", false);
        await configuration.updateWs("enableGulp", false);
        await configuration.updateWs("enableMake", false);
        await configuration.updateWs("enableNpm", false);
        await configuration.updateWs("enableNsis", false);
        await configuration.updateWs("enablePowershell", false);
        await configuration.updateWs("enablePerl", false);
        await configuration.updateWs("enablePython", false);
        await configuration.updateWs("enableRuby", false);
        await configuration.updateWs("enableTsc", false);
        await configuration.updateWs("enableWorkspace", false);

        //
        // Cover single-if branches in cache module
        //
        await teApi.fileCache.addFolderToCache();
        await teApi.fileCache.addFolderToCache(workspace.workspaceFolders[0]);

        console.log("     Re-enable all task providers");
        await configuration.updateWs("enableAnt", true);
        await configuration.updateWs("enableAppPublisher", true);
        await configuration.updateWs("enableBash", true);
        await configuration.updateWs("enableBatch", true);
        await configuration.updateWs("enableGradle", true);
        await configuration.updateWs("enableGrunt", true);
        await configuration.updateWs("enableGulp", true);
        await configuration.updateWs("enableMake", true);
        await configuration.updateWs("enableNpm", true);
        await configuration.updateWs("enableNsis", true);
        await configuration.updateWs("enablePowershell", true);
        await configuration.updateWs("enablePerl", true);
        await configuration.updateWs("enablePython", true);
        await configuration.updateWs("enableRuby", true);
        await configuration.updateWs("enableTsc", true);
        await configuration.updateWs("enableWorkspace", true);

        console.log("    Running global invalidation");
        // await commands.executeCommand("taskExplorer.refresh");
        await teApi.explorerProvider.invalidateTasksCache();

        await timeout(1000); // wait for filesystem change events
    });


    test("Test invalidate bash tasks with new bash shell setting", async function()
    {
        if (!teApi || !teApi.explorerProvider || !workspace.workspaceFolders) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        await workspace.getConfiguration().update("terminal.integrated.shell.windows",
                                                  "C:\\Program Files\\Git\\bin\\bash.exe", ConfigurationTarget.Workspace);
        await timeout(1000);
        await teApi.fileCache.buildCache("bash", "bash", constants.GLOB_BASH, workspace.workspaceFolders[0], true);
    });


    test("Test rebuild cache on workspace folder", async function()
    {
        if (!teApi || !teApi.explorerProvider || !workspace.workspaceFolders) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        await teApi.fileCache.buildCache("gulp", "gulp", constants.GLOB_GULP, workspace.workspaceFolders[0], true);
    });


    test("Test show/hide last tasks", async function()
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        console.log("    Show/hide last tasks");
        await teApi.explorerProvider.showSpecialTasks(true);
        await teApi.explorerProvider.showSpecialTasks(false);
        await configuration.updateWs("showLastTasks", false);
        await teApi.explorerProvider.showSpecialTasks(true);
        await teApi.explorerProvider.showSpecialTasks(false);
    });


    test("Test show/hide favorite tasks", async function()
    {
        if (!rootPath || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }
        if (!teApi?.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        console.log("    Show/hide favorite tasks");
        await teApi.explorerProvider.showSpecialTasks(true, true);
        await teApi.explorerProvider.showSpecialTasks(false, true);
    });


    test("Test groups with separator", async function()
    {
        if (!rootPath || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }
        if (!teApi?.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        console.log("    Enable groups with separator and rebuild cache");
        await configuration.updateWs("groupWithSeparator", true);
        await configuration.updateWs("groupSeparator", "-");
        await configuration.updateWs("groupMaxLevel", 5);

        await timeout(2000); // wait for filesystem change events
        await waitForCache();
    });


    test("Test add to excludes after grouping", async function()
    {
        if (!rootPath) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        if (!teApi || !teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        console.log("    Add to exclude after grouping"); // exclude the gulp taks file with the 5 tasks that use grouping

        const taskItemsB4 = await tasks.fetchTasks({ type: "grunt" }),
              gruntCt = taskItemsB4.length;

        await forEachMapAsync(taskMap, async (value: TaskItem) =>
        {
            if (value && value.taskSource === "grunt")
            {
                let taskFile = value.taskFile;
                while (taskFile.treeNodes.length === 1 && taskFile.treeNodes[0] instanceof TaskFile && !taskFile.isGroup)
                {
                    taskFile = taskFile.treeNodes[0];
                }
                if (taskFile && taskFile.isGroup)
                {
                    await commands.executeCommand("taskExplorer.addToExcludes", taskFile, false, false);
                    await teApi.explorerProvider?.invalidateTasksCache("grunt", taskFile.resourceUri);
                    return false; // break forEachMapAsync()
                }
            }
        });

        timeout(500);
        const taskItems = await tasks.fetchTasks({ type: "grunt" });
        timeout(500);
        if (taskItems.length !== gruntCt - 7) { // grunt file that just got ignored had 7 tasks
            assert.fail("Unexpected grunt task count (Found " + taskItems.length + " of " +
                        (gruntCt - 7).toString() + ")");
        }
    });

    test("Test cancel rebuild cache", async function()
    {
        if (!rootPath || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }
        if (!teApi?.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        this.timeout(60 * 1000);
        //
        // Try a bunch of times to cover all of the hooks in the processing loops
        //
        await teApi.fileCache.cancelBuildCache(true);
        teApi.fileCache.rebuildCache();
        await teApi.fileCache.cancelBuildCache(true);
        teApi.fileCache.rebuildCache();
        await timeout(40);
        await teApi.fileCache.cancelBuildCache(true);
        teApi.fileCache.rebuildCache();
        await timeout(75);
        await teApi.fileCache.cancelBuildCache(true);
        teApi.fileCache.rebuildCache();
        await teApi.fileCache.cancelBuildCache(true);
        await teApi.fileCache.rebuildCache();
    });


    test("Test enable and disable views", async function()
    {
        if (!rootPath || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }
        if (!teApi?.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        await configuration.updateWs("enableExplorerView", false);
        await configuration.updateWs("enableSideBar", false);
        await configuration.updateWs("enableExplorerView", true);
        await configuration.updateWs("enableSideBar", true);
        await timeout(5000); // wait for refresh
    });


    test("Add and remove a workspace folder", async function()
    {
        if (!rootPath || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }
        if (!teApi?.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        // Simulate add/remove folder (cannot use workspace.updateWOrkspaceFolders() in tests)
        //
        addWsFolder(workspace.workspaceFolders);
        removeWsFolder(workspace.workspaceFolders);
    });

});


function createAntFile()
{
    if (dirName)
    {
        const file = path.join(dirName, "build.xml");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                '<?xml version="1.0"?>\n' +
                '<project basedir="." default="test1">\n' +
                '    <property environment="env" />\n' +
                '    <property name="test" value="test" />\n' +
                '    <target name="test1" depends="init"></target>\n' +
                '    <target name="test2" depends="init"></target>\n' +
                "</project>\n"
            );
        }
    }
}


function createAppPublisherFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, ".publishrc.json");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                "{\n" +
                '    "version": "1.0.0"\n' +
                '    "branch": "trunk",\n' +
                '    "buildCommand": [],\n' +
                '    "mantisbtRelease": "Y",\n' +
                '    "mantisbtChglogEdit": "N",\n' +
                '    "mantisbtProject": "",\n' +
                '    "repoType": "svn""\n' +
                "}\n"
            );
        }
    }
}


function createBatchFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, "test.bat");
        tempFiles.push(file);
        if (!fs.existsSync(file))
        {
            fs.writeFileSync(file, "@echo testing batch file\r\n");
        }
    }
}


function createGradleFile()
{
    if (dirName)
    {
        const file = path.join(dirName, "build.gradle");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                "task fatJar(type: Jar) {\n" +
                "    manifest {\n" +
                "        attributes 'Implementation-Title': 'Gradle Jar File Example',\n" +
                "            'Implementation-Version': version,\n" +
                "            'Main-Class': 'com.spmeesseman.test'\n" +
                "    }\n" +
                "    baseName = project.name + '-all'\n" +
                "    from { configurations.compile.collect { it.isDirectory() ? it : zipTree(it) } }\n" +
                "    with jar\n" +
                "}\n"
            );
        }
    }
}


function createGruntFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, "GRUNTFILE.js");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                "module.exports = function(grunt) {\n" +
                "    grunt.registerTask(\n'default', ['jshint:myproject']);\n" +
                '    grunt.registerTask("upload", [\'s3\']);\n' +
                "};\n"
            );
        }
    }
}


function createGulpFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, "gulpfile.js");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                "var gulp = require('gulp');\n" +
                "gulp.task(\n'hello', (done) => {\n" +
                "    console.log('Hello!');\n" +
                "    done();\n" +
                "});\n" +
                'gulp.task(\n       "hello2", (done) => {\n' +
                "    done();\n" +
                "});\n"
            );
        }
    }
}


function createMakeFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, "Makefile");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                "all   : temp.exe\r\n" + "    @echo Building app\r\n" + "clean: t1\r\n" + "    rmdir /q /s ../build\r\n"
            );
        }
    }
}
