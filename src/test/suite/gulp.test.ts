/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { configuration } from "../../common/configuration";
import { activate, getWsPath, isReady, testsControl, verifyTaskCount } from "../helper";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { GulpTaskProvider } from "../../providers/gulp";

const testsName = "gulp";
const waitTimeForFsModEvent = testsControl.waitTimeForFsModifyEvent;
const waitTimeForFsDelEvent = testsControl.waitTimeForFsDeleteEvent;
const waitTimeForFsNewEvent = testsControl.waitTimeForFsCreateEvent;
const waitTimeForConfigEvent = testsControl.waitTimeForConfigEvent;

let teApi: TaskExplorerApi;
let provider: GulpTaskProvider;
let dirName: string;
let fileUri: Uri;


suite("Gulp Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady(testsName) === true, "    ✘ TeApi not ready");
        provider = teApi.providers.get(testsName) as GulpTaskProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "gulpfile.js"));
    });


    test("Document Position", async function()
    {
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
    });


    test("Start", async function()
    {
        await verifyTaskCount(testsName, 17);
    });


    test("Disable", async function()
    {
        await configuration.updateWs("enabledTasks.gulp", false);
        await teApi.waitForIdle(waitTimeForConfigEvent);
        await verifyTaskCount(testsName, 0);
    });


    test("Re-enable", async function()
    {
        await configuration.updateWs("enabledTasks.gulp", true);
        await teApi.waitForIdle(waitTimeForConfigEvent);
        await verifyTaskCount(testsName, 17);
    });


    test("Create file", async function()
    {
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { mode: 0o777 });
        }

        fs.writeFileSync(
            fileUri.fsPath,
            "var gulp = require('gulp');\n" +
            "gulp.task('hello3', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n" +
            'gulp.task(\n"hello4", (done) => {\n' +
            "    console.log('Hello4!');\n" +
            "    done();\n" +
            "});\n"
        );

        await teApi.waitForIdle(waitTimeForFsNewEvent);
        await verifyTaskCount(testsName, 19);
    });


    test("Add task to file", async function()
    {
        fs.writeFileSync(
            fileUri.fsPath,
            "var gulp = require('gulp');\n" +
            "gulp.task('hello3', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n" +
            'gulp.task(\n"hello4", (done) => {\n' +
            "    console.log('Hello4!');\n" +
            "    done();\n" +
            "});\n" +
            'gulp.task(\n"hello5", (done) => {\n' +
            "    console.log('Hello5!');\n" +
            "    done();\n" +
            "});\n"
        );

        await teApi.waitForIdle(waitTimeForFsModEvent);
        await verifyTaskCount(testsName, 20);
    });


    test("Remove task from file", async function()
    {
        fs.writeFileSync(
            fileUri.fsPath,
            "var gulp = require('gulp');\n" +
            "gulp.task('hello3', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n"
        );

        await teApi.waitForIdle(waitTimeForFsModEvent);
        await verifyTaskCount(testsName, 18);
    });


    test("Delete file", async function()
    {
        fs.unlinkSync(fileUri.fsPath);
        fs.rmdirSync(dirName, {
            recursive: true
        });

        await teApi.waitForIdle(waitTimeForFsDelEvent);
        await verifyTaskCount(testsName, 17);
    });


    test("Gulp Parser", async function()
    {
        const rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0],
              gulpFile = getWsPath("gulp\\gulpfile.js");
        //
        // Use Gulp
        //
        await configuration.updateWs("useGulp", true);

        // await teApi.explorer?.invalidateTasksCache(testsName);
        // await tasks.fetchTasks({ type: testsName });
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
