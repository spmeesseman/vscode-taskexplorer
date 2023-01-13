/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as path from "path";
import { expect } from "chai";
import { Uri } from "vscode";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, closeActiveDocument, executeSettingsUpdate, executeTeCommand2, focusExplorerView,
    getWsPath, suiteFinished, testControl, treeUtils
} from "../utils/utils";


const testsName = "tsc";
const startTaskCount = 0;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let rootPath: string;
let dirName: string;
let fileUri: Uri;
let fileUri2: Uri;
let successCount = -1;


suite("Typescript Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
        rootPath = getWsPath(".");
        dirName = path.join(rootPath, "tasks_test_ts_");
        fileUri = Uri.file(path.join(rootPath, "tsconfig.json"));
        fileUri2 = Uri.file(path.join(dirName, "tsconfig.json"));
        successCount++;
    });


    suiteTeardown(async function()
    {
        await closeActiveDocument();
        try {
            await fsApi.deleteDir(dirName);
        } catch {}
        suiteFinished(this);
    });


	test("Activate Tree (Focus Explorer View)", async function()
	{
        expect(successCount).to.be.equal(0, "rolling success count failure");
        await focusExplorerView(this);
        successCount++;
	});


    test("Start", async function()
    {
        expect(successCount).to.be.equal(1, "rolling success count failure");
        this.slow(testControl.slowTime.verifyTaskCount);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        successCount++;
    });


    test("Create Empty Directory", async function()
    {
        expect(successCount).to.be.equal(2, "rolling success count failure");
        this.slow(testControl.slowTime.fsCreateFolderEvent + testControl.waitTime.fsCreateFolderEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.createDir(dirName);
        await teApi.waitForIdle(testControl.waitTime.fsCreateFolderEvent);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        successCount++;
    });


    test("Create File", async function()
    {
        expect(successCount).to.be.equal(3, "rolling success count failure");
        this.slow(testControl.slowTime.fsCreateEvent + testControl.waitTime.fsCreateEvent + testControl.slowTime.verifyTaskCount + 50);
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
        // the 'create file 2' test fails 1/50 runs, so add a lil bit on to fsCreateEvent here too
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent + 50);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 2);
        successCount++;
    });


    test("Document Position", async function()
    {
        expect(successCount).to.be.equal(4, "rolling success count failure");
        this.slow(testControl.slowTime.getTreeTasks + (testControl.slowTime.command * 2));
        //
        // Typescript 'open' just opens the document, doesnt find the task position
        //
        const tscItems = await treeUtils.getTreeTasks("tsc", startTaskCount + 2);
        await executeTeCommand2("open", [ tscItems[0] ]);
        await closeActiveDocument();
        await executeTeCommand2("open", [ tscItems[1] ]);
        await closeActiveDocument();
        successCount++;
    });


    test("Create File 2", async function()
    {
        expect(successCount).to.be.equal(5, "rolling success count failure");
        this.slow(testControl.slowTime.fsCreateEvent + testControl.waitTime.fsCreateEvent + testControl.slowTime.verifyTaskCount + 100);
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
        // the 'create file 2' test fails 1/50 runs, so add a lil bit on to fsCreateEvent
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent + 100);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 4);
        successCount++;
    });


    test("Disable", async function()
    {
        expect(successCount).to.be.equal(6, "rolling success count failure");
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testControl.waitTime.configEnableEvent);
        await treeUtils.verifyTaskCountByTree(testsName, 0);
        successCount++;
    });


    test("Re-enable", async function()
    {
        expect(successCount).to.be.equal(7, "rolling success count failure");
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testControl.waitTime.configEnableEvent);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 4);
        successCount++;
    });


    test("Invalid JSON", async function()
    {
        expect(successCount).to.be.equal(8, "rolling success count failure");
        //
        // Note: FileWatcher ignores mod event for this task type since # of tasks never changes
        //
        this.slow(testControl.slowTime.fsModifyEvent + testControl.slowTime.verifyTaskCount);
        // let resetLogging = teApi.log.isLoggingEnabled();
        // if (resetLogging) { // turn scary error logging off
        //     this.slow(testControl.slowTime.FsCreateEvent + (testControl.slowTime.ConfigEvent * 2));
        //     executeSettingsUpdate("logging.enable", false);
        //     resetLogging = true;
        // }
        // else {
        //     this.slow(testControl.slowTime.FsCreateEvent);
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
        await teApi.waitForIdle(testControl.waitTime.fsModifyEvent);
        //
        // See fileWatcher.ts, we ignore modify event because the task count will never change
        // for this task type. So if there is invalid json after a save, the tasks will remain,
        // but are actually invalid.  TSC engine will report the old task count as well, so it
        // doesn't event matter if we had the file modify event watcher on or not.
        //
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 4);
        // if (resetLogging) { // turn scary error logging off
        //     executeSettingsUpdate("logging.enable", true);
        // }
        successCount++;
    });


    test("Fix Invalid JSON", async function()
    {
        expect(successCount).to.be.equal(9, "rolling success count failure");
        this.slow(testControl.slowTime.fsModifyEvent + testControl.slowTime.verifyTaskCount);
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
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 4);
        successCount++;
    });


    test("Delete File 1", async function()
    {
        expect(successCount).to.be.equal(10, "rolling success count failure");
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsDeleteEvent);
        await fsApi.deleteFile(fileUri.fsPath);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 2);
        successCount++;
    });


    test("Delete File 2", async function()
    {
        expect(successCount).to.be.equal(11, "rolling success count failure");
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsDeleteEvent);
        await fsApi.deleteFile(fileUri2.fsPath);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        successCount++;
    });

});
