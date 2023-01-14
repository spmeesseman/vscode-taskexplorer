/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import { activate, exitRollingCount, getWsPath, suiteFinished } from "../utils/utils";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { MakeTaskProvider } from "../../providers/make";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { join } from "path";


let teApi: ITaskExplorerApi;
let provider: MakeTaskProvider;
let successCount = -1;


suite("Makefile Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        provider = teApi.providers.get("make") as MakeTaskProvider;
        ++successCount;
    });


    suiteTeardown(async function()
    {
        suiteFinished(this);
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        // provider.readTasks();
        let index = provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        assert(index === 0, `test task position should be 0 (actual ${index}`);
        provider.getDocumentPosition(undefined, "test");
        const makefileContent = teApi.testsApi.fs.readFileSync(getWsPath("make\\makefile"));
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
        ++successCount;
    });


    test("Path to make", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        const rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0],
              filePath = getWsPath(join("make", "makefile")),
              fileUri = Uri.file(filePath);
        const pathToMake = teApi.config.get<string>("pathToPrograms.make", "nmake");
        await teApi.config.updateWs("pathToPrograms.make", "nmake");
        provider.createTask("test", "test", rootWorkspace, fileUri, []);
        await teApi.config.updateWs("pathToPrograms.make", "make");
        provider.createTask("test", "test", rootWorkspace, fileUri, []);
        await teApi.config.updateWs("pathToPrograms.make", undefined);
        provider.createTask("test", "test", rootWorkspace, fileUri, []);
        await teApi.config.updateWs("pathToPrograms.make", pathToMake);
        ++successCount;
    });


});
