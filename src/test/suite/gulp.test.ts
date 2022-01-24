/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { workspace, WorkspaceFolder } from "vscode";
import { configuration } from "../../common/configuration";
import { activate, getWsPath, isReady } from "../helper";
import { TaskExplorerApi } from "../../extension";
import { GulpTaskProvider } from "../../providers/gulp";


let teApi: TaskExplorerApi;
let provider: GulpTaskProvider;


suite("Gulp Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady("ant") === true, "Setup failed");
        //
        // Task provider
        //
        provider = teApi.taskProviders.get("gulp") as GulpTaskProvider;
    });


    test("Document Position", async () =>
    {
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
    });


    test("Gulp Parser", async () =>
    {
        const rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0],
              gulpFile = getWsPath("gulp\\gulpfile.js");
        //
        // Use Gulp
        //
        await configuration.updateWs("useGulp", true);

        // await teApi.explorerProvider?.invalidateTasksCache("gulp");
        // await tasks.fetchTasks({ type: "gulp" });
        // gulpTasks = await provider.readUriTasks(Uri.file(buildXmlFile));
        // assert(gulpTasks.length === 2, "# of Gulp tasks should be 2");
        // gulpTasks = await provider.readUriTasks(Uri.file(buildXmlFile), rootWorkspace);
        // assert(gulpTasks.length === 2, "# of Gulp tasks should be 2");

        //
        // Reset
        //
        await configuration.updateWs("useGulp", false);
    });

});
