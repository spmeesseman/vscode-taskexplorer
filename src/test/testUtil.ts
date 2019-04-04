/* tslint:disable */

import * as cp from "child_process";
import { ChildProcess, SpawnOptions } from "child_process";
import * as fs from "original-fs";
import * as os from "os";
import { type } from "os";
import * as path from "path";
import { extensions, Uri, window } from "vscode";
import { timeout } from "../util";


export function spawn(
  command: string,
  args?: string[],
  options?: SpawnOptions
): ChildProcess {
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


export function activeExtension() {
  return new Promise<void>((resolve, reject) => {
    const extension = extensions.getExtension("spmeesseman.vscode-taskexplorer");
    if (!extension) {
      reject();
      return;
    }

    if (!extension.isActive) {
      extension.activate().then(() => resolve(), () => reject());
    } else {
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
  if (typeof next === "undefined") {
    return originalShowInputBox.call(null, args as any);
  }
  return new Promise((resolve, reject) => {
    resolve(next);
  });
};


const overridesShowQuickPick: any[] = [];


export function overrideNextShowQuickPick(value: any) 
{
  overridesShowQuickPick.push(value);
}

const originalShowQuickPick = window.showQuickPick;


window.showQuickPick = (
  items: any[] | Thenable<any[]>,
  ...args: any[]
): Thenable<any | undefined> => {
  let next = overridesShowQuickPick.shift();
  if (typeof next === "undefined") {
    return originalShowQuickPick.call(null, [items, ...args]);
  }

  if (typeof next === "number" && Array.isArray(items)) {
    next = items[next];
  }

  return new Promise((resolve, reject) => {
    resolve(next);
  });
};
