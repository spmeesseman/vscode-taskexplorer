/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { tasks, Uri, workspace, WorkspaceFolder } from "vscode";
import { configuration } from "../../common/configuration";
import { activate, getWsPath, isReady, sleep } from "../helper";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { ScriptTaskProvider } from "../../providers/script";
import { properCase } from "../../common/utils";


let teApi: TaskExplorerApi;
let pathToPython: string;
let enablePython: boolean;
let wsFolder: WorkspaceFolder;
let dirName: string;
let fileUri: Uri;


suite("Python Tests", () =>
{
    const testsName = "python";


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
        await configuration.updateWs("pathToPrograms.python", path.resolve(process.cwd(), "..\\..\\test-files\\ant\\bin\\ant.bat"));
        pathToPython = configuration.get<string>("pathToPrograms.python");
        enablePython = configuration.get<boolean>("enabledTasks.python");
        await configuration.updateWs("pathToPrograms.python", "php\\composer.exe");
        await configuration.updateWs("enabledTasks.python", true);
    });


    suiteTeardown(async function()
    {   //
        // Reset settings
        //
        await configuration.updateWs("pathToPrograms.python", pathToPython);
        await configuration.updateWs("enabledTasks.python", enablePython);
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


    test("Disable", async function()
    {
        let cTasks = await tasks.fetchTasks({ type: "script" });
        assert(cTasks && cTasks.filter(t => t.source === testsName).length === 2, `Did not read 2 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
        await configuration.updateWs("enabledTasks.python", false);
        await sleep(500);
        await teApi.explorer?.invalidateTasksCache(testsName);
        await sleep(500);
        cTasks = await tasks.fetchTasks({ type: "script" });
        assert(!cTasks || cTasks.filter(t => t.source === testsName).length === 0, `Did not read 0 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    });


    test("Re-enable", async function()
    {
        await configuration.updateWs("enabledTasks.python", true);
        await sleep(500);
        await teApi.explorer?.invalidateTasksCache(testsName);
        await sleep(500);
        const cTasks = await tasks.fetchTasks({ type: "script" });
        assert(cTasks && cTasks.filter(t => t.source === testsName).length === 2, `Did not read 2 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
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

        await sleep(500);
        await teApi.explorer?.invalidateTasksCache(testsName, fileUri);
        const cTasks = await tasks.fetchTasks({ type: "script" });
        assert(cTasks && cTasks.filter(t => t.source === testsName).length === 3, `Did not read 3 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    });


    // test("Add task to file", async () =>
    // {
    //     fs.writeFileSync(
    //         fileUri.fsPath,
    //         "{\n" +
    //         '  "scripts":\n' +
    //         "  {\n" +
    //         '    "test1": "run -r test",\n' +
    //         '    "test2": "open -p tmp.txt",\n' +
    //         '    "test3": "start -x 1 -y 2"\n' +
    //         '    "test4": "start -x 2 -y 3"\n' +
    //         "  },\n" +
    //         '  "include": ["**/*"],\n' +
    //         '  "exclude": ["node_modules"]\n' +
    //         "}\n"
    //     );
    //
    //     await sleep(500);
    //     await teApi.explorer?.invalidateTasksCache(testsName, fileUri);
    //     const cTasks = await tasks.fetchTasks({ type: testsName });
    //     assert(cTasks && cTasks.length === 6, `Did not read 6 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    // });


    // test("Remove task from file", async () =>
    // {
    //     fs.writeFileSync(
    //         fileUri.fsPath,
    //         "{\n" +
    //         '  "scripts":\n' +
    //         "  {\n" +
    //         '    "test1": "run -r test",\n' +
    //         '    "test2": "open -p tmp.txt",\n' +
    //         "  },\n" +
    //         '  "include": ["**/*"],\n' +
    //         '  "exclude": ["node_modules"]\n' +
    //         "}\n"
    //     );
    //
    //     await sleep(500);
    //     await teApi.explorer?.invalidateTasksCache(testsName, fileUri);
    //     const cTasks = await tasks.fetchTasks({ type: testsName });
    //     assert(cTasks && cTasks.length === 4, `Did not read 4 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    // });


    test("Delete file", async function()
    {
        fs.unlinkSync(fileUri.fsPath);
        fs.rmdirSync(dirName, {
            recursive: true
        });

        await sleep(500);
        await teApi.explorer?.invalidateTasksCache(testsName, fileUri);
        const cTasks = await tasks.fetchTasks({ type: "script" });
        assert(cTasks && cTasks.filter(t => t.source === testsName).length === 2, `Did not read 2 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    });

});
