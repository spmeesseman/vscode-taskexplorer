/* tslint:disable */

import * as cp from "child_process";
import { ChildProcess, SpawnOptions } from "child_process";
import * as fs from "fs";
import * as os from "os";
import { type } from "os";
import * as path from "path";
import * as tmp from "tmp";
import { extensions, Uri, window } from "vscode";
import { timeout } from "../util";

tmp.setGracefulCleanup();

const tempDirList: tmp.SynchrounousResult[] = [];

export function getSvnUrl(uri: Uri) {
  const url = uri.toString();

  return url.replace(/%3A/g, ":");
}

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

export function newTempDir(prefix: string) {
  const dir = tmp.dirSync({
    prefix,
    unsafeCleanup: true
  });

  tempDirList.push(dir);

  return dir.name;
}

export async function destroyPath(fullPath: string) {
  fullPath = fullPath.replace(/^file\:\/\/\//, "");

  if (!fs.existsSync(fullPath)) {
    return false;
  }

  if (!fs.lstatSync(fullPath).isDirectory()) {
    fs.unlinkSync(fullPath);
    return true;
  }

  const files = fs.readdirSync(fullPath);
  for (const file of files) {
    destroyPath(path.join(fullPath, file));
  }

  // Error in windows with anti-malware
  for (let i = 0; i < 3; i++) {
    try {
      fs.rmdirSync(fullPath);
      break;
    } catch (error) {
      await timeout(3000);
      console.error(error);
    }
  }
  return true;
}

export function destroyAllTempPaths() {
  let dir;
  while ((dir = tempDirList.shift())) {
    try {
      dir.removeCallback();
    } catch (error) {}
  }
}

export function activeExtension() {
  return new Promise<void>((resolve, reject) => {
    const extension = extensions.getExtension("spmeesseman.vscode-taskview");
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

export function overrideNextShowInputBox(value: any) {
  overridesShowInputBox.push(value);
}

const originalShowInputBox = window.showInputBox;

window.showInputBox = (options?: any, token?: any) => {
  const next = overridesShowInputBox.shift();
  if (typeof next === "undefined") {
    return originalShowInputBox.call(null, options as any);
  }
  return new Promise((resolve, reject) => {
    resolve(next);
  });
};

const overridesShowQuickPick: any[] = [];

export function overrideNextShowQuickPick(value: any) {
  overridesShowQuickPick.push(value);
}

const originalShowQuickPick = window.showQuickPick;

window.showQuickPick = (
  items: any[] | Thenable<any[]>,
  options?: any,
  token?: any
): Thenable<any | undefined> => {
  let next = overridesShowQuickPick.shift();
  if (typeof next === "undefined") {
    return originalShowQuickPick.call(null, options as any);
  }

  if (typeof next === "number" && Array.isArray(items)) {
    next = items[next];
  }

  return new Promise((resolve, reject) => {
    resolve(next);
  });
};
