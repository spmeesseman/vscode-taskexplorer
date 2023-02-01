/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { executeSettingsUpdate, focusExplorerView } from "../utils/commandUtils";
import { IDictionary, ITaskExplorer, ITaskExplorerApi, ITaskFolder } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, exitRollingCount, needsTreeBuild, sleep, suiteFinished, testControl as tc,
    treeUtils,
    verifyTaskCount, waitForTeIdle
} from "../utils/utils";
import { expect } from "chai";
import { TreeItem } from "vscode";

let teApi: ITaskExplorerApi;
let explorer: ITaskExplorer;
let didDisableTasks = false;
let didResetEnabledTasks = false;
let showFavorites = false;
let showLastTasks = false;
let showUserTasks = false;
let enabledTasks: IDictionary<boolean>;
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
        showFavorites = teApi.config.get<boolean>("specialFolders.showFavorites");
        showLastTasks = teApi.config.get<boolean>("specialFolders.showLastTasks");
        showUserTasks = teApi.config.get<boolean>("specialFolders.showUserTasks");
        enabledTasks = { ...teApi.config.get<IDictionary<boolean>>("enabledTasks") };
        if (showUserTasks) {
            await executeSettingsUpdate("specialFolders.showFavorites", false, tc.waitTime.config.showHideSpecialFolder);
        }
        if (showLastTasks) {
            await executeSettingsUpdate("specialFolders.showLastTasks", false, tc.waitTime.config.showHideSpecialFolder);
        }
        if (showUserTasks) {
            await executeSettingsUpdate("specialFolders.showUserTasks", false, tc.waitTime.config.showHideSpecialFolder);
        }
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        if (didDisableTasks && !didResetEnabledTasks) {
            await executeSettingsUpdate("enabledTasks", enabledTasks, tc.waitTime.refreshCommand);
        }
        await executeSettingsUpdate("specialFolders.showFavorites", showFavorites, tc.waitTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showLastTasks", showLastTasks, tc.waitTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showUserTasks", showUserTasks, tc.waitTime.config.showHideSpecialFolder);
        suiteFinished(this);
    });


	test("Focus Explorer View", async function()
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
        this.slow(tc.slowTime.refreshCommand + (tc.slowTime.taskCount.verify * 4));
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
        this.slow(tc.slowTime.refreshCommand + (tc.slowTime.taskCount.verify * 4));
        await executeSettingsUpdate("enabledTasks", enabledTasks, tc.waitTime.refreshCommand);
        didResetEnabledTasks = true;
        const treeTasks = explorer.getTasks();
        const treeFolders = explorer.getTaskTree() as TreeItem[];
        expect(treeFolders).to.not.be.undefined;
        expect(treeFolders.length).to.be.equal(1);
        expect(treeFolders[0].label).to.not.be.equal("No tasks found");
        expect(treeTasks.length).to.be.greaterThan(antStartCount + gruntStartCount + gulpStartCount + pythonStartCount);
        await verifyTaskCount("ant", antStartCount);
        await verifyTaskCount("grunt", gruntStartCount);
        await verifyTaskCount("gulp", gulpStartCount);
        await verifyTaskCount("python", pythonStartCount);
        endRollingCount(this);
    });

});

