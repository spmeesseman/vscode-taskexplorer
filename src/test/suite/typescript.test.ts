/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as utils from "../utils/utils";
import { Uri } from "vscode";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { join } from "path";
import { ITestControl } from "../control";


const testsName = "tsc";
const startTaskCount = 0;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let testControl: ITestControl;
let rootPath: string;
let dirName: string;
let fileUri: Uri;
let fileUri2: Uri;
let successCount = -1;


suite("Typescript Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi, fsApi } = await utils.activate(this));
        testControl = utils.testControl;
        rootPath = utils.getWsPath(".");
        dirName = join(rootPath, "tasks_test_ts_");
        fileUri = Uri.file(join(rootPath, "tsconfig.json"));
        fileUri2 = Uri.file(join(dirName, "tsconfig.json"));
        successCount++;
    });


    suiteTeardown(async function()
    {
        await utils.closeActiveDocument();
        try {
            await fsApi.deleteDir(dirName);
        } catch {}
        utils.suiteFinished(this);
    });


	test("Activate Tree (Focus Explorer View)", async function()
	{
        if (utils.exitRollingCount(0, successCount)) return;
        await utils.focusExplorerView(this);
        successCount++;
	});


    test("Start", async function()
    {
        if (utils.exitRollingCount(1, successCount)) return;
        this.slow(testControl.slowTime.verifyTaskCountByTree);
        await utils.treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        successCount++;
    });


    test("Create Empty Directory", async function()
    {
        if (utils.exitRollingCount(2, successCount)) return;
        this.slow(testControl.slowTime.fs.createFoldereEvent + testControl.waitTime.fs.createFoldereEvent + testControl.slowTime.verifyTaskCountByTree);
        await fsApi.createDir(dirName);
        await utils.waitForTeIdle(testControl.waitTime.fs.createFoldereEvent);
        await utils.treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        successCount++;
    });


    test("Create File", async function()
    {
        if (utils.exitRollingCount(3, successCount)) return;
        this.slow(testControl.slowTime.fs.createEvent + testControl.waitTime.fs.createEvent + testControl.slowTime.verifyTaskCountByTree + 50);
        await fsApi.writeFile(
            fileUri.fsPath,
            "{\n" +
            '  "compilerOptions":\n' +
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
        // the 'create file 2' test fails 1/50 runs, so add a lil bit on to fs.createEvent here too
        await utils.waitForTeIdle(testControl.waitTime.fs.createEvent + 50);
        await utils.treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 2);
        successCount++;
    });


    test("Document Position", async function()
    {
        if (utils.exitRollingCount(4, successCount)) return;
        this.slow(testControl.slowTime.getTreeTasks + (testControl.slowTime.command * 2));
        //
        // Typescript 'open' just opens the document, doesnt find the task position
        //
        const tscItems = await utils.treeUtils.getTreeTasks("tsc", startTaskCount + 2);
        await utils.executeTeCommand2("open", [ tscItems[0] ]);
        await utils.closeActiveDocument();
        await utils.executeTeCommand2("open", [ tscItems[1] ]);
        await utils.closeActiveDocument();
        successCount++;
    });


    test("Create File 2", async function()
    {
        if (utils.exitRollingCount(5, successCount)) return;
        this.slow(testControl.slowTime.fs.createEvent + testControl.waitTime.fs.createEvent + testControl.slowTime.verifyTaskCountByTree + 100);
        await fsApi.writeFile(
            fileUri2.fsPath,
            "{\n" +
            '  "compilerOptions":\n' +
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
        // the 'create file 2' test fails 1/50 runs, so add a lil bit on to fs.createEvent
        await utils.waitForTeIdle(testControl.waitTime.fs.createEvent + 100);
        await utils.treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 4);
        successCount++;
    });


    test("Disable", async function()
    {
        if (utils.exitRollingCount(6, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.verifyTaskCountByTree + testControl.waitTime.config.enableEvent);
        await utils.executeSettingsUpdate(`enabledTasks.${testsName}`, false, testControl.waitTime.config.enableEvent);
        await utils.treeUtils.verifyTaskCountByTree(testsName, 0);
        successCount++;
    });


    test("Re-enable", async function()
    {
        if (utils.exitRollingCount(7, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.verifyTaskCountByTree + testControl.waitTime.config.enableEvent);
        await utils.executeSettingsUpdate(`enabledTasks.${testsName}`, true, testControl.waitTime.config.enableEvent);
        await utils.treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 4);
        successCount++;
    });


    test("Invalid JSON", async function()
    {
        if (utils.exitRollingCount(8, successCount)) return;
        //
        // Note: FileWatcher ignores mod event for this task type since # of tasks never changes
        //
        this.slow(testControl.slowTime.fs.modifyEvent + testControl.waitTime.fs.modifyEvent + testControl.slowTime.verifyTaskCountByTree);
        // let resetLogging = teApi.log.isLoggingEnabled();
        // if (resetLogging) { // turn scary error logging off
        //     this.slow(testControl.slowTime.fs.createEvent + (testControl.slowTime.config.event * 2));
        //     executeSettingsUpdate("logging.enable", false);
        //     resetLogging = true;
        // }
        // else {
        //     this.slow(testControl.slowTime.fs.createEvent);
        // }
        await fsApi.writeFile(
            fileUri.fsPath,
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
            "\n"
        );
        await utils.waitForTeIdle(testControl.waitTime.fs.modifyEvent);
        //
        // See fileWatcher.ts, we ignore modify event because the task count will never change
        // for this task type. So if there is invalid json after a save, the tasks will remain,
        // but are actually invalid.  TSC engine will report the old task count as well, so it
        // doesn't event matter if we had the file modify event watcher on or not.
        //
        await utils.treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 4);
        // if (resetLogging) { // turn scary error logging off
        //     executeSettingsUpdate("logging.enable", true);
        // }
        successCount++;
    });


    test("Fix Invalid JSON", async function()
    {
        if (utils.exitRollingCount(9, successCount)) return;
        this.slow(testControl.slowTime.fs.modifyEvent + testControl.waitTime.fs.createEvent + testControl.slowTime.verifyTaskCountByTree);
        await fsApi.writeFile(
            fileUri.fsPath,
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
        await utils.waitForTeIdle(testControl.waitTime.fs.createEvent);
        await utils.treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 4);
        successCount++;
    });


    test("Delete File 1", async function()
    {
        if (utils.exitRollingCount(10, successCount)) return;
        this.slow(testControl.slowTime.fs.deleteEvent + testControl.slowTime.verifyTaskCountByTree + testControl.waitTime.fs.deleteEvent);
        await fsApi.deleteFile(fileUri.fsPath);
        await utils.waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        await utils.treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 2);
        successCount++;
    });


    test("Delete File 2", async function()
    {
        if (utils.exitRollingCount(11, successCount)) return;
        this.slow(testControl.slowTime.fs.deleteEvent + testControl.slowTime.verifyTaskCountByTree + testControl.waitTime.fs.deleteEvent);
        await fsApi.deleteFile(fileUri2.fsPath);
        await utils.waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        await utils.treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        successCount++;
    });

});
