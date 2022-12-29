/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { configuration } from "../../common/configuration";
import { activate, executeSettingsUpdate, getWsPath, isReady, sleep, testsControl, verifyTaskCount } from "../helper";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { ScriptTaskProvider } from "../../providers/script";

const testsName = "python";
// const waitTimeForFsModEvent = testsControl.waitTimeForFsModifyEvent;
const waitTimeForFsDelEvent = testsControl.waitTimeForFsDeleteEvent * 2;
const waitTimeForFsNewEvent = testsControl.waitTimeForFsCreateEvent * 2;
const waitTimeForConfigEvent = Math.round(testsControl.waitTimeForConfigEvent * 1.5);

let teApi: TaskExplorerApi;
let pathToPython: string;
let enablePython: boolean;
let wsFolder: WorkspaceFolder;
let dirName: string;
let fileUri: Uri;


suite("Python Tests", () =>
{

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate(this);
        assert(isReady("script") === true, "    ✘ TeApi not ready");
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "test2.py"));
        //
        // Store / set initial settings
        //
        pathToPython = configuration.get<string>("pathToPrograms.python");
        enablePython = configuration.get<boolean>("enabledTasks.python");
        await executeSettingsUpdate("pathToPrograms.python", "php\\composer.exe");
        await executeSettingsUpdate("enabledTasks.python", true, testsControl.waitTimeForConfigEnableEvent);
    });


    suiteTeardown(async function()
    {   //
        // Reset settings
        //
        await executeSettingsUpdate("pathToPrograms.python", pathToPython);
        await executeSettingsUpdate("enabledTasks.python", enablePython, testsControl.waitTimeForConfigEnableEvent);
    });


    test("Document Position", async function()
    {
        const provider = teApi.providers.get("script") as ScriptTaskProvider;
        assert(provider.getDocumentPosition() === 0, "Script type should return position 0");
    });


    test("Invalid Script Type", async function()
    {
        const provider = teApi.providers.get("script") as ScriptTaskProvider;
        assert(!provider.createTask("no_ext", undefined, wsFolder, Uri.file(getWsPath("test.py"))),
               "Script type should return position 1");
    });


    test("Start", async function()
    {
        await verifyTaskCount("script", 2, testsName);
    });


    test("Disable", async function()
    {
        await executeSettingsUpdate("enabledTasks.python", false, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCount("script", 0, testsName);
    });


    test("Re-enable", async function()
    {
        await executeSettingsUpdate("enabledTasks.python", true, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCount("script", 2, testsName);
    });


    test("Create File", async function()
    {
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { mode: 0o777 });
        }
        fs.writeFileSync(
            fileUri.fsPath,
            "#!/usr/local/bin/python\n" +
            "\n"
        );
        await teApi.waitForIdle(waitTimeForFsNewEvent);
        await verifyTaskCount("script", 3, testsName);
    });


    test("Delete File", async function()
    {
        fs.unlinkSync(fileUri.fsPath);
        await teApi.waitForIdle(waitTimeForFsDelEvent * 2);
        await verifyTaskCount("script", 2, testsName);
        fs.rmdirSync(dirName, {
            recursive: true
        });
    });


    test("Re-create File", async function()
    {
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { mode: 0o777 });
        }
        fs.writeFileSync(
            fileUri.fsPath,
            "#!/usr/local/bin/python\n" +
            "\n"
        );
        await teApi.waitForIdle(waitTimeForFsNewEvent);
        await verifyTaskCount("script", 3, testsName);
    });


    test("Delete Folder", async function()
    {
        // fs.unlinkSync(fileUri.fsPath);
        fs.rmdirSync(dirName, {
            recursive: true
        });
        await teApi.waitForIdle(waitTimeForFsDelEvent * 2);
        await verifyTaskCount("script", 2, testsName);
    });

});
