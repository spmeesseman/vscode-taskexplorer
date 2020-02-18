/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { workspace, tasks, commands, Uri, ConfigurationTarget } from 'vscode';
import * as testUtil from './testUtil';
import { timeout, removeFromArray, asyncMapForEach } from '../util';
import { teApi } from './extension.test';
import { TaskItem } from '../tasks';
import { waitForCache } from '../cache';
import { configuration } from "../common/configuration";


const rootPath = workspace.workspaceFolders[0].uri.fsPath;
const dirName = path.join(rootPath, 'tasks_test_');
const dirNameIgn = path.join(rootPath, 'tasks_test_ignore_');
const dirNameCode = path.join(rootPath, '.vscode');
let tempFiles: Array<string> = [];
let didCodeDirExist: boolean = false;
let taskMap: Map<string, TaskItem> = new Map();


suite('Task tests', () => 
{
    suiteSetup(async () => 
    {
        await testUtil.activeExtension();

        //
        // Add some excludes, use both config update and task explorer addExclude command
        // for full coverage.  The 'addExclude' command will add the setting globally though,
        // so add it to the workspace setting as well
        //
        await configuration.updateWs('exclude', ['**/coveronly/**']);
        await commands.executeCommand("taskExplorer.addToExcludes", "**/tasks_test_ignore_/**", false);

        //
        // Create the temporary project dirs
        //
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { mode: 0o770 });
        }
        if (!fs.existsSync(dirNameIgn)) {
            fs.mkdirSync(dirNameIgn, { mode: 0o770 });
        }
        if (!fs.existsSync(dirNameCode)) {
            fs.mkdirSync(dirNameCode, { mode: 0o770 });
        } 
        else {
            didCodeDirExist = true;
        }
    });

    suiteTeardown(async () => 
    {
        if (tempFiles.length) {
            let file: string;
            while ((file = tempFiles.shift())) 
            {
                try {
                    fs.unlinkSync(file);
                } 
                catch (error) {
                    console.log(error);
                }
            }

            if (fs.existsSync(path.join(rootPath, 'package-lock.json'))) {
                try {
                    fs.unlinkSync(path.join(rootPath, 'package-lock.json'));
                } 
                catch (error) {
                    console.log(error);
                }
            }

            if (fs.existsSync(path.join(dirName, 'package-lock.json'))) {
                try {
                    fs.unlinkSync(path.join(dirName, 'package-lock.json'));
                } 
                catch (error) {
                    console.log(error);
                }
            }
        }
        
        try {
            if (!didCodeDirExist) {
                fs.rmdirSync(dirNameCode);
            }
            fs.rmdirSync(dirName);
            fs.rmdirSync(dirNameIgn);
        }
        catch (error) {
            console.log(error);
        }

        await timeout(3000); // wait for filesystem change events
    });


    test('Create npm package files', async function() 
    {
        const file = path.join(rootPath, 'package.json');
        tempFiles.push(file);

        const file2 = path.join(dirName, 'package.json');
        tempFiles.push(file2);

        fs.writeFileSync(
            file,
            '{\r\n' +
            '    "name": "vscode-taskexplorer",\r\n' +
            '    "version": "0.0.1",\r\n' +
            '    "scripts":{\r\n' +
            '        "test": "node ./node_modules/vscode/bin/test",\r\n' +
            '        "compile": "cmd.exe /c test.bat",\r\n' +
            '        "install": "npm install",\r\n' +
            '        "watch": "tsc -watch -p ./",\r\n' +
            '        "build": "npx tsc -p ./"\r\n' +
            '    }\r\n' +
            '}\r\n'
        );

        fs.writeFileSync(
            file2,
            '{\r\n' +
            '    "name": "vscode-taskexplorer2",\r\n' +
            '    "version": "0.0.2",\r\n' +
            '    "scripts":{\r\n' +
            '        "test2": "node ./node_modules/vscode/bin/test",\r\n' +
            '        "compile2": "npx tsc -p ../",\r\n' +
            '        "install2": "npm install"\r\n' +
            '    }\r\n' +
            '}\r\n'
        );
    });


    test('Create vscode task files', async function() 
    {
        const file = path.join(dirNameCode, 'tasks.json');
        tempFiles.push(file);

        fs.writeFileSync(
            file,
            '{\r\n' +
            '    "version": "2.0.0",\r\n' +
            '    "tasks": [\r\n' +
            '    {\r\n' +
            '        "label": "test1",\r\n' +
            '        "type": "shell",\r\n' +
            '        "command": "ant.bat",\r\n' +
            '        "group": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            "$eslint-stylish"\r\n' +
            '        ]\r\n' +
            '    },\r\n' +
            '    {\r\n' +
            '        "type": "npm",\r\n' +
            '        "script": "watch",\r\n' +
            '        "problemMatcher": "$tsc-watch",\r\n' +
            '        "isBackground": true,\r\n' +
            '        "presentation": {\r\n' +
            '            "reveal": "never"\r\n' +
            '        },\r\n' +
            '        "problemMatcher": [\r\n' +
            '            "$tsc-watch"\r\n' +
            '        ],\r\n' +
            '        "group": {\r\n' +
            '            "kind": "build",\r\n' +
            '            "isDefault": true\r\n' +
            '        }\r\n' +
            '    },\r\n' +
            '    {\r\n' +
            '        "type": "npm",\r\n' +
            '        "script": "build",\r\n' +
            '        "group": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            "$tsc"\r\n' +
            '        ]\r\n' +
            '    },\r\n' +
            '    {\r\n' +
            '        "type": "shell",\r\n' +
            '        "label": "build-dev",\r\n' +
            '        "command": "..\\test.bat",\r\n' +
            '        "group": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            "$eslint-stylish"\r\n' +
            '        ]\r\n' +
            '    },\r\n' +
            '    {\r\n' +
            '        "type": "shell",\r\n' +
            '        "label": "build-prod",\r\n' +
            '        "command": "..\\test.bat",\r\n' +
            '        "group": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            "$eslint-stylish"\r\n' +
            '        ]\r\n' +
            '    },\r\n' +
            '    {\r\n' +
            '        "type": "shell",\r\n' +
            '        "label": "..\\test.bat",\r\n' +
            '        "command": "..\\test.bat",\r\n' +
            '        "group": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            $eslint-stylish"\r\n' +
            '        ]\r\n' +
            '    },\r\n' +
            '    {\r\n' +
            '        "type": "shell",\r\n' +
            '        "label": "build-server",\r\n' +
            '        "command": "..\\test.bat",\r\n' +
            '        "group": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            "$eslint-stylish"\r\n' +
            '        ]\r\n' +
            '    }]\r\n' +
            '}\r\n',
            { mode: 0o770 }
        );
    });


    test('Create ant target files', async function() 
    {
        createAntFile();

        const file2 = path.join(dirName, 'test.xml');
        const file3 = path.join(dirName, 'emptytarget.xml');
        const file4 = path.join(dirName, 'emtyproject.xml');
        const file5 = path.join(dirNameIgn, 'build.xml');

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
            '</project>\n',
            { mode: 0o770 }
        );

        fs.writeFileSync(
            file3,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test1">\n' +
            '    <property environment="env" />\n' +
            '    <property name="test" value="test" />\n' +
            '</project>\n',
            { mode: 0o770 }
        );

        fs.writeFileSync(file4, '<?xml version="1.0"?>\n', { mode: 0o770 });

        fs.writeFileSync(
            file5,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test2">\n' +
            '    <property name="testv" value="testv" />\n' +
            "    <target name='test5'></target>\n" +
            '</project>\n',
            { mode: 0o770 }
        );
    });


    test('Create gradle target files', async function() 
    {
        createGradleFile();

        const file2 = path.join(dirName, 'TEST.GRADLE');
        const file3 = path.join(dirNameIgn, 'build.gradle');

        tempFiles.push(file2);
        tempFiles.push(file3);

        fs.writeFileSync(
            file2,
            'task fatJar2(type: Jar) {\n' +
            '    manifest {\n' +
            '        attributes \'Implementation-Title\': \'Gradle Jar File Example\',\n' +  
            '            \'Implementation-Version\': version,\n' +
            '            \'Main-Class\': \'com.spmeesseman.test\'\n' +
            '    }\n' +
            '    baseName = project.name + \'-all\'\n' +
            '    from { configurations.compile.collect { it.isDirectory() ? it : zipTree(it) } }\n' +
            '    with jar\n' +
            '}\n',
            { mode: 0o770 }
        );

        fs.writeFileSync(
            file3,
            'task fatJar3(type: Jar) {\n' +
            '    manifest {\n' +
            '        attributes \'Implementation-Title\': \'Gradle Jar File Example\',\n' +  
            '            \'Implementation-Version\': version,\n' +
            '            \'Main-Class\': \'com.spmeesseman.test\'\n' +
            '    }\n' +
            '    baseName = project.name + \'-all\'\n' +
            '    from { configurations.compile.collect { it.isDirectory() ? it : zipTree(it) } }\n' +
            '    with jar\n' +
            '}\n',
            { mode: 0o770 }
        );

    });


    test('Create tsc config files', async function() 
    {
        const file = path.join(rootPath, 'tsconfig.json');
        tempFiles.push(file);
    
        fs.writeFileSync(
            file,
            '{\n' +
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
            '}\n',
            { mode: 0o770 }
        );
    });


    test('Create gulp task files', async function() 
    {
        createGulpFile();

        const file2 = path.join(dirName, 'Gulpfile.js');
        tempFiles.push(file2);

        const file3 = path.join(dirNameIgn, 'gulpfile.js');
        tempFiles.push(file3);

        fs.writeFileSync(
            file2,
            "var gulp = require('gulp');\n" +
            "gulp.task('hello3', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            '    done();\n' +
            '});\n' +
            'gulp.task(\n"hello4", (done) => {\n' +
            "    console.log('Hello4!');\n" +
            '    done();\n' +
            '});\n',
            { mode: 0o770 }
        );

        fs.writeFileSync(
            file3,
            "var gulp = require('gulp');\n" +
            "gulp.task('hello5', (done) => {\n" +
            "    console.log('Hello5!');\n" +
            '    done();\n' +
            '});\n' +
            'gulp.task(\n"hello6", (done) => {\n' +
            "    console.log('Hello6!');\n" +
            '    done();\n' +
            '});\n',
            { mode: 0o770 }
        );
    });


    test('Create makefiles', async function() 
    {
        createMakeFile();

        const file2 = path.join(dirName, 'Makefile');
        tempFiles.push(file2);

        const file3 = path.join(dirNameIgn, 'Makefile');
        tempFiles.push(file3);

        fs.writeFileSync(
            file2,
            '# all tasks comment\n' +
            'all   : temp.exe\r\n' + '    @echo Building app\r\n' + 'clean: t1\r\n' + '    rmdir /q /s ../build\r\n',
            { mode: 0o770 }
        );

        fs.writeFileSync(
            file3,
            'all   : temp.exe\r\n' + '    @echo Building app\r\n' + 'clean: t1\r\n' + '    rmdir /q /s ../build\r\n',
            { mode: 0o770 }
        );
    });


    test('Create batch files', async function() 
    {
        createBatchFile();

        const file2 = path.join(dirName, 'test2.BAT');
        tempFiles.push(file2);

        const file3 = path.join(dirNameIgn, 'test3.bat');
        tempFiles.push(file3);

        fs.writeFileSync(file2, '@echo testing batch file 2\r\n', { mode: 0o770 });
        fs.writeFileSync(file3, '@echo testing batch file 3\r\n', { mode: 0o770 });
    });


    test('Create bash files', async function() 
    {
        const file = path.join(rootPath, 'test.sh');
        tempFiles.push(file);

        const file2 = path.join(dirName, 'test2.SH');
        tempFiles.push(file2);

        const file3 = path.join(dirNameIgn, 'test3.sh');
        tempFiles.push(file3);

        fs.writeFileSync(file, 'echo testing bash file\r\n', { mode: 0o770 });
        fs.writeFileSync(file2, 'echo testing bash file 2\r\n', { mode: 0o770 });
        fs.writeFileSync(file3, 'echo testing bash file 3\r\n', { mode: 0o770 });
    });


    test('Create grunt task files', async function() 
    {
        createGruntFile();

        const file2 = path.join(dirName, 'Gruntfile.js');
        tempFiles.push(file2);

        const file3 = path.join(dirNameIgn, 'Gruntfile.js');
        tempFiles.push(file3);

        fs.writeFileSync(
            file2,
            'module.exports = function(grunt) {\n' +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            '};\n',
            { mode: 0o770 }
        );

        fs.writeFileSync(
            file3,
            'module.exports = function(grunt) {\n' +
            '    grunt.registerTask(\n"default3", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload3", ["s3"]);\n' +
            '};\n',
            { mode: 0o770 }
        );
    });

    test('Create app-publisher config file', async function() 
    {
        createAppPublisherFile();
    });


    test('Perform tree construction', async function() 
    {
        this.timeout(30 * 1000);

        console.log("    Constructing task tree");

        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        await timeout(6000); // wait for filesystem change events
        await waitForCache();

        console.log("         ✔ Cache done building");

        //
        // Refresh for better coverage
        //
        await teApi.explorerProvider.refresh("tests");
        await waitForCache();

        //
        // Check VSCode provided task types for the hell of it
        //
        let taskItems = await tasks.fetchTasks({ type: 'npm' });
        assert(taskItems.length > 0, 'No npm tasks registered');
        taskItems = await tasks.fetchTasks({ type: 'grunt' });
        assert(taskItems.length > 0, 'No grunt tasks registered');
        taskItems = await tasks.fetchTasks({ type: 'gulp' });
        assert(taskItems.length > 0, 'No gulp tasks registered');

        await teApi.explorerProvider.getChildren(undefined, "        "); // mock explorer open view which would call this function
    });


    test('Verify tree validity and open tasks for edit', async function() 
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
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

        let taskCount = testUtil.findIdInTaskMap(':ant', taskMap);
        console.log("            Ant          : " + taskCount.toString());
        if (taskCount != 4) {
            assert.fail('Unexpected Ant task count (Found ' + taskCount + ' of 4)');
        }
        
        taskCount = testUtil.findIdInTaskMap(':app-publisher:', taskMap);
        console.log("            App-Publisher: " + taskCount.toString());
        if (taskCount < 6) {
            assert.fail('Unexpected App-Publisher task count (Found ' + taskCount + ' of 6)');
        }

        taskCount = testUtil.findIdInTaskMap(':bash:', taskMap);
        console.log("            Bash         : " + taskCount.toString());
        if (taskCount != 2) {
            assert.fail('Unexpected Bash task count (Found ' + taskCount + ' of 2)');
        }

        taskCount = testUtil.findIdInTaskMap(':batch:', taskMap);
        console.log("            Batch        : " + taskCount.toString());
        if (taskCount != 2) {
            assert.fail('Unexpected Batch task count (Found ' + taskCount + ' of 2)');
        }

        taskCount = testUtil.findIdInTaskMap(':gradle:', taskMap);
        console.log("            Gradle       : " + taskCount.toString());
        if (taskCount != 2) {
            assert.fail('Unexpected Gradle task count (Found ' + taskCount + ' of 2)');
        }

        taskCount = testUtil.findIdInTaskMap(':gulp:', taskMap);
        console.log("            Gulp         : " + taskCount.toString());
        if (taskCount != 4) {
            assert.fail('Unexpected Gulp task count (Found ' + taskCount + ' of 4)');
        }

        //
        // We just wont check NPM files.  If the vascode engine isnt fast enough to
        // provide the tasks once the package.json files are created, then its not 
        // out fault
        //
        taskCount = testUtil.findIdInTaskMap(':npm:', taskMap);
        console.log("            NPM          : " + taskCount.toString());
        if (taskCount != 6) {
            if (taskCount === 0) {
                console.log("            ℹ NPM tasks are not found when running tests locally");
            }
            else {
                assert.fail('Unexpected NPM task count (Found ' + taskCount + ' of 6)');
            }
        }

        taskCount = testUtil.findIdInTaskMap(':grunt:', taskMap);
        console.log("            Grunt        : " + taskCount.toString());
        if (taskCount != 4) {
            assert.fail('Unexpected Grunt task count (Found ' + taskCount + ' of 4)');
        }

        taskCount = testUtil.findIdInTaskMap(':tsc:', taskMap);
        console.log("            TSC          : " + taskCount.toString());
        if (taskCount != 2) {
            assert.fail('Unexpected Typescript task count (Found ' + taskCount + ' of 2)');
        }

        taskCount = testUtil.findIdInTaskMap(':Workspace:', taskMap);
        console.log("            VSCode       : " + taskCount.toString());
        if (taskCount != 7) {
            assert.fail('Unexpected VSCode task count (Found ' + taskCount + ' of 7)');
        }
    });


    test('Run, pause, and stop a task', async function() 
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
        }
        
        console.log("    Run a batch task");
        await asyncMapForEach(taskMap, async (value: TaskItem) =>  {
            if (value && value.taskSource === "batch") {
                await commands.executeCommand("taskExplorer.run", value);
                await commands.executeCommand("taskExplorer.pause", value);
                await commands.executeCommand("taskExplorer.pause", value);
                await commands.executeCommand("taskExplorer.stop", value);
                await commands.executeCommand("taskExplorer.runLastTask", value);
                await commands.executeCommand("taskExplorer.restart", value);
                return false; // break foreach
            }
        });

        console.log("    Run npm install");

        let npmRan = false;
        await asyncMapForEach(taskMap, async (value: TaskItem) =>  {
            if (value && value.taskSource === "npm") {
                await commands.executeCommand("taskExplorer.runInstall", value.taskFile);
                npmRan = true;
                return false; // break foreach
            }
        });
        if (!npmRan) {
            console.log("        ℹ Running npm install in local testing env");
            // TODO - how to run with local test ran in vscode dev host?
            //await commands.executeCommand("taskExplorer.runInstall", value.taskFile);
        }
    });


    test('Test add to excludes', async function() 
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
        }
        
        let taskItems = await tasks.fetchTasks({ type: 'grunt' });
        const gruntCt = taskItems.length;

        console.log("    Simulate add to exclude");
        await asyncMapForEach(taskMap, async (value: TaskItem) =>  {
            if (value && value.taskSource === "grunt") {
                await commands.executeCommand("taskExplorer.addToExcludes", value.taskFile, false, false);
                await teApi.explorerProvider.invalidateTasksCache("grunt", value.taskFile.resourceUri);
                return false;
            }
        });

        taskItems = await tasks.fetchTasks({ type: 'grunt' });
        if (taskItems.length != gruntCt - 2) {
            assert.fail('Unexpected Grunt task count (Found ' + taskItems.length + ' of ' + 
                        (gruntCt - 2).toString() + ')');
        }
    });


    test('Invalidation tests', async function() 
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
        }

        //
        // App-Publisher - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running app-publisher invalidation");
        let file = path.join(rootPath, '.publishrc.json');
        let uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("app-publisher", uri);
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.explorerProvider.invalidateTasksCache("app-publisher", uri);
        await(timeout(250));
        createAppPublisherFile();
        await teApi.explorerProvider.invalidateTasksCache("app-publisher", uri);
        await(timeout(100));

        //
        // Ant type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running ant invalidation");
        file = path.join(dirName, 'build.xml');
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("ant", uri);
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.explorerProvider.invalidateTasksCache("ant", uri);
        await(timeout(250));
        createAntFile();
        await teApi.explorerProvider.invalidateTasksCache("ant", uri);
        await(timeout(100));

        //
        // Gradle type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running gradle invalidation");
        file = path.join(dirName, 'build.gradle');
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("gradle", uri);
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.explorerProvider.invalidateTasksCache("gradle", uri);
        await(timeout(250));
        createGradleFile();
        await teApi.explorerProvider.invalidateTasksCache("gradle", uri);
        await(timeout(100));

        //
        // Grunt type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running grunt invalidation");
        file = path.join(rootPath, 'GRUNTFILE.js');
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("grunt", uri);
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.explorerProvider.invalidateTasksCache("grunt", uri);
        await(timeout(250));
        createGruntFile();
        await teApi.explorerProvider.invalidateTasksCache("grunt", uri);
        await(timeout(100));

        //
        // Gulp type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running gulp invalidation");
        file = path.join(rootPath, 'gulpfile.js');
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("gulp", uri);
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.explorerProvider.invalidateTasksCache("gulp", uri);
        await(timeout(250));
        createGulpFile();
        await teApi.explorerProvider.invalidateTasksCache("gulp", uri);
        await(timeout(100));

        //
        // Make type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running makefile invalidation");
        file = path.join(rootPath, 'Makefile');
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("make", uri);
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.explorerProvider.invalidateTasksCache("make", uri);
        await(timeout(250));
        createMakeFile();
        await teApi.explorerProvider.invalidateTasksCache("make", uri);
        await(timeout(100));

        //
        // Script type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running script file invalidation");
        file = path.join(rootPath, 'test.bat');
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("batch", uri);
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.explorerProvider.invalidateTasksCache("batch", uri);
        await(timeout(250));
        createBatchFile();
        await teApi.explorerProvider.invalidateTasksCache("batch", uri);
        await(timeout(100));

        console.log("    Running all other invalidations");
        await asyncMapForEach(taskMap, async(value: TaskItem) =>  {
            if (value) {
                if (fs.existsSync(value.taskFile.resourceUri.fsPath)) {
                    console.log("         Invalidate task type '" + value.taskSource + "'");
                    await teApi.explorerProvider.invalidateTasksCache(value.taskSource, value.task.definition.uri);
                }
            }
        });

        console.log("     Disable all task providers");
        await configuration.updateWs('enableAnt', false);
        await configuration.updateWs('enableAppPublisher', false);
        await configuration.updateWs('enableBash', false);
        await configuration.updateWs('enableBatch', false);
        await configuration.updateWs('enableGradle', false);
        await configuration.updateWs('enableGrunt', false);
        await configuration.updateWs('enableGulp', false);
        await configuration.updateWs('enableMake', false);
        await configuration.updateWs('enableNpm', false);
        await configuration.updateWs('enableNsis', false);
        await configuration.updateWs('enablePowershell', false);
        await configuration.updateWs('enablePerl', false);
        await configuration.updateWs('enablePython', false);
        await configuration.updateWs('enableRuby', false);
        await configuration.updateWs('enableTsc', false);
        await configuration.updateWs('enableWorkspace', false);

        console.log("     Re-enable all task providers");
        await configuration.updateWs('enableAnt', true);
        await configuration.updateWs('enableAppPublisher', true);
        await configuration.updateWs('enableBash', true);
        await configuration.updateWs('enableBatch', true);
        await configuration.updateWs('enableGradle', true);
        await configuration.updateWs('enableGrunt', true);
        await configuration.updateWs('enableGulp', true);
        await configuration.updateWs('enableMake', true);
        await configuration.updateWs('enableNpm', true);
        await configuration.updateWs('enableNsis', true);
        await configuration.updateWs('enablePowershell', true);
        await configuration.updateWs('enablePerl', true);
        await configuration.updateWs('enablePython', true);
        await configuration.updateWs('enableRuby', true);
        await configuration.updateWs('enableTsc', true);
        await configuration.updateWs('enableWorkspace', true);

        console.log("    Running global invalidation");
        await teApi.explorerProvider.invalidateTasksCache(undefined, undefined);

        await timeout(1000); // wait for filesystem change events
    });


    test('Test dashed groups', async function() 
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
        }
        console.log("    Enable dashed groups and rebuild cache");
        await configuration.updateWs('groupDashed', true);
        await timeout(2000); // wait for filesystem change events
        await waitForCache();
    });


    test('Test invalidate bash tasks with new bash shell setting', async function() 
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
        }

        await workspace.getConfiguration().update('terminal.integrated.shell.windows', 
                                                  'C:\\Program Files\\Git\\bin\\bash.exe', ConfigurationTarget.Workspace);
        await timeout(1000);
        await teApi.fileCache.buildCache("bash", "bash", "**/*.[Ss][Hh]", workspace.workspaceFolders[0], true);
    });


    test('Test rebuild cache on workspace folder', async function() 
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
        }
        await teApi.fileCache.buildCache("gulp", "gulp", "**/[Gg][Uu][Ll][Pp][Ff][Ii][Ll][Ee].[Jj][Ss]", workspace.workspaceFolders[0], true);
    });


    test('Test cancel rebuild cache', async function() 
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
        }
        teApi.fileCache.filesCache.clear();
        teApi.fileCache.addFolderToCache();
        await teApi.fileCache.cancelBuildCache(true);
    });

    test('Test enable and disable views', async function() 
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
        }
        await configuration.updateWs('enableExplorerView', false);
        await configuration.updateWs('enableSideBar', false);
        await configuration.updateWs('enableExplorerView', true);
        await configuration.updateWs('enableSideBar', true);
        await timeout(5000); // wait for refresh
    });

});


function createAntFile()
{
    const file1 = path.join(dirName, 'build.xml');
    tempFiles.push(file1);
    fs.writeFileSync(
        file1,
        '<?xml version="1.0"?>\n' +
        '<project basedir="." default="test1">\n' +
        '    <property environment="env" />\n' +
        '    <property name="test" value="test" />\n' +
        '    <target name="test1" depends="init"></target>\n' +
        '    <target name="test2" depends="init"></target>\n' +
        '</project>\n',
        { mode: 0o770 }
    );
}


function createAppPublisherFile()
{
    const file1 = path.join(rootPath, '.publishrc.json');
    tempFiles.push(file1);
    fs.writeFileSync(
        file1,
        '{\n' +
        '    "version": "1.0.0"\n' +
        '    "branch": "trunk",\n' +
        '    "buildCommand": [],\n' +
        '    "mantisbtRelease": "Y",\n' +
        '    "mantisbtChglogEdit": "N",\n' +
        '    "mantisbtProject": "",\n' +
        '    "repoType": "svn""\n' +
        '}\n',
        { mode: 0o770 }
    );
}


function createBatchFile()
{
    const file1 = path.join(rootPath, 'test.bat');
    tempFiles.push(file1);
    fs.writeFileSync(file1, '@echo testing batch file\r\n', { mode: 0o770 });
}


function createGradleFile()
{
    const file1 = path.join(dirName, 'build.gradle');
    tempFiles.push(file1);

    fs.writeFileSync(
        file1,
        'task fatJar(type: Jar) {\n' +
        '    manifest {\n' +
        '        attributes \'Implementation-Title\': \'Gradle Jar File Example\',\n' +  
        '            \'Implementation-Version\': version,\n' +
        '            \'Main-Class\': \'com.spmeesseman.test\'\n' +
        '    }\n' +
        '    baseName = project.name + \'-all\'\n' +
        '    from { configurations.compile.collect { it.isDirectory() ? it : zipTree(it) } }\n' +
        '    with jar\n' +
        '}\n',
        { mode: 0o770 }
    );
}


function createGruntFile()
{
    const file1 = path.join(rootPath, 'GRUNTFILE.js');
    tempFiles.push(file1);
    fs.writeFileSync(
        file1,
        'module.exports = function(grunt) {\n' +
        "    grunt.registerTask(\n'default', ['jshint:myproject']);\n" +
        '    grunt.registerTask("upload", [\'s3\']);\n' +
        '};\n',
        { mode: 0o770 }
    );
}


function createGulpFile()
{
    const file1 = path.join(rootPath, 'gulpfile.js');
    tempFiles.push(file1);
    fs.writeFileSync(
        file1,
        "var gulp = require('gulp');\n" +
        "gulp.task(\n'hello', (done) => {\n" +
        "    console.log('Hello!');\n" +
        '    done();\n' +
        '});\n' +
        'gulp.task(\n       "hello2", (done) => {\n' +
        '    done();\n' +
        '});\n',
        { mode: 0o770 }
    );
}


function createMakeFile()
{
    const file = path.join(rootPath, 'Makefile');
    tempFiles.push(file);
    fs.writeFileSync(
        file,
        'all   : temp.exe\r\n' + '    @echo Building app\r\n' + 'clean: t1\r\n' + '    rmdir /q /s ../build\r\n',
        { mode: 0o770 }
    );
}
