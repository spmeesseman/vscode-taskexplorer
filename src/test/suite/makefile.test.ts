/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { activate, getWsPath, isReady } from "../helper";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { MakeTaskProvider } from "../../providers/make";
import { readFileSync } from "../../lib/utils/utils";
import { Uri, workspace, WorkspaceFolder } from "vscode";


let teApi: ITaskExplorerApi;
let provider: MakeTaskProvider;


suite("Makefile Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady("make") === true, "    ✘ TeApi not ready");
        provider = teApi.providers.get("make") as MakeTaskProvider;
    });


    test("Document Position", async function()
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


    test("Path to make", async function()
    {
        const rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0],
              filePath = getWsPath(path.join("make", "makefile")),
              fileUri = Uri.file(filePath);

        const pathToMake = teApi.config.get<string>("pathToPrograms.make", "nmake");
        await teApi.config.updateWs("pathToPrograms.make", "nmake");
        provider.createTask("test", "test", rootWorkspace, fileUri, []);
        await teApi.config.updateWs("pathToPrograms.make", "make");
        provider.createTask("test", "test", rootWorkspace, fileUri, []);
        await teApi.config.updateWs("pathToPrograms.make", undefined);
        provider.createTask("test", "test", rootWorkspace, fileUri, []);

        await teApi.config.updateWs("pathToPrograms.make", pathToMake);
    });


});
