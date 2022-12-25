/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import TaskItem from "../../tree/item";
import TaskFile from "../../tree/file";
import constants from "../../common/constants";
import { expect } from "chai";
import { workspace, tasks, commands, Uri, WorkspaceFolder } from "vscode";
import { removeFromArray } from "../../common/utils";
import { waitForCache } from "../../cache";
import { addWsFolder, removeWsFolder } from "../../extension";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { configuration } from "../../common/configuration";
import { activate, findIdInTaskMap, getTreeTasks, refresh, sleep } from "../helper";
import { storage } from "../../common/storage";


let teApi: TaskExplorerApi;
let rootPath: string;
let dirName: string;
let dirNameL2: string;
let ws2DirName: string;
let dirNameIgn: string;
let batch: TaskItem[];
const tempFiles: string[] = [];
let taskMap: Map<string, TaskItem>;


suite("Provider Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);

        rootPath = (workspace.workspaceFolders as WorkspaceFolder[])[0].uri.fsPath;
        if (!rootPath) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        dirName = path.join(rootPath, "tasks_test_");
        dirNameL2 = path.join(dirName, "subfolder");
        ws2DirName = path.join(rootPath, "ws2");
        dirNameIgn = path.join(rootPath, "tasks_test_ignore_");

        //
        // Add some excludes, use both config update and task explorer addExclude command
        // for full coverage.  The 'addExclude' command will add the setting globally though,
        // so add it to the workspace setting as well
        //
        await configuration.updateWs("exclude", [ "**/tasks_test_ignore_/**", "**/ant/**" ]);
        await commands.executeCommand("taskExplorer.addToExcludes", "**/tasks_test_ignore_/**");

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

        //
        // New Workspace folders
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
        //
        // Merge VSCode ws folders
        //
        (workspace.workspaceFolders as WorkspaceFolder[]).concat(wsf);

        //
        // Do work son
        //
        await teApi.explorer?.getTaskItems(undefined, "         ", true) as Map<string, TaskItem>;
        setupAnt(); setupGradle(); setupTsc(); setupMakefile();
        setupBash(); setupBatch(); setupGrunt(); setupGulp(); setupAppPublisher(); setupMaven();

        batch = await getTreeTasks("batch", 2);
    });


    suiteTeardown(async function()
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
        }

        if (dirName && ws2DirName && dirNameIgn && dirNameL2)
        {
            try {
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
        }
        catch(error) {
            console.log(error);
        }

        await sleep(3000); // wait for filesystem change events
    });


    test("Build Tree", async function()
    {
        this.timeout(45000);
        await buildTree(this, 7500);
        //
        // Check VSCode provided task types for the hell of it
        //
        let nTasks = await tasks.fetchTasks({ type: "grunt" });
        assert(nTasks.length > 0, "No grunt tasks registered");
        nTasks = await tasks.fetchTasks({ type: "gulp" });
        assert(nTasks.length > 0, "No gulp tasks registered");
    });


    test("Build Tree Variations  - Last Tasks Collapsed", async function()
    {
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []);
        const showLasTasks = configuration.get<boolean>("showLastTasks");
        try {
            await storage.update(constants.FAV_TASKS_STORE, [ "hello.bat" ]);
            await storage.update(constants.LAST_TASKS_STORE, [ "hello.bat" ]);
            await configuration.updateWs("showLastTasks", true);
            await configuration.updateWs("expanded.lastTasks", false);
            expect(await teApi.explorer.buildTaskTree([])).to.be.an("array").that.has.a.lengthOf(2);
        }
        catch (e) {
            throw e;
        }
        finally {
            await configuration.updateWs("expanded.lastTasks", true);
            await configuration.updateWs("showLastTasks", showLasTasks);
            await storage.update(constants.FAV_TASKS_STORE, favTasks);
            await storage.update(constants.LAST_TASKS_STORE, lastTasks);
        }
    });


    test("Build Tree Variations - Favorites Collapsed", async function()
    {
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        const showLasTasks = configuration.get<boolean>("showLastTasks");
        try {
            await storage.update(constants.FAV_TASKS_STORE, [ "hello.bat" ]);
            await configuration.updateWs("showLastTasks", false);
            await configuration.updateWs("expanded.favorites", false);
            expect(await teApi.explorer.buildTaskTree([])).to.be.an("array").that.has.a.lengthOf(1);
        }
        catch (e) {
            throw e;
        }
        finally {
            await configuration.updateWs("expanded.favorites", true);
            await configuration.updateWs("showLastTasks", showLasTasks);
            await storage.update(constants.FAV_TASKS_STORE, favTasks);
        }
    });


    test("Open Tasks for Edit", async function()
    {   //
        // The 3rd param `true` will open the task files and locate task positions while parsing the tree
        //
        taskMap = await teApi.explorer.getTaskItems(undefined, "   ", true) as Map<string, TaskItem>;
        checkTasks(7, 42, 3, 4, 3, 13, 32, 2, 4, 10);
    });


    test("Resolve Task", async function()
    {
        const provider = teApi.providers.get("script");
        assert(provider);
        provider.resolveTask(batch[0]);
    });


    test("App Publisher Delete / Add", async function()
    {
        const file = path.join(rootPath, ".publishrc.json");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await sleep(500);
        createAppPublisherFile();
        await sleep(100);
        await waitForCache();
    });


    test("Ant Delete / Add", async function()
    {
        const file = path.join(dirName, "build.xml");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await sleep(1000);
        createAntFile();
        await sleep(100);
        await waitForCache();
    });


    test("Gradle Delete / Add", async function()
    {
        const file = path.join(dirName, "build.gradle");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await sleep(1000);
        createGradleFile();
        await sleep(100);
        await waitForCache();
    });


    test("Grunt Delete / Add", async function()
    {
        const file = path.join(rootPath, "GRUNTFILE.js");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await sleep(1000);
        createGruntFile();
        await sleep(100);
        await waitForCache();
    });


    test("Gulp Delete / Add", async function()
    {
        const file = path.join(rootPath, "gulpfile.js");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await sleep(1000);
        createGulpFile();
        await sleep(100);
        await waitForCache();
    });


    test("Makefile Delete / Add", async function()
    {
        const file = path.join(rootPath, "Makefile");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await sleep(1000);
        createMakeFile();
        await sleep(100);
        await waitForCache();
    });


    test("Maven Delete / Add", async function()
    {
        const file = path.join(rootPath, "pom.xml");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await sleep(1000);
        createMavenPomFile();
        await sleep(100);
        await waitForCache();
    });


    test("Batch Delete / Add", async function()
    {
        const file = path.join(rootPath, "test.bat");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await sleep(1000);
        createBatchFile();
        await sleep(100);
        await waitForCache();
    });


    test("Add WS Folder to File Cache", async function()
    {   //
        // Cover single-if branches in cache module
        //
        await teApi.fileCache.addFolderToCache();
        await teApi.fileCache.addFolderToCache((workspace.workspaceFolders as WorkspaceFolder[])[0]);
        await sleep(5000);
        await waitForCache();
    });


    test("Disable All Task Providers", async function()
    {
        await configuration.updateWs("enabledTasks", {
            ant: false,
            apppublisher: false,
            bash: false,
            batch: false,
            gradle: false,
            grunt: false,
            gulp: false,
            make: false,
            maven: false,
            npm: false,
            nsis: false,
            perl: false,
            pipenv: false,
            powershell: false,
            python: false,
            ruby: false,
            tsc: false,
            workspace: false
        });
        await sleep(5000);
        await waitForCache();
    });


    test("Re-enable All Task Providers", async function()
    {
        await configuration.updateWs("enabledTasks", {
            ant: true,
            appPuplisher: true,
            bash: true,
            batch: true,
            gradle: true,
            grunt: true,
            gulp: true,
            make: true,
            maven: true,
            npm: true,
            nsis: true,
            perl: true,
            pipenv: true,
            powershell: true,
            python: true,
            ruby: true,
            tsc: true,
            workspace: true
        });

        await sleep(5000); // wait for filesystem change events
        await waitForCache();
    });


    test("Run Refresh Task", async function()
    {
        await commands.executeCommand("taskExplorer.refresh");
        await sleep(5000);
        await waitForCache();
    });


    test("Invalidate Bash Tasks With New Bash Shell Setting", async function()
    {
        if (!teApi || !teApi.explorer || !workspace.workspaceFolders) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        await configuration.updateVsWs("terminal.integrated.shell.windows",
                                       "C:\\Program Files\\Git\\bin\\bash.exe");
        await sleep(1000);
        await teApi.fileCache.buildCache("bash", "bash", constants.GLOB_BASH, workspace.workspaceFolders[0], true);
    });


    test("Rebuild Cache on Workspace Folder", async function()
    {
        if (!teApi || !teApi.explorer || !workspace.workspaceFolders) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        await teApi.fileCache.buildCache("gulp", "gulp", constants.GLOB_GULP, workspace.workspaceFolders[0], true);
    });


    test("Groups with Separator", async function()
    {
        await configuration.updateWs("groupWithSeparator", true);
        await configuration.updateWs("groupSeparator", "-");
        await configuration.updateWs("groupMaxLevel", 5);

        await sleep(2000); // wait for filesystem change events
        await waitForCache();
    });


    test("Add to Excludes After Grouping", async function()
    {
        const taskItemsB4 = await tasks.fetchTasks({ type: "grunt" }),
              gruntCt = taskItemsB4.length;

        for (const map of taskMap)
        {
            const value = map[1];
            if (value && value.taskSource === "grunt")
            {
                let taskFile = value.taskFile;
                while (taskFile.treeNodes.length === 1 && taskFile.treeNodes[0] instanceof TaskFile && !taskFile.isGroup)
                {
                    taskFile = taskFile.treeNodes[0];
                }
                if (taskFile && taskFile.isGroup && !value.taskFile.path.startsWith("grunt"))
                {
                    await commands.executeCommand("taskExplorer.addToExcludes", taskFile);
                    await sleep(1000);
                    break;
                }
            }
        }

        await sleep(500);
        const taskItems = await tasks.fetchTasks({ type: "grunt" });
        await sleep(500);
        if (taskItems.length !== gruntCt - 2) { // grunt file that just got ignored had 7 tasks
            assert.fail("Unexpected grunt task count (Found " + taskItems.length + " of " +
                        (gruntCt - 2).toString() + ")");
        }
    });


    test("Cancel Rebuild Cache", async function()
    {
        this.timeout(45000);
        //
        // Try a bunch of times to cover all of the hooks in the processing loops
        //
        await teApi.fileCache.cancelBuildCache(true);
        teApi.fileCache.rebuildCache();
        await teApi.fileCache.cancelBuildCache(true);
        teApi.fileCache.rebuildCache();
        await sleep(40);
        await teApi.fileCache.cancelBuildCache(true);
        teApi.fileCache.rebuildCache();
        await sleep(75);
        await teApi.fileCache.cancelBuildCache(true);
        teApi.fileCache.rebuildCache();
        await teApi.fileCache.cancelBuildCache(true);
        await teApi.fileCache.rebuildCache();
    });


    test("Enable and Disable Views", async function()
    {
        await configuration.updateWs("enableExplorerView", false);
        await configuration.updateWs("enableSideBar", false);
        await configuration.updateWs("enableExplorerView", true);
        await configuration.updateWs("enableSideBar", true);
        await sleep(5000); // wait for refresh
    });


    test("Add and Remove a Workspace Folder", async function()
    {
        addWsFolder(workspace.workspaceFolders);
        removeWsFolder((workspace.workspaceFolders as WorkspaceFolder[]).filter(f =>  f.index > 0));
    });

});


export async function buildTree(instance: any, waitTime?: number)
{
    if (!teApi || !teApi.explorer) {
        assert.fail("   ✘ Not initialized");
    }

    instance.timeout(60 * 1000);

    if (!teApi || !teApi.explorer) {
        assert.fail("   ✘ Task Explorer tree instance does not exist");
    }

    await sleep(waitTime || 1);
    await waitForCache();

    await configuration.updateWs("groupWithSeparator", true);
    await configuration.updateWs("groupSeparator", "-");
    await configuration.updateWs("groupMaxLevel", 5);

    //
    // A special refresh() for test suite, will open all task files and open to position
    //
    await teApi.explorer.refresh("tests");
    await waitForCache();

    const treeItems = await refresh();

    return treeItems;
}


function checkTasks(ant: number, ap: number, bash: number, bat: number, gradle: number, grunt: number, gulp: number, python: number, tsc: number, vsc: number)
{
    console.log("    Task Counts");

    let taskCount = findIdInTaskMap(":ant", taskMap);
    console.log("      Ant           : " + taskCount.toString());
    if (taskCount !== ant) {
        assert.fail(`Unexpected Ant task count (Found ${taskCount} of ${ant})`);
    }

    taskCount = findIdInTaskMap(":app-publisher:", taskMap);
    console.log("      App-Publisher : " + taskCount.toString());
    if (taskCount !== ap) {
        assert.fail(`Unexpected AppPublisher task count (Found ${taskCount} of ${ap})`);
    }

    taskCount = findIdInTaskMap(":bash:", taskMap);
    console.log("      Bash          : " + taskCount.toString());
    if (taskCount !== bash) {
        assert.fail(`Unexpected Bash task count (Found ${taskCount} of ${bash})`);
    }

    taskCount = findIdInTaskMap(":batch:", taskMap);
    console.log("      Batch         : " + taskCount.toString());
    if (taskCount !== bat) {
        assert.fail(`Unexpected Batch task count (Found ${taskCount} of ${bat})`);
    }

    taskCount = findIdInTaskMap(":gradle:", taskMap);
    console.log("      Gradle        : " + taskCount.toString());
    if (taskCount !== gradle) {
        assert.fail(`Unexpected Gradle task count (Found ${taskCount} of ${gradle})`);
    }

    taskCount = findIdInTaskMap(":grunt:", taskMap);
    console.log("      Grunt         : " + taskCount.toString());
    if (taskCount !== grunt) {
        assert.fail(`Unexpected Grunt task count (Found ${taskCount} of ${grunt})`);
    }

    taskCount = findIdInTaskMap(":gulp:", taskMap);
    console.log("      Gulp          : " + taskCount.toString());
    if (taskCount !== gulp) {
        assert.fail(`Unexpected Gulp task count (Found ${taskCount} of ${gulp})`);
    }

    taskCount = findIdInTaskMap(":python:", taskMap);
    console.log("      Python        : " + taskCount.toString());
    if (taskCount !== python) {
        assert.fail(`Unexpected Python task count (Found ${taskCount} of ${python})`);
    }

    taskCount = findIdInTaskMap(":tsc:", taskMap);
    console.log("      TypeScript    : " + taskCount.toString());
    if (taskCount !== tsc) {
        assert.fail(`Unexpected Typescript task count (Found ${taskCount} of ${tsc})`);
    }

    taskCount = findIdInTaskMap(":Workspace:", taskMap);
    console.log("      VSCode        : " + taskCount.toString());
    if (taskCount !== vsc) {
        assert.fail(`Unexpected VSCode task count (Found ${taskCount} of ${vsc})`);
    }
}


function setupAnt()
{
    if (!rootPath || !dirNameIgn || !dirName) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    createAntFile();

    const file2 = path.join(dirName, "test.xml");
    const file3 = path.join(dirName, "emptytarget.xml");
    const file4 = path.join(dirName, "emptyproject.xml");
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
}


function setupGradle()
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

}


function setupTsc()
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
}


function setupGulp()
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
}


function setupMakefile()
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
}


function setupBatch()
{
    if (!rootPath || !dirNameIgn || !dirName) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    createBatchFile();

    const file2 = path.join(dirName, "test2.BAT");
    tempFiles.push(file2);

    const file3 = path.join(dirNameIgn, "test3.bat");
    tempFiles.push(file3);

    fs.writeFileSync(file2, "@echo testing batch file 2\r\nsleep /t 5\r\n");
    fs.writeFileSync(file3, "@echo testing batch file 3\r\n");
}


function setupBash()
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
}


function setupGrunt()
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
        "};\n"
    );
}


function setupAppPublisher()
{
    if (!rootPath) {
        assert.fail("        ✘ Workspace folder does not exist");
    }
    createAppPublisherFile();
}


function setupMaven()
{
    if (!rootPath) {
        assert.fail("        ✘ Workspace folder does not exist");
    }
    createMavenPomFile();
}


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


function createMavenPomFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, "pom.xml");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
                "    <modelVersion>4.0.0</modelVersion>\n" +
                "</project>\n"
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
