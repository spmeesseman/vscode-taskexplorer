/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { tasks, Uri, workspace, WorkspaceFolder } from "vscode";
import { configuration } from "../../common/configuration";
import { activate, getWsPath, isReady, sleep, verifyTaskCount } from "../helper";
import { TaskExplorerApi } from "../../interface/taskExplorerApi";
import { GulpTaskProvider } from "../../providers/gulp";
import { properCase } from "../../common/utils";


let teApi: TaskExplorerApi;
let provider: GulpTaskProvider;
let dirName: string;
let fileUri: Uri;


suite("Gulp Tests", () =>
{
    const testsName = "gulp",
          testsNameProper = properCase(testsName);

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady(testsName) === true, "TeApi not ready");
        provider = teApi.providers.get(testsName) as GulpTaskProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "gulpfile.js"));
    });


    test("Document Position", async () =>
    {
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
    });


    test("Start", async () =>
    {
        await verifyTaskCount("gulp", 17);
    });


    test("Disable", async () =>
    {
        await configuration.updateWs(`enable${testsNameProper}`, false);
        await sleep(500);
        await teApi.explorer?.invalidateTasksCache(testsName);
        await sleep(500);
        await verifyTaskCount("gulp", 0);
    });


    test("Re-enable", async () =>
    {
        await configuration.updateWs(`enable${testsNameProper}`, true);
        await sleep(500);
        await teApi.explorer?.invalidateTasksCache(testsName);
        await verifyTaskCount("gulp", 17);
    });


    test("Create file", async () =>
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

        await sleep(500);
        await teApi.explorer?.invalidateTasksCache(testsName, fileUri);
        await verifyTaskCount("gulp", 19);
    });


    test("Add task to file", async () =>
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

        await sleep(500);
        await teApi.explorer?.invalidateTasksCache(testsName, fileUri);
        await verifyTaskCount("gulp", 20);
    });


    test("Remove task from file", async () =>
    {
        fs.writeFileSync(
            fileUri.fsPath,
            "var gulp = require('gulp');\n" +
            "gulp.task('hello3', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n"
        );

        await sleep(500);
        await teApi.explorer?.invalidateTasksCache(testsName, fileUri);
        await verifyTaskCount("gulp", 18);
    });


    test("Delete file", async () =>
    {
        fs.unlinkSync(fileUri.fsPath);
        fs.rmdirSync(dirName, {
            recursive: true
        });
        await sleep(500);
        await teApi.explorer?.invalidateTasksCache(testsName, fileUri);
        await verifyTaskCount("gulp", 17);
    });


    test("Gulp Parser", async () =>
    {
        const rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0],
              gulpFile = getWsPath("gulp\\gulpfile.js");
        //
        // Use Gulp
        //
        await configuration.updateWs("useGulp", true);

        // await teApi.explorer?.invalidateTasksCache("gulp");
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
