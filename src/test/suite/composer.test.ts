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
import { ComposerTaskProvider } from "../../providers/composer";
import { properCase } from "../../common/utils";


let teApi: TaskExplorerApi;
let pathToComposer: string;
let enableComposer: boolean;


suite("Composer Tests", () =>
{
    const testsName = "composer",
          testsNameProper = properCase(testsName);

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate(this);
        assert(isReady(testsName) === true, "Setup failed");
        //
        // Store / set initial settings
        //
        await configuration.updateWs(`pathTo${testsNameProper}`, getWsPath("ant\\bin\\ant.bat"));
        pathToComposer = configuration.get<string>(`pathTo${testsNameProper}`);
        enableComposer = configuration.get<boolean>(`enable${testsNameProper}`);
        await configuration.updateWs(`pathTo${testsNameProper}`, "php\\composer.exe");
        await configuration.updateWs(`enable${testsNameProper}`, true);
    });


    suiteTeardown(async() =>
    {   //
        // Reset settings
        //
        await configuration.updateWs(`pathTo${testsNameProper}`, pathToComposer);
        await configuration.updateWs(`enable${testsNameProper}`, enableComposer);
    });


    test("Document Position", async () =>
    {
        const provider = teApi.taskProviders.get(testsName) as ComposerTaskProvider;
        // provider.readTasks();
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
    });


    test("Start", async () =>
    {
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks && cTasks.length === 2, "Did not read 2 composer tasks");
    });


    test("Disable", async () =>
    {
        await configuration.updateWs(`enable${testsNameProper}`, false);
        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName);
        await sleep(500);
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(!cTasks || cTasks.length === 0, "Did not read 0 composer tasks");
    });


    test("Re-enable", async () =>
    {
        await configuration.updateWs(`enable${testsNameProper}`, true);
        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName);
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks && cTasks.length === 2, "Did not read 2 composer tasks");
    });


    test("Create file", async () =>
    {
        const dirName = getWsPath("tasks_test_"),
              file = Uri.file(path.join(dirName, "composer.json"));

        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { mode: 0o777 });
        }

        fs.writeFileSync(
            file.fsPath,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2": "open -p tmp.txt",\n' +
            '    "test3": "start -x 1 -y 2"\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "}\n"
        );

        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, file);
        let cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks && cTasks.length === 5, "Did not read 5 composer tasks");

        fs.unlinkSync(file.fsPath);
        fs.rmdirSync(dirName, {
            recursive: true
        });

        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, file);
        cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks.length === 2, "Did not read 2 composer tasks");
    });

});
