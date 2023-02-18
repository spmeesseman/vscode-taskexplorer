/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import fsUtils from  "../utils/fsUtils";
import { Uri } from "vscode";
import { expect } from "chai";
import { startupFocus } from "../utils/suiteUtils";
import { executeSettingsUpdate } from "../utils/commandUtils";
import { ITaskExplorerApi,  ITaskExplorerProvider, ITeWrapper } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, exitRollingCount, getWsPath, suiteFinished, testControl as tc,
    testInvDocPositions, verifyTaskCount
} from "../utils/utils";

const testsName = "pipenv";
const startTaskCount = 3;

let teApi: ITaskExplorerApi;
let teWrapper: ITeWrapper;
let provider: ITaskExplorerProvider;
let dirName: string;
let fileUri: Uri;


suite("Pipenv Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, teWrapper } = await activate(this));
        provider = teApi.providers[testsName] as ITaskExplorerProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "Pipfile"));
        await fsUtils.createDir(dirName);
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await teWrapper.fs.deleteDir(dirName);
        suiteFinished(this);
    });


    test("Enable (Off by Default)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, tc.waitTime.config.enableEvent);
        endRollingCount(this);
    });


	test("Focus Explorer View", async function()
	{
        await startupFocus(this);
	});


    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
        testInvDocPositions(provider);
        const docText = await teWrapper.fs.readFileAsync(path.join(getWsPath("."), "Pipfile"));
        expect(provider.getDocumentPosition("convert-ui", docText)).to.be.greaterThan(0);
        expect(provider.getDocumentPosition("build-exe", docText)).to.be.greaterThan(0);
        expect(provider.getDocumentPosition("test44", docText)).to.be.equal(0);
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
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsUtils.createFile(
            fileUri.fsPath,
`[[source]]
url = "https://pypi.org/simple"
verify_ssl = true
name = "pypi"

[packages]
pyside6 = "*"
mypy = "*"
paramiko = "*"
pyinstaller = {extras = ["encryption"], version = "*"}

[dev-packages]
isort = "*"
flake8 = "*"
pyinstaller = "*"

[requires]
python_version = "3.9"

[scripts]
convert-ui2 = "pyside6-uic ui_mainwindow.ui > ui_mainwindow.py"
build-exe2 = "pyinstaller --name='RobPySide6SSHgui' --windowed --onefile ./main.py"
`
        );
        await verifyTaskCount(testsName, startTaskCount + 2);
        endRollingCount(this);
    });


    test("Add Task to File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.taskCount.verify);
        await fsUtils.writeFile(
            fileUri.fsPath,
`[[source]]
url = "https://pypi.org/simple"
verify_ssl = true
name = "pypi"

[packages]
pyside6 = "*"
mypy = "*"
paramiko = "*"
pyinstaller = {extras = ["encryption"], version = "*"}

[dev-packages]
isort = "*"
flake8 = "*"
pyinstaller = "*"

[requires]
python_version = "3.9"

[scripts]
convert-ui2 = "pyside6-uic ui_mainwindow.ui > ui_mainwindow.py"
build-exe2 = "pyinstaller --name='RobPySide6SSHgui' --windowed --onefile ./main.py"
run-dev = "python main.py"
`
        );
        await verifyTaskCount(testsName, startTaskCount + 3);
        endRollingCount(this);
    });


    test("Remove Task from File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsUtils.writeFile(
            fileUri.fsPath,
`[[source]]
url = "https://pypi.org/simple"
verify_ssl = true
name = "pypi"

[packages]
pyside6 = "*"
mypy = "*"
paramiko = "*"
pyinstaller = {extras = ["encryption"], version = "*"}

[dev-packages]
isort = "*"
flake8 = "*"
pyinstaller = "*"

[requires]
python_version = "3.9"

[scripts]
convert-ui2 = "pyside6-uic ui_mainwindow.ui > ui_mainwindow.py"
build-exe2 = "pyinstaller --name='RobPySide6SSHgui' --windowed --onefile ./main.py"
`
        );
        await verifyTaskCount(testsName, startTaskCount + 2);
        endRollingCount(this);
    });


    test("Invalid File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsUtils.writeFile(
            fileUri.fsPath,
`[[src]]
url = "https://pypi.org/simple"
verify_ssl = true
name = "pypi"
[script]
convert-ui2 = "pyside6-uic ui_mainwindow.ui > ui_mainwindow.py"
build-exe2 = "pyinstaller --name='RobPySide6SSHgui' --windowed --onefile ./main.py"
`
        );
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsUtils.deleteFile(fileUri.fsPath);
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
