/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { tasks, Uri } from "vscode";
import { configuration } from "../../common/configuration";
import { activate, getWsPath, isReady, sleep } from "../helper";
import { TaskExplorerApi } from "../../extension";
import { ScriptTaskProvider } from "../../providers/script";
import { properCase } from "../../common/utils";


let teApi: TaskExplorerApi;
let pathToPython: string;
let enablePython: boolean;
let mainFile: Uri;


suite("Python Tests", () =>
{
    const testsName = "python",
          testsNameProper = properCase(testsName);

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate();
        assert(isReady("script") === true, "Setup failed");
        mainFile = Uri.file(getWsPath("test.py"));
        //
        // Store / set initial settings
        //
        await configuration.updateWs(`pathTo${testsNameProper}`, path.resolve(process.cwd(), "..\\..\\test-files\\ant\\bin\\ant.bat"));
        pathToPython = configuration.get<string>(`pathTo${testsNameProper}`);
        enablePython = configuration.get<boolean>(`enable${testsNameProper}`);
        await configuration.update(`pathTo${testsNameProper}`, "php\\composer.exe");
        await configuration.update(`enable${testsNameProper}`, true);
    });


    suiteTeardown(async() =>
    {   //
        // Reset settings
        //
        await configuration.update(`pathTo${testsNameProper}`, pathToPython);
        await configuration.update(`enable${testsNameProper}`, enablePython);
    });


    test("Document Position", async () =>
    {
        const provider = teApi.taskProviders.get("script") as ScriptTaskProvider;
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
    });


    test("Disable", async () =>
    {
        await configuration.update(`enable${testsNameProper}`, false);
        await sleep(1750);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, mainFile);
        await sleep(1750);
        // const cTasks = await tasks.fetchTasks({ type: testsName });
        // assert(!cTasks || cTasks.length === 0, "Did not read 0 python tasks");
    });


    test("Re-enable", async () =>
    {
        await configuration.update(`enable${testsNameProper}`, true);
        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, mainFile);
        // const cTasks = await tasks.fetchTasks({ type: testsName });
        // assert(cTasks && cTasks.length === 2, "Did not read 2 python tasks");
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
        // let cTasks = await tasks.fetchTasks({ type: testsName });
        // assert(cTasks && cTasks.length === 2, "Did not read 2 python tasks");

        fs.unlinkSync(file.fsPath);
        fs.rmdirSync(dirName, {
            recursive: true
        });

        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, file);
        // cTasks = await tasks.fetchTasks({ type: testsName });
        // assert(cTasks.length === 1, "Did not read 2 python tasks");
    });

});
