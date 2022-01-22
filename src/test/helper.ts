/* eslint-disable prefer-arrow/prefer-arrow-functions */
import * as cp from "child_process";
import * as path from "path";
import * as assert from "assert";
import { CancellationToken, extensions, QuickPickOptions, window, workspace } from "vscode";
import { TaskExplorerApi } from "../extension";
import TaskItem from "../tree/item";
import { configuration } from "../common/configuration";


let activated = false;
let teApi: TaskExplorerApi;
const serverActivationDelay = 2500;
const invalidationDelay = 400;
let docValidationDelay: number | undefined;
let taskExplorerEnabled: boolean;


export function findIdInTaskMap(id: string, taskMap: Map<string, TaskItem>)
{
    let found = 0;
    for (const [ k, task ] of taskMap)
    {
        if (task.id?.includes(id) && !task.isUser) {
            if (task.id === ":ant") {
                console.error("ant: " + task.resourceUri?.fsPath);
            }
            found++;
        }
    }
    return found;
}


export function spawn(command: string, args?: string[], options?: cp.SpawnOptions): cp.ChildProcess
{
    let proc: cp.ChildProcess;
    if (options) {
        proc = cp.spawn(command, args || [], options);
    }
    else {
        proc = cp.spawn(command, args || []);
    }

    // let fullCommand = "command: " + command;

    // if (args) {
    //   fullCommand += ' "' + args.join('" "') + '"';
    // }
    // console.log(fullCommand);

    // proc.stdout.on("data", function(data) {
    //   console.log("stdout: " + data.toString());
    // });

    // proc.stderr.on("data", function(data) {
    //   console.log("stderr: " + data.toString());
    // });

    // proc.on("exit", function(code) {
    //   console.log("child process exited with code " + code.toString());
    // });

    return proc;
}

/*
export async function waitForActiveExtension(extension: Extension<any>)
{
    return new Promise((resolve,reject) => setTimeout(() =>
    {
        if (!extension || !extension.isActive) {
            return waitForActiveExtension();
        }
        else {
            resolve();
        }
    }, 500));
}
*/

/**
 * Activates the spmeesseman.vscode-taskexplorer extension
 */
export async function activate()
{
    const ext = extensions.getExtension("spmeesseman.vscode-taskexplorer")!;
    assert(ext, "Could not find extension");

    if (!activated)
    {
        teApi = await ext.activate();
        await sleep(serverActivationDelay); // Wait for server activation
        activated = true;
    }
    return teApi;
}


export async function cleanup()
{
    // await configuration.update("validationDelay", docValidationDelay);
    // await workspace.getConfiguration().update("extjsIntellisense.enableTaskView", taskExplorerEnabled);
}


export function activeExtension()
{
    return new Promise<void>((resolve, reject) =>
    {
        const extension = extensions.getExtension("spmeesseman.vscode-taskexplorer");
        if (!extension) {
            reject();
            return;
        }
        if (!extension.isActive) {
            extension.activate().then(() => resolve(), () => reject());
        } else
        {
            resolve();
        }
    });
}


export const getWsPath = (p: string) =>
{
	return path.normalize(path.resolve(__dirname, "../../../test-files", p));
};


const overridesShowInputBox: any[] = [];


export function overrideNextShowInputBox(value: any)
{
    overridesShowInputBox.push(value);
}


export async function sleep(ms: number)
{
	return new Promise(resolve => setTimeout(resolve, ms));
}


const originalShowInputBox = window.showInputBox;


window.showInputBox = (...args: any[]) =>
{
    const next = overridesShowInputBox.shift();
    if (typeof next === "undefined")
    {
        return originalShowInputBox.call(null, args as any);
    }
    return new Promise((resolve, reject) =>
    {
        resolve(next);
    });
};

