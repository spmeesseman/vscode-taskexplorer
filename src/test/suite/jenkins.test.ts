/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { expect } from "chai";
import { JenkinsTaskProvider } from "../../providers/jenkins";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, endRollingCount, executeSettingsUpdate, exitRollingCount, focusExplorerView, getWsPath, needsTreeBuild,
    suiteFinished, testControl as tc, testInvDocPositions, verifyTaskCount, waitForTeIdle
} from "../utils/utils";
import { env } from "process";

const testsName = "jenkins";
const startTaskCount = 1;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: JenkinsTaskProvider;
let fileUri: Uri;
let setEnvJenkinsToken = false;

suite("Jenkins Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, fsApi } = await activate(this));
        provider = teApi.providers[testsName] as JenkinsTaskProvider;
        fileUri = Uri.file(path.join(getWsPath("."), "Jenkinsfile"));
        if (!env.JENKINS_API_TOKEN) {
            env.JENKINS_API_TOKEN = "FAKE_TOKEN";
            setEnvJenkinsToken = true;
        }
        teApi.testsApi.enableConfigWatcher(false);
        await executeSettingsUpdate("pathToPrograms.jenkins", "https://jenkins.pjats.com");
        teApi.testsApi.enableConfigWatcher(true);
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        if (setEnvJenkinsToken) {
            delete env.JENKINS_API_TOKEN;
        }
        await fsApi.deleteFile(fileUri.fsPath);
        teApi.testsApi.enableConfigWatcher(false);
        await executeSettingsUpdate("pathToPrograms.jenkins", "");
        teApi.testsApi.enableConfigWatcher(true);
        suiteFinished(this);
    });


	test("Enable (Off by Default)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, tc.waitTime.config.enableEvent);
        endRollingCount(this);
    });


	test("Focus Tree View", async function()
	{
        if (exitRollingCount(this)) return;
        if (needsTreeBuild()) {
            await focusExplorerView(this);
        }
        endRollingCount(this);
	});


    test("Start", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.taskCount.verify);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Disable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.waitTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(fileUri.fsPath,
`
pipeline {
    agent any
    stages {
      stage("Prepare") {
        steps {
            echo "Start pipeline..."
        }
      }
    }
}
`);
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        endRollingCount(this);
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
        testInvDocPositions(provider);
        const docText = await fsApi.readFileAsync(fileUri.fsPath);
        expect(provider.getDocumentPosition("stage", docText)).to.be.equal(0);
        endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Re-create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(fileUri.fsPath,
`
pipeline {
    agent any
    stages {
      stage("Prepare") {
        steps {
            echo "Start pipeline..."
        }
      }
    }
}
`);
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        endRollingCount(this);
});



    test("No Jenkins or Curl Path", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.pathToProgramsEvent * 4) + (tc.slowTime.taskCount.verify * 4));
        try {
            await executeSettingsUpdate("pathToPrograms.curl", "", tc.waitTime.config.pathToProgramsEvent);
            await verifyTaskCount(testsName, 0);
        }
        catch (e) { throw e; }
        finally {
            await executeSettingsUpdate("pathToPrograms.curl", "curl", tc.waitTime.config.pathToProgramsEvent);
            await verifyTaskCount(testsName, startTaskCount + 1);
        }
        try {
            await executeSettingsUpdate("pathToPrograms.jenkins", "", tc.waitTime.config.pathToProgramsEvent);
            await verifyTaskCount(testsName, 0);
        }
        catch (e) { throw e; }
        finally {
            await executeSettingsUpdate("pathToPrograms.jenkins", "https://jenkins.pjats.com", tc.waitTime.config.pathToProgramsEvent);
            await verifyTaskCount(testsName, startTaskCount + 1);
        }
        endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Disable (Default is OFF)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.disableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, tc.waitTime.config.disableEvent);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });

});
