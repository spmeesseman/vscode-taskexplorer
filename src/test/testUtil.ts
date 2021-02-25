/* eslint-disable prefer-arrow/prefer-arrow-functions */
import * as cp from "child_process";
import { extensions, window } from "vscode";
import TaskItem from "../tree/item";


export function findIdInTaskMap(id: string, taskMap: Map<string, TaskItem>)
{
    let found = 0;
    for (const [ k, task ] of taskMap)
    {
        if (task.id.includes(id) && !task.isUser) {
            found++;
        }
    }
    return found;
}


export function spawn(command: string, args?: string[], options?: cp.SpawnOptions): cp.ChildProcess
{
    const proc = cp.spawn(command, args, options);

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


const overridesShowInputBox: any[] = [];


export function overrideNextShowInputBox(value: any)
{
    overridesShowInputBox.push(value);
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


const overridesShowQuickPick: any[] = [];


export function overrideNextShowQuickPick(value: any)
{
    overridesShowQuickPick.push(value);
}

const originalShowQuickPick = window.showQuickPick;


window.showQuickPick = (items: any[] | Thenable<any[]>, ...args: any[]): Thenable<any | undefined> =>
{
    let next = overridesShowQuickPick.shift();
    if (typeof next === "undefined")
    {
        return originalShowQuickPick.call(null, [items, ...args]);
    }

    if (typeof next === "number" && Array.isArray(items))
    {
        next = items[next];
    }

    return new Promise((resolve, reject) =>
    {
        resolve(next);
    });
};
