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
import { TaskExplorerApi } from "../../extension";
import { ScriptTaskProvider } from "../../providers/script";
import { properCase } from "../../common/utils";


let teApi: TaskExplorerApi;
let pathToPython: string;
let enablePython: boolean;
let wsFolder: WorkspaceFolder;


suite("Python Tests", () =>
{
    const testsName = "python",
          testsNameProper = properCase(testsName);

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate(this);
        assert(isReady("script") === true, "Setup failed");
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        //
        // Store / set initial settings
        //
        await configuration.updateWs(`pathTo${testsNameProper}`, path.resolve(process.cwd(), "..\\..\\test-files\\ant\\bin\\ant.bat"));
        pathToPython = configuration.get<string>(`pathTo${testsNameProper}`);
        enablePython = configuration.get<boolean>(`enable${testsNameProper}`);
        await configuration.updateWs(`pathTo${testsNameProper}`, "php\\composer.exe");
        await configuration.updateWs(`enable${testsNameProper}`, true);
    });


    suiteTeardown(async() =>
    {   //
        // Reset settings
        //
        await configuration.updateWs(`pathTo${testsNameProper}`, pathToPython);
        await configuration.updateWs(`enable${testsNameProper}`, enablePython);
    });


    test("Document Position", async () =>
    {
        const provider = teApi.taskProviders.get("script") as ScriptTaskProvider;
        assert(provider.getDocumentPosition() === 0, "Script type should return position 0");
    });


    test("Invalid Script Type", async () =>
    {
        const provider = teApi.taskProviders.get("script") as ScriptTaskProvider;
        assert(!provider.createTask("no_ext", undefined, wsFolder, Uri.file(getWsPath("test.py"))),
               "Script type should return position 1");
    });


    test("Disable", async () =>
    {
        let cTasks = await tasks.fetchTasks({ type: "script" });
        assert(cTasks && cTasks.filter(t => t.source === testsName).length === 2, "Did not read initial 2 python tasks");
        await configuration.updateWs(`enable${testsNameProper}`, false);
        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName);
        await sleep(500);
        cTasks = await tasks.fetchTasks({ type: "script" });
        assert(!cTasks || cTasks.filter(t => t.source === testsName).length === 0, "Did not read 0 python tasks");
    });


    test("Re-enable", async () =>
    {
        await configuration.updateWs(`enable${testsNameProper}`, true);
        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName);
        await sleep(500);
        const cTasks = await tasks.fetchTasks({ type: "script" });
        assert(cTasks && cTasks.filter(t => t.source === testsName).length === 2, "Did not read 2 python tasks");
    });


    test("Create File", async () =>
    {
        const dirName = getWsPath("tasks_test_"),
              file = Uri.file(path.join(dirName, "test2.py"));

        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { mode: 0o777 });
        }

        fs.writeFileSync(
            file.fsPath,
            "#!/usr/local/bin/python\n" +
            "\n"
        );

        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, file);
        let cTasks = await tasks.fetchTasks({ type: "script" });
        assert(cTasks && cTasks.filter(t => t.source === testsName).length === 3, "Did not read 3 python tasks");

        fs.unlinkSync(file.fsPath);
        fs.rmdirSync(dirName, {
            recursive: true
        });

        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, file);
        cTasks = await tasks.fetchTasks({ type: "script" });
        assert(cTasks && cTasks.filter(t => t.source === testsName).length === 2, "Did not read 2 python tasks");
    });

});
