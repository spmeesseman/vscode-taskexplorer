/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { activate, getWsPath, isReady } from "../helper";
import { TaskExplorerApi } from "../../extension";
import { MakeTaskProvider } from "../../providers/make";
import { readFileSync } from "../../common/utils";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { configuration } from "../../common/configuration";


let teApi: TaskExplorerApi;
let provider: MakeTaskProvider;
let wsFolder: WorkspaceFolder;


suite("Makefile Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady("make") === true, "Setup failed");
        provider = teApi.taskProviders.get("make") as MakeTaskProvider;
        //
        // File path for create/remove
        //
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
    });


    test("Document Position", async () =>
    {
        // provider.readTasks();
        let index = provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        assert(index === 0, `test task position should be 0 (actual ${index}`);
        provider.getDocumentPosition(undefined, "test");
        const makefileContent = readFileSync(getWsPath("make\\makefile"));
        index = provider.getDocumentPosition("rule1", makefileContent);
        assert(index === 273, `rule1 task position should be 273 (actual ${index}`);
        index = provider.getDocumentPosition("rule2", makefileContent);
        assert(index === 306, `rule2 task position should be 306 (actual ${index}`);
        index = provider.getDocumentPosition("clean", makefileContent);
        assert(index === 401, `clean task position should be 401 (actual ${index}`);
        index = provider.getDocumentPosition("clean2", makefileContent);
        assert(index === 449, `clean2 task position should be 449 (actual ${index}`);
        index = provider.getDocumentPosition("clean3", makefileContent);
        assert(index === 730, `clean3 task position should be 730 (actual ${index}`);
        index = provider.getDocumentPosition("rule_does_not_exist", makefileContent);
        assert(index === 0, `rule_does_not_exist task position should be 0 (actual ${index}`);
    });


    test("Path to make", async () =>
    {
        const rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0],
              filePath = getWsPath(path.join("make", "makefile")),
              fileUri = Uri.file(filePath);

        const pathToMake = configuration.get<string>("pathToMake", "nmake");
        await configuration.updateWs("pathToMake", "nmake");
        provider.createTask("test", "test", rootWorkspace, fileUri, []);
        await configuration.updateWs("pathToMake", "make");
        provider.createTask("test", "test", rootWorkspace, fileUri, []);
        await configuration.updateWs("pathToMake", undefined);
        provider.createTask("test", "test", rootWorkspace, fileUri, []);

        await configuration.updateWs("pathToMake", pathToMake);
    });


});
