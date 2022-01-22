/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import { tasks } from "vscode";
import { configuration } from "../../common/configuration";
import { activate } from "../helper";
import { TaskExplorerApi } from "../../extension";
import { AntTaskProvider } from "../../providers/ant";


let teApi: TaskExplorerApi;
let provider: AntTaskProvider;


suite("Ant tests", () =>
{

    setup(async () =>
    {
        teApi = await activate();
        provider = teApi.taskProviders.get("ant") as AntTaskProvider;
        assert(provider);
    });


    test("Ant utility function cases", async function()
    {
        provider.readTasks();
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
    });


    test("Ant reader", async function()
    {
        const useAnt = configuration.get<boolean>("useAnt");

        //
        // Use Ant
        //
        await configuration.updateWs("useAnt", true);
        await teApi.explorerProvider?.invalidateTasksCache("ant");
        await tasks.fetchTasks({
            type: "ant"
        });

        //
        // Don't use Ant, use o.g. custom parser
        //
        await configuration.updateWs("useAnt", false);
        await teApi.explorerProvider?.invalidateTasksCache("ant");
        await tasks.fetchTasks({
            type: "ant"
        });

        //
        // Reset
        //
        await configuration.updateWs("useAnt", useAnt);
    });

});
