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
import { activate, isReady, sleep } from "../helper";
import { TaskExplorerApi } from "../../extension";
import { ComposerTaskProvider } from "../../providers/composer";
import { properCase } from "../../common/utils";


let teApi: TaskExplorerApi;
let rootWorkspace: WorkspaceFolder;
let pathToComposer: string;
let enableComposer: boolean;
let mainFile: Uri;


suite("Composer Tests", () =>
{
    const testsName = "composer",
          testsNameProper = properCase(testsName);

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate();
        assert(isReady(testsName) === true, "Setup failed");
        //
        // File path for create/remove
        //
        rootWorkspace = (workspace.workspaceFolders ? workspace.workspaceFolders[0]: undefined) as WorkspaceFolder;
        mainFile = Uri.file(path.join(rootWorkspace.uri.fsPath, "composer.json"));
        //
        // Store / set initial settings
        //
        await configuration.updateWs(`pathTo${testsNameProper}`, path.resolve(process.cwd(), "..\\..\\test-files\\ant\\bin\\ant.bat"));
        pathToComposer = configuration.get<string>(`pathTo${testsNameProper}`);
        enableComposer = configuration.get<boolean>(`enable${testsNameProper}`);
        await configuration.update(`pathTo${testsNameProper}`, "php\\composer.exe");
        await configuration.update(`enable${testsNameProper}`, true);
    });


    suiteTeardown(async() =>
    {   //
        // Reset settings
        //
        await configuration.update(`pathTo${testsNameProper}`, pathToComposer);
        await configuration.update(`enable${testsNameProper}`, enableComposer);
    });


    test("Utility function cases", async () =>
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
        await configuration.update(`enable${testsNameProper}`, false);
        await sleep(1750);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, mainFile);
        await sleep(1750);
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(!cTasks || cTasks.length === 0, "Did not read 0 composer tasks");
    });


    test("Re-enable", async () =>
    {
        await configuration.update(`enable${testsNameProper}`, true);
        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName, mainFile);
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks && cTasks.length === 2, "Did not read 2 composer tasks");
    });


    test("Create File", async () =>
    {
        const dirName = path.join(rootWorkspace.uri.fsPath, "tasks_test_"),
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
