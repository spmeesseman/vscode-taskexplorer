/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { focusExplorerView } from "../utils/commandUtils";
import { ITaskExplorer, ITaskExplorerApi, ITaskFolder } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, exitRollingCount, needsTreeBuild, suiteFinished, testControl as tc,
    verifyTaskCount, waitForTeIdle
} from "../utils/utils";
import { expect } from "chai";
import { TreeItem } from "vscode";

let teApi: ITaskExplorerApi;
let explorer: ITaskExplorer;
let didDisableTasks = false;
let didResetEnabledTasks = false;
const antStartCount = 3;
const gruntStartCount = 7;
const gulpStartCount = 17;
const pythonStartCount = 2;

suite("NoScripts TreeItem Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ explorer, teApi } = await activate(this));
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        if (didDisableTasks && !didResetEnabledTasks) {
            await enableDefaultTasks();
        }
        suiteFinished(this);
    });


	test("Focus Tree View", async function()
	{
        if (exitRollingCount(this)) return;
        if (needsTreeBuild(true)) {
            await focusExplorerView(this);
        }
        endRollingCount(this);
	});


    test("Disable All Task Types", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.taskCount.verify * 4) + tc.slowTime.refreshCommand);
        await teApi.config.updateWs("enabledTasks",
        {
            ant: false,
            apppublisher: false,
            bash: false,
            batch: false,
            composer: false,
            gradle: false,
            grunt: false,
            gulp: false,
            jenkins: false,
            make: false,
            maven: false,
            npm: false,
            nsis: false,
            perl: false,
            pipenv: false,
            powershell: false,
            python: false,
            ruby: false,
            tsc: false,
            webpack: false,
            workspace: false
        });
        didDisableTasks = true;
        await waitForTeIdle(tc.waitTime.refreshCommand);
        const treeTasks = explorer.getTaskTree() as TreeItem[];
        expect(treeTasks).to.not.be.undefined;
        expect(treeTasks.length).to.be.equal(1);
        expect(treeTasks[0].label).to.be.equal("No tasks found");
        await verifyTaskCount("ant", 0);
        await verifyTaskCount("grunt", 0);
        await verifyTaskCount("gulp", 0);
        await verifyTaskCount("python", 0);
        endRollingCount(this);
    });


    test("Re-enable Task Types", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.taskCount.verify * 4) + tc.slowTime.refreshCommand);
        await enableDefaultTasks();
        const treeTasks = explorer.getTaskTree() as TreeItem[];
        expect(treeTasks).to.not.be.undefined;
        expect(treeTasks.length).to.be.greaterThan(antStartCount + gruntStartCount + gulpStartCount + pythonStartCount);
        await waitForTeIdle(tc.waitTime.refreshCommand);
        await verifyTaskCount("ant", antStartCount);
        await verifyTaskCount("grunt", gruntStartCount);
        await verifyTaskCount("gulp", gulpStartCount);
        await verifyTaskCount("python", pythonStartCount);
        endRollingCount(this);
    });

});

const enableDefaultTasks = async() =>
{
    await teApi.config.updateWs("enabledTasks",
    {
        ant: true,
        apppublisher: false,
        bash: true,
        batch: true,
        composer: false,
        gradle: false,
        grunt: true,
        gulp: true,
        jenkins: false,
        make: true,
        maven: false,
        npm: true,
        nsis: false,
        perl: false,
        pipenv: false,
        powershell: false,
        python: true,
        ruby: false,
        tsc: true,
        webpack: false,
        workspace: true
    });
    didResetEnabledTasks = true;
    await waitForTeIdle(tc.waitTime.refreshCommand);
};

