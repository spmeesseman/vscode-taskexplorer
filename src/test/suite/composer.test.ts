/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { tasks, workspace, WorkspaceFolder } from "vscode";
import { configuration } from "../../common/configuration";
import { activate, buildTree, isReady } from "../helper";
import { TaskExplorerApi } from "../../extension";
import { AntTaskProvider } from "../../providers/ant";
import { ComposerTaskProvider } from "../../providers/composer";


let teApi: TaskExplorerApi;
let rootWorkspace: WorkspaceFolder;
let pathToComposer: string;
let enableComposer: boolean;
let file: string;


suite("Composer Tests", () =>
{

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate();
        assert(isReady("composer") === true, "Setup failed");
        //
        // File path for create/remove
        //
        rootWorkspace = (workspace.workspaceFolders ? workspace.workspaceFolders[0]: undefined) as WorkspaceFolder;
        file = path.join(rootWorkspace.uri.fsPath, "tasks_test_", "composer.json");
        //
        // Store / set initial settings
        //
        await configuration.updateWs("pathToComposer", path.resolve(process.cwd(), "..\\..\\test-files\\ant\\bin\\ant.bat"));
        pathToComposer = configuration.get<string>("pathToAnsicon");
        enableComposer = configuration.get<boolean>("enableComposer");
        await configuration.update("pathToComposer", "php\\composer.exe");
        await configuration.update("enableComposer", true);

        await buildTree(this);
    });


    suiteTeardown(async() =>
    {   //
        // Reset settings
        //
        await configuration.update("pathToComposer", pathToComposer);
        await configuration.update("enableComposer", enableComposer);
    });


    test("Composer utility function cases", async () =>
    {
        const provider = teApi.taskProviders.get("composer") as ComposerTaskProvider;
        // provider.readTasks();
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
    });


    test("Composer Start", async () =>
    {
        const cTasks = await tasks.fetchTasks({ type: "composer" });
        assert(cTasks.length === 2, "Did not read 2 composer tasks");
    });


    test("Composer Disable", async () =>
    {
        await configuration.update("enableComposer", false);
        const cTasks = await tasks.fetchTasks({ type: "composer" });
        assert(cTasks.length === 0, "Did not read 0 composer tasks");
    });


    test("Composer Re-enable", async () =>
    {
        await configuration.update("enableComposer", true);
        const cTasks = await tasks.fetchTasks({ type: "composer" });
        assert(cTasks.length === 2, "Did not read 2 composer tasks");
    });


    test("Composer Create File", async () =>
    {
        fs.writeFileSync(
            file,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2": open -p tmp.txt,\n' +
            '    "test3": "start -x 1 -y 2",\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "}\n"
        );

        const cTasks = await tasks.fetchTasks({ type: "composer" });
        assert(cTasks.length === 5, "Did not read 5 composer tasks");
    });


    test("Composer Remove File", async () =>
    {
        fs.unlinkSync(file);
        const cTasks = await tasks.fetchTasks({ type: "composer" });
        assert(cTasks.length === 2, "Did not read 2 composer tasks");
    });

});
