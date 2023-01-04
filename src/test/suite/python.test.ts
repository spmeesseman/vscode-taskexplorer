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
import { activate, executeSettingsUpdate, getWsPath, isReady, testsControl, verifyTaskCount } from "../helper";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { ScriptTaskProvider } from "../../providers/script";

const testsName = "python";

let teApi: ITaskExplorerApi;
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
        assert(isReady("python") === true, "    ✘ TeApi not ready");
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "test2.py"));
        //
        // Store / set initial settings
        //
        pathToPython = teApi.config.get<string>("pathToPrograms.python");
        enablePython = teApi.config.get<boolean>("enabledTasks.python");
        await executeSettingsUpdate("pathToPrograms.python", "python_7/python.exe");
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
        const provider = teApi.providers.get("python") as ScriptTaskProvider;
        assert(provider.getDocumentPosition() === 0, "Script type should return position 0");
    });


    test("Invalid Script Type", async function()
    {
        const provider = teApi.providers.get("python") as ScriptTaskProvider;
        assert(!provider.createTask("no_ext", undefined, wsFolder, Uri.file(getWsPath("test.py"))),
               "Script type should return position 1");
    });


    test("Start", async function()
    {
        await verifyTaskCount("python", 2);
    });


    test("Disable", async function()
    {
        await executeSettingsUpdate("enabledTasks.python", false, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCount("python", 0);
    });


    test("Re-enable", async function()
    {
        await executeSettingsUpdate("enabledTasks.python", true, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCount("python", 2);
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
        await teApi.waitForIdle(testsControl.waitTimeForFsCreateEvent);
        await verifyTaskCount("python", 3);
    });


    test("Delete File", async function()
    {
        fs.unlinkSync(fileUri.fsPath);
        await teApi.waitForIdle(testsControl.waitTimeForFsDeleteEvent * 2);
        await verifyTaskCount("python", 2);
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
        await teApi.waitForIdle(testsControl.waitTimeForFsCreateEvent);
        await verifyTaskCount("python", 3);
    });


    test("Delete Folder", async function()
    {
        // fs.unlinkSync(fileUri.fsPath);
        fs.rmdirSync(dirName, {
            recursive: true
        });
        await teApi.waitForIdle(testsControl.waitTimeForFsDeleteEvent * 2);
        await verifyTaskCount("python", 2);
    });

});
