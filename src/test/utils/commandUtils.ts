import { commands } from "vscode";
import { waitForTeIdle, testControl as tc, teApi, teExplorer } from "./utils";

let explorerHasFocused = false;


export const executeSettingsUpdate = async (key: string, value?: any, minWait?: number, maxWait?: number) =>
{
    const rc = await teApi.config.updateWs(key, value);
    await waitForTeIdle(minWait === 0 ? minWait : (minWait || tc.waitTime.config.event),
                        maxWait === 0 ? maxWait : (maxWait || tc.waitTime.max));
    return rc;
};


export const executeTeCommandAsync = async (command: string, minWait?: number, maxWait?: number, ...args: any[]) =>
{
    commands.executeCommand(`${getCmdGroup(command)}.${command}`, ...args);
    await waitForTeIdle(minWait === 0 ? minWait : (minWait || tc.waitTime.command),
                        maxWait === 0 ? maxWait : (maxWait || tc.waitTime.max));
};


export const executeTeCommand2Async = (command: string, args: any[], minWait?: number, maxWait?: number) => executeTeCommandAsync(command, minWait, maxWait, ...args);


export const executeTeCommand = async (command: string, minWait?: number, maxWait?: number, ...args: any[]) =>
{
    const rc = await commands.executeCommand(`${getCmdGroup(command)}.${command}`, ...args);
    await waitForTeIdle(minWait === 0 ? minWait : (minWait || tc.waitTime.command),
                        maxWait === 0 ? maxWait : (maxWait || tc.waitTime.max));
    return rc;
};


export const executeTeCommand2 = (command: string, args: any[], minWait?: number, maxWait?: number) => executeTeCommand(command, minWait, maxWait, ...args);


export const focusExplorerView = async (instance?: any) =>
{
    if (!teExplorer.isVisible())
    {
        if (instance) {
            instance.slow(tc.slowTime.focusCommand + tc.slowTime.refreshCommand);
        }
        await executeTeCommand("focus", tc.waitTime.focusCommand);
        await waitForTeIdle(tc.waitTime.focusCommand);
        explorerHasFocused = true;
    }
    else if (instance) {
        instance.slow(tc.slowTime.focusCommandAlreadyFocused);
        await waitForTeIdle(tc.waitTime.min);
    }
};


export const focusSearchView = () => commands.executeCommand("workbench.view.search.focus");


const getCmdGroup = (command: string) =>
{
    let cmdGroup = "taskExplorer";        // Tree command
    if (command === "addToExcludesEx" || command === "enterLicense" || command === "getApi" || command === "disableTaskType" ||
        command === "enableTaskType"  || command === "removeFromExcludes" || command === "showOutput" || command === "viewLicense" || command === "viewReport")
    {
        cmdGroup = "vscode-taskexplorer"; // Global command
    }
    return cmdGroup;
};


export const hasExplorerFocused = () => explorerHasFocused;
