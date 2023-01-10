/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as path from "path";
import { Uri } from "vscode";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, closeActiveDocument, executeSettingsUpdate, executeTeCommand2, focusExplorerView,
    getWsPath, testControl, treeUtils
} from "../helper";


const testsName = "tsc";
const startTaskCount = 0;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let rootPath: string;
let dirName: string;
let fileUri: Uri;
let fileUri2: Uri;


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
        if (!await fsApi.pathExists(dirName)) {
            await fsApi.createDir(dirName);
        }
    });


    suiteTeardown(async function()
    {
        await closeActiveDocument();
        try {
            await fsApi.deleteDir(dirName);
        } catch {}
    });


	test("Focus Task Explorer View for Tree Population", async function()
	{
        await await focusExplorerView(this);
	});


    test("Create File", async function()
    {
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
    });


    test("Document Position", async function()
    {
        this.slow(testControl.slowTime.getTreeTasks + (testControl.slowTime.command * 2));
        //
        // Typescript 'open' just opens the document, doesnt find the task position
        //
        const tscItems = await treeUtils.getTreeTasks("tsc", startTaskCount + 2);
        await executeTeCommand2("open", [ tscItems[0] ]);
        await closeActiveDocument();
        await executeTeCommand2("open", [ tscItems[1] ]);
        await closeActiveDocument();
    });


    test("Create File 2", async function()
    {
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
    });


    test("Disable", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testControl.waitTime.configEnableEvent);
        await treeUtils.verifyTaskCountByTree(testsName, 0);
    });


    test("Re-enable", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testControl.waitTime.configEnableEvent);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 4);
    });


    test("Invalid JSON", async function()
    {   //
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
    });


    test("Fix Invalid JSON", async function()
    {
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
    });


    test("Delete File 1", async function()
    {
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsDeleteEvent);
        await fsApi.deleteFile(fileUri.fsPath);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount + 2);
    });


    test("Delete File 2", async function()
    {
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsDeleteEvent);
        await fsApi.deleteFile(fileUri2.fsPath);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
    });

});
