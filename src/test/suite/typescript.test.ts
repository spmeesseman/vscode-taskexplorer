/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { Uri } from "vscode";
import { ExplorerApi, TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, closeActiveDocument, executeSettingsUpdate, executeTeCommand, executeTeCommand2,
    getTreeTasks, getWsPath, isReady, testsControl, verifyTaskCountByTree
} from "../helper";


const testsName = "tsc";

let teApi: TaskExplorerApi;
let explorer: ExplorerApi;
let rootPath: string;
let dirName: string;
let fileUri: Uri;
let fileUri2: Uri;


suite("Typescript Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
        if (!teApi.explorer) {
            assert.fail("        ✘ Explorer instance does not exist");
        }
        explorer = teApi.explorer;
        rootPath = getWsPath(".");
        dirName = path.join(rootPath, "tasks_test_ts_");
        fileUri = Uri.file(path.join(rootPath, "tsconfig.json"));
        fileUri2 = Uri.file(path.join(dirName, "tsconfig.json"));
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { mode: 0o777 });
        }
    });


    suiteTeardown(async function()
    {
        await closeActiveDocument();
        try {
            fs.rmdirSync(dirName, {
                recursive: true
            });
        } catch {}
    });


	test("Focus Task Explorer View for Tree Population", async function()
	{
        if (!explorer.isVisible()) {
            this.slow(testsControl.slowTimeForFocusCommand);
		    await executeTeCommand("focus", testsControl.waitTimeForCommand, 3000);
        }
	});


    test("Create File", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent);
        fs.writeFileSync(
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
        await teApi.waitForIdle(testsControl.waitTimeForFsCreateEvent, 3000);
        await verifyTaskCountByTree(testsName, 2);
    });


    test("Document Position", async function()
    {   //
        // Typescript 'open' just opens the document, doesnt find the task position
        //
        const tscItems = await getTreeTasks("tsc", 2);
        await executeTeCommand2("open", [ tscItems[0] ]);
        await closeActiveDocument();
        await executeTeCommand2("open", [ tscItems[1] ]);
        await closeActiveDocument();
    });


    test("Create File 2", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent);
        fs.writeFileSync(
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
        await teApi.waitForIdle(testsControl.waitTimeForFsCreateEvent, 3000);
        await verifyTaskCountByTree(testsName, 4);
    });


    test("Disable", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCountByTree(testsName, 0);
    });


    test("Re-enable", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCountByTree(testsName, 4);
    });


    test("Invalid JSON", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent);
        fs.writeFileSync(
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
        await teApi.waitForIdle(testsControl.waitTimeForFsModifyEvent, 3000);
        await verifyTaskCountByTree(testsName, 4); // I guess internal TSC must not invalidate tasks on bad syntax
    });


    test("Fix Invalid JSON", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent);
        fs.writeFileSync(
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
        await teApi.waitForIdle(testsControl.waitTimeForFsCreateEvent, 3000);
        await verifyTaskCountByTree(testsName, 4);
    });


    test("Delete File 1", async function()
    {
        this.slow(testsControl.slowTimeForFsDeleteEvent);
        fs.unlinkSync(fileUri.fsPath);
        await teApi.waitForIdle(testsControl.waitTimeForCommand);
        await verifyTaskCountByTree(testsName, 2);
    });


    test("Delete File 2", async function()
    {
        this.slow(testsControl.slowTimeForFsDeleteEvent);
        fs.unlinkSync(fileUri2.fsPath);
        await teApi.waitForIdle(testsControl.waitTimeForCommand);
        await verifyTaskCountByTree(testsName, 0);
    });

});
