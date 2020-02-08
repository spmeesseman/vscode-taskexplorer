/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { commands, workspace, Uri, tasks } from 'vscode';
import * as testUtil from './testUtil';
import { timeout, setWriteToConsole } from '../util';
import { treeDataProvider2 } from '../extension';
import { TaskFolder } from '../taskFolder';
import { TaskFile } from '../taskFile';
import { TaskItem } from '../taskItem';
import { configuration } from '../common/configuration';

let tempFiles: Array<string> = [];
let dirName: string = '';
let dirNameCode: string = '';
let treeItems: any[] = [];
let didCodeDirExist: boolean = false;
let taskMap: Map<string, Uri> = new Map();


suite('Task tests', () => 
{
    suiteSetup(async () => 
    {
        await testUtil.activeExtension();

        setWriteToConsole(true); // write debug logging from exiension to console
        
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

        await configuration.update('exclude', ['**/coveronly/**']);

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

    suiteTeardown(() => 
    {
        //testUtil.destroyAllTempPaths();
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
        const file = path.join(dirName, 'test.bat');
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


    test('Scan tasks', async function() 
    {
        //addFolderToCache(dirName);

        if (!treeDataProvider2) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        await timeout(3500); // wait for filesystem change events

        //
        // Refresh for better coverage
        //
        treeItems = await treeDataProvider2.getChildren(); // mock explorer open view which would call this function
        await timeout(300);
        await configuration.update('exclude', '**/coveronly/**');
        await configuration.update('pathToAnt', 'ant.bat');
        await configuration.update('pathToGradle', 'gradle.bat');
        //await configuration.update('pathToGrunt', 'grunt.bat');
        //await configuration.update('pathToGulp', 'gulp.bat');
        await configuration.update('pathToMake', 'nmake');
        await configuration.update('pathToPerl', 'perl');
        await configuration.update('pathToPython', 'python');
        await configuration.update('pathToPowershell', 'powershell');
        await treeDataProvider2.refresh();
        treeItems = await treeDataProvider2.getChildren(); // mock explorer open view which would call this function

        let taskItems = await tasks.fetchTasks({ type: 'npm' });
        console.log("npmTASKCOUNT???: " + taskItems.length);
    });


    test('Verify tree validity and open tasks', async function() 
    {
        if (!treeDataProvider2) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
        }

        await scanTasks();

        if (!taskMap.get('ant'))
        {
            assert.fail('No ant items found');
        }
        else if (!taskMap.get('gulp'))
        {
            assert.fail('No gulp items found');
        }
        else if (!taskMap.get('grunt')) 
        {
          assert.fail('No grunt items found');
        }
        else if (!taskMap.get('npm') === undefined)
        {
            assert.fail('No npm items found');
        }
        else if (!taskMap.get('tsc') === undefined)
        {
            assert.fail('No tsc items found');
        }
        else if (!taskMap.get('Workspace') === undefined)
        {
            assert.fail('No vscode items found');
        }
    });

    test('Invalidation tests', async function() 
    {
        if (!treeDataProvider2) {
            assert.fail("        ✘ Task Explorer tree instance does not exist")
        }

        await configuration.update('enableAnt', false);
        await configuration.update('enableAppPublisher', false);
        await configuration.update('enableBash', false);
        await configuration.update('enableBatch', false);
        await configuration.update('enableGradle', false);
        await configuration.update('enableGrunt', false);
        await configuration.update('enableGulp', false);
        await configuration.update('enableMake', false);
        await configuration.update('enableNpm', false);
        await configuration.update('enablePowershell', false);
        await configuration.update('enablePerl', false);
        await configuration.update('enablePython', false);
        await configuration.update('enableRuby', false);
        await configuration.update('enableWorkspace', false);

        await taskMap.forEach(async(value: Uri, key: string) =>  {
            if (value) {
                await treeDataProvider2.invalidateTasksCache(key, value);
            }
        });

        await treeDataProvider2.invalidateTasksCache(undefined, undefined);
    });
});


async function scanTasks()
{
    if (treeItems.length > 0) 
    {
        let item: any;
        while (item = treeItems.shift()) 
        {
            try {
                if (item instanceof TaskFolder) 
                {
                    let tmp: any = await treeDataProvider2.getParent(item);
                    assert(tmp === null, 'Invaid parent type, should be null for TaskFolder');

                    console.log('    Task Folder ' +item.label + ':  ' + item.resourceUri.fsPath);

                    let treeFiles: any[] = await treeDataProvider2.getChildren(item);
                    if (treeFiles.length > 0) 
                    {
                        let item2: any;
                        while ((item2 = treeFiles.shift())) 
                        {
                            if (item2 instanceof TaskFile && !item2.isGroup) 
                            {
                                console.log('        Task File: ' + item2.path + item2.fileName);

                                tmp = await treeDataProvider2.getParent(item2);
                                assert(
                                    tmp instanceof TaskFolder,
                                    'Invaid parent type, should be TaskFolder for TaskFile'
                                );

                                let treeTasks: any[] = await treeDataProvider2.getChildren(item2);

                                if (treeTasks.length > 0) 
                                {
                                    let item3: any;
                                    while ((item3 = treeTasks.shift()))
                                    {
                                        if (item3 instanceof TaskItem) 
                                        {
                                            await commands.executeCommand('taskExplorer.open', item3);
                                            
                                            tmp = await treeDataProvider2.getParent(item3);
                                            assert(
                                                tmp instanceof TaskFile,
                                                'Invaid parent type, should be TaskFile for TaskItem'
                                            );
                                            if (item3.task.definition)
                                            {
                                                let tpath: string = item3.task.definition.uri ? item3.task.definition.uri.fsPath : 
                                                                    (item3.task.definition.path ? item3.task.definition.path : 'root');
                                                console.log('            ✔ Processed ' + item3.label + ':  type ' + item3.taskSource + ' @ ' + tpath);
                                                taskMap.set(item3.taskSource, item3.task.definition.uri ? item3.task.definition.uri : null);
                                            }
                                            else
                                            {
                                                console.log('            ✘ ' + item3.label + 'does not contain a task definition');
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
                            else if (item2 instanceof TaskFile && item2.isGroup) 
                            {
                                let itreeFiles: any[] = await treeDataProvider2.getChildren(item2);
                                if (itreeFiles.length > 0) 
                                {
                                    let item2: any;
                                    while ((item2 = itreeFiles.shift())) 
                                    {
                                        if (item2 instanceof TaskFile && !item2.isGroup) 
                                        {
                                            console.log('        Task File (grouped): ' + item2.path + item2.fileName);

                                            tmp = await treeDataProvider2.getParent(item2);
                                            assert(
                                                tmp instanceof TaskFolder,
                                                'Invaid parent type, should be TaskFolder for TaskFile'
                                            );

                                            let treeTasks: any[] = await treeDataProvider2.getChildren(item2);
                                            if (treeTasks.length > 0) 
                                            {
                                                let item3: any;
                                                while ((item3 = treeTasks.shift()))
                                                {
                                                    if (item3 instanceof TaskItem) 
                                                    {
                                                        await commands.executeCommand('taskExplorer.open', item3);

                                                        tmp = await treeDataProvider2.getParent(item3);
                                                        assert(
                                                            tmp instanceof TaskFile,
                                                            'Invaid parent type, should be TaskFile for TaskItem'
                                                        );
                                                        
                                                        if (item3.task.definition)
                                                        {
                                                            let tpath: string = item3.task.definition.uri ? item3.task.definition.uri.fsPath : 
                                                                    (item3.task.definition.path ? item3.task.definition.path : 'root');
                                                            console.log('            ✔ Processed ' + item3.label + ':  type ' + item3.taskSource + ' @ ' + tpath);
                                                            taskMap.set(item3.taskSource, item3.task.definition.uri ? item3.task.definition.uri : null);
                                                        }
                                                        else
                                                        {
                                                            console.log('            ✘ ' + item3.label + 'does not contain a task definition');
                                                        }

                                                        if (item3.label === 'hello2' && item3.taskSource === 'gulp')
                                                        {
                                                            await commands.executeCommand("taskExplorer.run", item3);
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

        console.log('    ✔ Scanning complete');
    }
}