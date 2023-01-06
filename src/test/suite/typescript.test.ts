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
    activate, closeActiveDocument, executeSettingsUpdate, executeTeCommand2, focusExplorer,
    getTreeTasks, getWsPath, testControl, verifyTaskCountByTree
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
        await await focusExplorer(this);
	});


    test("Create File", async function()
    {
        this.slow(testControl.slowTime.FsCreateEvent + testControl.slowTime.VerifyTaskCount);
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
        await teApi.waitForIdle(testControl.waitTimeForFsCreateEvent, 3000);
        await verifyTaskCountByTree(testsName, startTaskCount + 2);
    });


    test("Document Position", async function()
    {   //
        // Typescript 'open' just opens the document, doesnt find the task position
        //
        const tscItems = await getTreeTasks("tsc", startTaskCount + 2);
        await executeTeCommand2("open", [ tscItems[0] ]);
        await closeActiveDocument();
        await executeTeCommand2("open", [ tscItems[1] ]);
        await closeActiveDocument();
    });


    test("Create File 2", async function()
    {
        this.slow(testControl.slowTime.FsCreateEvent + testControl.slowTime.VerifyTaskCount);
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
        await teApi.waitForIdle(testControl.waitTimeForFsCreateEvent, 3000);
        await verifyTaskCountByTree(testsName, startTaskCount + 4);
    });


    test("Disable", async function()
    {
        this.slow(testControl.slowTime.ConfigEnableEvent + testControl.slowTime.VerifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testControl.waitTimeForConfigEnableEvent);
        await verifyTaskCountByTree(testsName, 0);
    });


    test("Re-enable", async function()
    {
        this.slow(testControl.slowTime.ConfigEnableEvent + testControl.slowTime.VerifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testControl.waitTimeForConfigEnableEvent);
        await verifyTaskCountByTree(testsName, startTaskCount + 4);
    });


    test("Invalid JSON", async function()
    {
        this.slow(testControl.slowTime.FsModifyEvent + testControl.slowTime.VerifyTaskCount);
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
        await teApi.waitForIdle(testControl.waitTimeForFsModifyEvent, 3000);
        await verifyTaskCountByTree(testsName, startTaskCount + 4); // I guess internal TSC must not invalidate tasks on bad syntax
        // if (resetLogging) { // turn scary error logging off
        //     executeSettingsUpdate("logging.enable", true);
        // }
    });


    test("Fix Invalid JSON", async function()
    {
        this.slow(testControl.slowTime.FsModifyEvent + testControl.slowTime.VerifyTaskCount);
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
        await teApi.waitForIdle(testControl.waitTimeForFsCreateEvent, 3000);
        await verifyTaskCountByTree(testsName, startTaskCount + 4);
    });


    test("Delete File 1", async function()
    {
        this.slow(testControl.slowTime.FsDeleteEvent + testControl.slowTime.VerifyTaskCount);
        await fsApi.deleteFile(fileUri.fsPath);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
        await verifyTaskCountByTree(testsName, startTaskCount+ 2);
    });


    test("Delete File 2", async function()
    {
        this.slow(testControl.slowTime.FsDeleteEvent + testControl.slowTime.VerifyTaskCount);
        await fsApi.deleteFile(fileUri2.fsPath);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
        await verifyTaskCountByTree(testsName, startTaskCount);
    });

});
