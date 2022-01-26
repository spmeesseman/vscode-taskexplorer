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
import { TaskExplorerApi } from "../../interface/taskExplorerApi";
import { ComposerTaskProvider } from "../../providers/composer";
import { properCase } from "../../common/utils";


let teApi: TaskExplorerApi;
let pathToComposer: string;
let enableComposer: boolean;
let dirName: string;
let fileUri: Uri;


suite("Composer Tests", () =>
{
    const testsName = "composer",
          testsNameProper = properCase(testsName);

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate(this);
        assert(isReady(testsName) === true, "TeApi not ready");
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "composer.json"));
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
        const provider = teApi.providers.get(testsName) as ComposerTaskProvider;
        // provider.readTasks();
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
    });


    test("Start", async () =>
    {
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks && cTasks.length === 2, `Did not read 2 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    });


    test("Disable", async () =>
    {
        await configuration.updateWs(`enable${testsNameProper}`, false);
        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName);
        await sleep(500);
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(!cTasks || cTasks.length === 0, `Did not read 0 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    });


    test("Re-enable", async () =>
    {
        await configuration.updateWs(`enable${testsNameProper}`, true);
        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName);
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks && cTasks.length === 2, `Did not read 2 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    });


    test("Create file", async () =>
    {
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { mode: 0o777 });
        }

        fs.writeFileSync(
            fileUri.fsPath,
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
        await teApi.explorerProvider?.invalidateTasksCache(testsName, fileUri);
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks && cTasks.length === 5, `Did not read 5 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    });


    test("Add task to file", async () =>
    {
        fs.writeFileSync(
            fileUri.fsPath,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2": "open -p tmp.txt",\n' +
            '    "test3": "start -x 1 -y 2",\n' +
            '    "test4": "start -x 2 -y 3"\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "}\n"
        );

        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, fileUri);
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks && cTasks.length === 6, `Did not read 6 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    });


    test("Remove task from file", async () =>
    {
        fs.writeFileSync(
            fileUri.fsPath,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2": "open -p tmp.txt"\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "}\n"
        );

        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, fileUri);
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks && cTasks.length === 4, `Did not read 4 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    });


    test("Invalid JSON", async () =>
    {
        fs.writeFileSync(
            fileUri.fsPath,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2" "open -p tmp.txt",,\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "\n"
        );

        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, fileUri);
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks && cTasks.length === 2, `Did not read 2 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    });



    test("Delete file", async () =>
    {
        fs.unlinkSync(fileUri.fsPath);
        fs.rmdirSync(dirName, {
            recursive: true
        });

        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, fileUri);
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks.length === 2, `Did not read 2 ${testsName} tasks (actual ${cTasks ? cTasks.length : 0})`);
    });

});
