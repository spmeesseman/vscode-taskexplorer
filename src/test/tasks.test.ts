/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { workspace, Uri, tasks, ConfigurationTarget } from 'vscode';
import * as testUtil from './testUtil';
import { timeout } from '../util';
import { treeDataProvider, treeDataProvider2 } from '../extension';
import { teApi } from './extension.test';
import { TaskItem } from '../tasks';
import { waitForCache } from '../cache';
import { configuration } from "../common/configuration";

let tempFiles: Array<string> = [];
let dirName: string = '';
let dirNameCode: string = '';
let didCodeDirExist: boolean = false;
let taskMap: Map<string, TaskItem> = new Map();


suite('Task tests', () => 
{
    suiteSetup(async () => 
    {
        await testUtil.activeExtension();

        //if (!fs.existsSync("project_dir")) {
        //    fs.mkdirSync("project_dir");
        //}
        //let bSuccess = workspace.updateWorkspaceFolders(0, 0, { uri: Uri.file("/project_dir")});
        //console.log(bSuccess);
        //let f = workspace.getWorkspaceFolder(Uri.file("/project_dir"));
        //console.log(f);
        //console.log(workspace.workspaceFolders[0]);
        //dirName = path.join(workspace.workspaceFolders[0].uri.fsPath, 'tasks_test_');
        //dirNameCode = path.join(workspace.workspaceFolders[0].uri.fsPath, '.vscode');
        //console.log("1");
        //console.log(workspace.rootPath);

        dirName = path.join(workspace.rootPath ? workspace.rootPath  : "", 'tasks_test_');
        dirNameCode = path.join(workspace.rootPath ? workspace.rootPath  : "", '.vscode');
        //console.log(dirName);

        await configuration.updateWs('exclude', ['**/coveronly/**']);

        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { mode: 0o770 });
            //await testUtil.createTempDir(dirName);
        }
        if (!fs.existsSync(dirNameCode)) {
            fs.mkdirSync(dirNameCode, { mode: 0o770 });
        } 
        else {
            didCodeDirExist = true;
        }
    });

    suiteTeardown(() => 
    {
        if (tempFiles.length) {
            let file;
            while ((file = tempFiles.shift())) 
            {
                try {
                    fs.unlinkSync(file);
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
        }
        catch {}
    });


    test('Create npm package files', async function() 
    {
        const file = path.join(workspace.rootPath ? workspace.rootPath  : "", 'package.json');
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
            '        "compile": "npx tsc -p ./",\r\n' +
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
            '    },\r\n' +
            '    {\r\n' +
            '        "type": "npm",\r\n' +
            '        "script": "watch",\r\n' +
            '        "problemMatcher": "$tsc-watch",\r\n' +
            '        "isBackground": true,\r\n' +
            '        "presentation": {\r\n' +
            '            "reveal": "never"\r\n' +
            '        },\r\n' +
            '        "group": {\r\n' +
            '            "kind": "build",\r\n' +
            '            "isDefault": true\r\n' +
            '        }\r\n' +
            '    },\r\n' +
            '    {\r\n' +
            '        "type": "npm",\r\n' +
            '        "script": "build",\r\n' +
            '        "problemMatcher": [\r\n' +
            '            "$tsc"\r\n' +
            '        ]\r\n' +
            '    }]\r\n' +
            '}\r\n'
        );
    });


    test('Create ant target files', async function() 
    {
        const file = path.join(dirName, 'build.xml');
        const file2 = path.join(dirName, 'test.xml');
        const file3 = path.join(dirName, 'emptytarget.xml');
        const file4 = path.join(dirName, 'emtyproject.xml');

        tempFiles.push(file);
        tempFiles.push(file2);
        tempFiles.push(file3);
        tempFiles.push(file4);

        fs.writeFileSync(
            file,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test1">\n' +
            '    <property environment="env" />\n' +
            '    <property name="test" value="test" />\n' +
            '    <target name="test1" depends="init"></target>\n' +
            '    <target name="test2" depends="init"></target>\n' +
            '</project>\n'
        );

        fs.writeFileSync(
            file2,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test2">\n' +
            '    <property name="test2" value="test2" />\n' +
            "    <target name='test3'></target>\n" +
            '    <target name="test4"></target>\n' +
            '</project>\n'
        );

        fs.writeFileSync(
            file3,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test1">\n' +
            '    <property environment="env" />\n' +
            '    <property name="test" value="test" />\n' +
            '</project>\n'
        );

        fs.writeFileSync(file4, '<?xml version="1.0"?>\n');
    });


    test('Create gradle target files', async function() 
    {
        const file = path.join(dirName, 'build.gradle');
        const file2 = path.join(dirName, 'TEST.GRADLE');

        tempFiles.push(file);
        tempFiles.push(file2);

        fs.writeFileSync(
            file,
            'task fatJar(type: Jar) {\n' +
            '    manifest {\n' +
            '        attributes \'Implementation-Title\': \'Gradle Jar File Example\',\n' +  
            '            \'Implementation-Version\': version,\n' +
            '            \'Main-Class\': \'com.spmeesseman.test\'\n' +
            '    }\n' +
            '    baseName = project.name + \'-all\'\n' +
            '    from { configurations.compile.collect { it.isDirectory() ? it : zipTree(it) } }\n' +
            '    with jar\n' +
            '}\n'
        );

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
            '}\n'
        );

    });


    test('Create tsc config files', async function() 
    {
        const file = path.join(workspace.rootPath ? workspace.rootPath  : "", 'tsconfig.json');
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
            '}\n'
        );
    });


    test('Create gulp task files', async function() 
    {
        const file = path.join(workspace.rootPath ? workspace.rootPath  : "", 'gulpfile.js');
        tempFiles.push(file);

        const file2 = path.join(dirName, 'Gulpfile.js');
        tempFiles.push(file2);

        fs.writeFileSync(
            file,
            "var gulp = require('gulp');\n" +
            "gulp.task(\n'hello', (done) => {\n" +
            "    console.log('Hello!');\n" +
            '    done();\n' +
            '});\n' +
            'gulp.task(\n       "hello2", (done) => {\n' +
            '    done();\n' +
            '});\n'
        );

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
            '});\n'
        );
    });


    test('Create makefiles', async function() 
    {
        const file = path.join(workspace.rootPath ? workspace.rootPath  : "", 'Makefile');
        tempFiles.push(file);

        const file2 = path.join(dirName, 'Makefile');
        tempFiles.push(file2);

        fs.writeFileSync(
            file,
            'all   : temp.exe\r\n' + '    @echo Building app\r\n' + 'clean: t1\r\n' + '    rmdir /q /s ../build\r\n'
        );

        fs.writeFileSync(
            file2,
            '# all tasks comment\n' +
            'all   : temp.exe\r\n' + '    @echo Building app\r\n' + 'clean: t1\r\n' + '    rmdir /q /s ../build\r\n'
        );
    });


    test('Create batch files', async function() 
    {
        const file = path.join(workspace.rootPath ? workspace.rootPath  : "", 'test.bat');
        tempFiles.push(file);

        const file2 = path.join(dirName, 'test2.BAT');
        tempFiles.push(file2);

        fs.writeFileSync(file, '@echo testing batch file\r\n');
        fs.writeFileSync(file2, '@echo testing batch file 2\r\n');
    });


    test('Create grunt task files', async function() 
    {
        const file = path.join(workspace.rootPath ? workspace.rootPath  : "", 'GRUNTFILE.js');
        tempFiles.push(file);

        const file2 = path.join(dirName, 'Gruntfile.js');
        tempFiles.push(file2);

        fs.writeFileSync(
            file,
            'module.exports = function(grunt) {\n' +
            "    grunt.registerTask(\n'default', ['jshint:myproject']);\n" +
            '    grunt.registerTask("upload", [\'s3\']);\n' +
            '};\n'
        );

        fs.writeFileSync(
            file2,
            'module.exports = function(grunt) {\n' +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            '};\n'
        );
    });

    test('Create app-publisher config file', async function() 
    {
        const file = path.join(workspace.rootPath ? workspace.rootPath  : "", '.publishrc.json');
        tempFiles.push(file);
    
        fs.writeFileSync(
            file,
            '{\n' +
            '    "version": "1.0.0"\n' +
            '    "branch": "trunk",\n' +
            '    "buildCommand": [],\n' +
            '    "mantisbtRelease": "Y",\n' +
            '    "mantisbtChglogEdit": "N",\n' +
            '    "mantisbtProject": "",\n' +
            '    "repoType": "svn""\n' +
            '}\n'
        );
    });


    test('Perform tree construction', async function() 
    {
        this.timeout(30 * 1000);

        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        await timeout(5000); // wait for filesystem change events
        await waitForCache();

        //
        // Refresh for better coverage
        //
        await teApi.explorerProvider.getChildren(); // mock explorer open view which would call this function
        await timeout(300);
        await configuration.updateWs('exclude', '**/coveronly/**');
        await configuration.updateWs('pathToAnt', 'ant.bat');
        await configuration.updateWs('pathToGradle', 'gradle.bat');
        //await configuration.updateWs('pathToGrunt', 'grunt.bat');
        //await configuration.updateWs('pathToGulp', 'gulp.bat');
        await configuration.updateWs('pathToMake', 'nmake');
        await configuration.updateWs('pathToPerl', 'perl');
        await configuration.updateWs('pathToPython', 'python');
        await configuration.updateWs('pathToPowershell', 'powershell');

        await teApi.explorerProvider.refresh("tests");
        await teApi.explorerProvider.getChildren(); // mock explorer open view which would call this function

        let taskItems = await tasks.fetchTasks({ type: 'npm' });
        assert(taskItems.length > 0, 'No npm tasks registered');

        taskItems = await tasks.fetchTasks({ type: 'ant' });
        assert(taskItems.length > 0, 'No ant tasks registered');

        taskItems = await tasks.fetchTasks({ type: 'grunt' });
        assert(taskItems.length > 0, 'No grunt tasks registered');

        taskItems = await tasks.fetchTasks({ type: 'gulp' });
        assert(taskItems.length > 0, 'No gulp tasks registered');
    });


    test('Verify tree validity and open tasks', async function() 
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
        }

        await scanTasks();

        let taskCount = testUtil.findIdInTaskMap(':ant', taskMap);
        if (taskCount < 4) {
            assert.fail('Unexpected Ant task count (Found ' + taskCount + ' of 4)');
        }
        
        taskCount = testUtil.findIdInTaskMap(':app-publisher:', taskMap);
        if (taskCount < 6) {
            assert.fail('Unexpected App-Publisher task count (Found ' + taskCount + ' of 6)');
        }

        taskCount = testUtil.findIdInTaskMap(':batch:', taskMap);
        if (taskCount < 2) {
            assert.fail('Unexpected App-Publisher task count (Found ' + taskCount + ' of 2)');
        }

        taskCount = testUtil.findIdInTaskMap(':gradle:', taskMap);
        if (taskCount < 2) {
            assert.fail('Unexpected Gradle task count (Found ' + taskCount + ' of 2)');
        }

        taskCount = testUtil.findIdInTaskMap(':gulp:', taskMap);
        if (taskCount < 4) {
            assert.fail('Unexpected Gulp task count (Found ' + taskCount + ' of 4)');
        }

        taskCount = testUtil.findIdInTaskMap(':npm:', taskMap);
        if (taskCount < 6) {
            assert.fail('Unexpected NPM task count (Found ' + taskCount + ' of 6)');
        }

        taskCount = testUtil.findIdInTaskMap(':grunt:', taskMap);
        if (taskCount < 4) {
            assert.fail('Unexpected Grunt task count (Found ' + taskCount + ' of 4)');
        }

        taskCount = testUtil.findIdInTaskMap(':tsc:', taskMap);
        if (taskCount < 2) {
            assert.fail('Unexpected Typescript task count (Found ' + taskCount + ' of 2)');
        }

        taskCount = testUtil.findIdInTaskMap(':Workspace:', taskMap);
        if (taskCount < 3) {
            assert.fail('Unexpected VSCode task count (Found ' + taskCount + ' of 3)');
        }
    });

    test('Invalidation tests', async function() 
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
        }

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
        await configuration.updateWs('enableWorkspace', false);

        taskMap.forEach(async(value: TaskItem) =>  {
            if (value) {
                await teApi.explorerProvider.invalidateTasksCache(value.taskSource, value.task.definition.uri);
            }
        });

        await teApi.explorerProvider.invalidateTasksCache(undefined, undefined);
    });
});


async function scanTasks()
{
    taskMap = await teApi.explorerProvider.getTaskItems(undefined, "   ", true) as Map<string, TaskItem>;
    console.log('    ✔ Scanning complete');
}
