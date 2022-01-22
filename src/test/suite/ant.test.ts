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


let teApi: TaskExplorerApi;


suite("Ant tests", () =>
{

    setup(async () =>
    {
        teApi = await activate();
    });


    test("Ant reader", async function()
    {
        const useAnt = configuration.get<boolean>("useAnt");

        //
        // Use Ant
        //
        await configuration.updateWs("useAnt", true);
        let taskItems = await tasks.fetchTasks({
            type: "ant"
        });

        //
        // Don't use Ant, use o.g. custom parser
        //
        await configuration.updateWs("useAnt", false);
        taskItems = await tasks.fetchTasks({
            type: "ant"
        });

        //
        // Reset
        //
        await configuration.updateWs("useAnt", useAnt);
    });

});
