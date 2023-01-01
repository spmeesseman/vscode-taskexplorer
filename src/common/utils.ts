/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { RelativePattern, WorkspaceFolder, Uri, workspace, window } from "vscode";
import * as fs from "fs";
import * as minimatch from "minimatch";
import { configuration } from "./configuration";
import constants from "./constants";
import * as path from "path";
import * as os from "os";
import * as log from "./log";
import TaskItem from "../tree/item";


/**
 * Camel case a string
 *
 * @param name The string to manipulate
 * @param indexUpper The index of the string to upper case
 */
export function camelCase(name: string | undefined, indexUpper: number)
{
    if (!name || indexUpper <= 0 || indexUpper >= name.length) {
      return name;
    }

    return name
        .replace(/(?:^\w|[A-Za-z]|\b\w)/g, (letter, index) => {
            return index !== indexUpper ? letter.toLowerCase() : letter.toUpperCase();
        })
        .replace(/[\s\-]+/g, "");
}


export function getCombinedGlobPattern(defaultPattern: string, globs: string[]): string
{
    if (globs && globs.length > 0)
    {
        let multiFilePattern = "{" + defaultPattern;
        for (const i of globs) {
            multiFilePattern += ",";
            multiFilePattern += i;
        }
        multiFilePattern += "}";
        return multiFilePattern;
    }
    return defaultPattern;
}


export function getCwd(uri: Uri): string
{
    return uri.fsPath.substring(0, uri.fsPath.lastIndexOf(path.sep) + 1);
}


export function getGroupSeparator()
{
    return configuration.get<string>("groupSeparator", constants.DEFAULT_SEPARATOR);
}


export function getPackageManager(): string
{
    let pkgMgr = workspace.getConfiguration("npm", null).get<string>("packageManager") || "npm";
    if (pkgMgr.match(/(npm|auto)/)) { // pnpm/auto?  only other option is yarn
        pkgMgr = "npm";
    }
    return pkgMgr;
}


export function getGlobPattern(taskType: string): string
{
    taskType = taskType.replace(/\W*\-/, "");
    if (taskType === "ant") {
        return getCombinedGlobPattern(constants.GLOB_ANT,
                [ ...configuration.get<string[]>("includeAnt", []), ...configuration.get<string[]>("globPatternsAnt", []) ]);
    }
    else if (taskType === "bash") {
        return getCombinedGlobPattern(constants.GLOB_BASH, configuration.get<string[]>("globPatternsBash", []));
    }
    else {
        return constants["GLOB_" + taskType.toUpperCase()];
    }
}

export function getHeaderContent()
{
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <!--
        <meta
            http-equiv="Content-Security-Policy" content="default-src 'self'; img-src \${webview.cspSource} https:; 
            script-src \${webview.cspSource} 'self' 'unsafe-inline'; script-src-elem 'self' 'unsafe-inline';
            style-src \${webview.cspSource}  'unsafe-inline' 'self';"
        />
        -->
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Explorer</title>
        <style>
            button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                padding: 8px 12px;
            }
            button:hover {
                background-color: var(--vscode-button-hoverBackground)
            }
        </style>
        <script type="text/javascript">
            let vscode;
            function getLicense()
            {
                vscode = vscode || acquireVsCodeApi();
                vscode.postMessage({
                    command: 'enterLicense',
                    text: ''
                });
            }
            function viewReport()
            {
                vscode = vscode || acquireVsCodeApi();
                vscode.postMessage({
                    command: 'viewReport',
                    text: ''
                });
            }
        </script>
    </head>
    <body style="padding:20px">`;
}

export function getBodyContent(title: string)
{
    return `
    <table>
            <tr><td>
                <table><tr>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/gears-r-colors.png" height="50" />
                    </td>
                    <td valign="middle" style="font-size:40px;font-weight:bold"> &nbsp;${title}</td>
                </tr></table>
            </td></tr>
            <tr><td>
                <table style="margin-top:15px"><tr>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/npm.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/ant.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/yarn.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/grunt.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/gulp.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/composer.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/workspace.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/make.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/ts.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/bat.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/ruby.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/powershell.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/bash.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/python.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/nsis.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/perl.png" />
                    </td>
                    <td>
                        <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/maven.png" />
                    </td>
                </tr></table>
            </td></tr>
        </table>`;
}


export function getPortableDataPath(padding = "")
{
    /* istanbul ignore else */
    if (process.env.VSCODE_PORTABLE)
    {
        const uri = Uri.parse(process.env.VSCODE_PORTABLE);
        /* istanbul ignore else */
        if (uri)
        {
            if (fs.existsSync(uri.fsPath))
            {
                try {
                    const fullPath = path.join(uri.fsPath, "user-data", "User");
                    log.value(padding + "found portable user data path", fullPath, 1);
                    return fullPath;
                }
                catch (e: any)
                {   /* istanbul ignore next */
                    log.error(e);
                }
            }
        }
    }
    return;
}


export function getRelativePath(folder: WorkspaceFolder, uri: Uri): string
{
    const rootUri = folder.uri;
    const absolutePath = uri.path.substring(0, uri.path.lastIndexOf("/") + 1);
    return absolutePath.substring(rootUri.path.length + 1);
}


export function getScriptTaskTypes(): string[]
{
    return [
        "bash", "batch", "nsis", "perl", "powershell", "python", "ruby"
    ];
}


export function getTaskItemId(taskItem: TaskItem)
{
    return taskItem.id?.replace(constants.LAST_TASKS_LABEL + ":", "")
                       .replace(constants.FAV_TASKS_LABEL + ":", "")
                       .replace(constants.USER_TASKS_LABEL + ":", "");
}


/**
 * @deprecated Use `isTaskTypeEnabled` and `getPathToProgram`
 * To be removed after the temp extension.tempRemapSettingsToNewLayout() method is removed.
 * @param taskType Task type, e.g. `npm`, `apppublisher`, `grunt`, `bash`, etc
 * @param settingPart String prependature for  commonly named setting name
 * @returns The task type's unique setting name
 */
/* istanbul ignore next */
export function getTaskTypeSettingName(taskType: string, settingPart: string)
{   /* istanbul ignore next */
    return settingPart + (!settingPart.endsWith(".") ? properCase(taskType) : taskType.toLowerCase());
}


/**
 * @deprecated Use `isTaskTypeEnabled`
 * To be removed after the temp extension.tempRemapSettingsToNewLayout() method is removed.
 * @param taskType Task type, e.g. `npm`, `apppublisher`, `grunt`, `bash`, etc
 * @returns The task type's unique setting name
 */
/* istanbul ignore next */
export function getTaskTypeEnabledSettingName(taskType: string)
{   /* istanbul ignore next */
    return getTaskTypeSettingName(taskType, "enabledTasks.");
}


export function getTaskProviderType(taskType: string): string
{
    if (isScriptType(taskType)) {
        return "script";
    }
    return taskType;
}


export function getTaskTypes(): string[]
{
    return [
        "ant", "apppublisher", "bash", "batch", "composer",  "gradle", "grunt", "gulp", "make",
        "maven", "npm", "nsis", "perl", "powershell", "python", "pipenv", "ruby", "tsc",  "Workspace"
    ];
}


export function getTaskTypeRealName(taskType: string): string
{
    if (taskType === "workspace") {
        return "Workspace";
    }
    return taskType.toLowerCase();
}


export function getUserDataPath(platform?: string, padding = "")
{
    let userPath: string | undefined = "";

    log.write(padding + "get user data path", 4);
    logUserDataEnv(padding + "   ");
    //
    // Check if data path was passed on the command line
    //
    /* istanbul ignore else */
    if (process.argv)
    {
        let argvIdx = process.argv.includes("--user-data-dir");
        /* istanbul ignore next */
        if (argvIdx !== false && typeof argvIdx === "number" && argvIdx >= 0 && argvIdx < process.argv.length) {
            userPath = path.resolve(process.argv[++argvIdx]);
            log.value(padding + "user path is", userPath, 1);
            return userPath;
        }
    }
    //
    // If this is a portable install (zip install), then VSCODE_PORTABLE will be defined in the
    // environment this process is running in
    //
    userPath = getPortableDataPath(padding + "   ");
    if (!userPath)
    {   //
        // Use system user data path
        //
        userPath = getDefaultUserDataPath(platform);
    }
    userPath = path.resolve(userPath);
    log.value(padding + "user path is", userPath, 1);
    return userPath;
}


function getDefaultUserDataPath(platform?: string)
{   //
    // Support global VSCODE_APPDATA environment variable
    //
    let appDataPath = process.env.VSCODE_APPDATA;
    //
    // Otherwise check per platform
    //
    if (!appDataPath)
    {
        /* istanbul ignore next */
        switch (platform || process.platform)
        {
            case "win32":
                appDataPath = process.env.APPDATA;
                if (!appDataPath) {
                    const userProfile = process.env.USERPROFILE || "";
                    appDataPath = path.join(userProfile, "AppData", "Roaming");
                }
                break;
            case "darwin":
                appDataPath = path.join(os.homedir(), "Library", "Application Support");
                break;
            case "linux":
                appDataPath = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
                break;
            default:
                return ".";
        }
    }
    return path.join(appDataPath, "vscode");
}


export function getWorkspaceProjectName(fsPath: string)
{
    let project = path.basename(fsPath);
    const wsf = workspace.getWorkspaceFolder(Uri.file(fsPath));
    /* istanbul ignore else */
    if (wsf) {
        project = path.basename(wsf.uri.fsPath);
    }
    return project;
}


export function isArray<T>(value: any): value is T[]
{
    return !!value && Array.isArray(value);
}


export function isError(e: any): e is Error
{
    return e instanceof Error;
}


// export function isBoolean(value: any): value is boolean
// {
//     return !!value && typeof value === "boolean";
// }


export function isExcluded(uriPath: string, logPad = "")
{
    function testForExclusionPattern(path: string, pattern: string): boolean
    {
        return minimatch(path, pattern, { dot: true, nocase: true });
    }

    const exclude = configuration.get<string[]>("exclude", []);

    log.blank(4);
    log.write(logPad + "Check exclusion", 4);
    log.value(logPad + "   path", uriPath, 4);


    for (const pattern of exclude) {
        log.value(logPad + "   checking pattern", pattern, 5);
        if (testForExclusionPattern(uriPath, pattern)) {
            log.write(logPad + "   Excluded!", 4);
            return true;
        }
    }

    log.write(logPad + "   Not excluded", 4);
    return false;
}


export function isObject(value: any)
{
    return !!value && (value instanceof Object || typeof value === "object");
}


export function isScriptType(source: string)
{
    return source === "script" || getScriptTaskTypes().includes(source);
}


export function isSpecial(taskItem: TaskItem)
{
    return taskItem && taskItem.id &&
           (taskItem.id.includes(constants.LAST_TASKS_LABEL + ":") ||
           taskItem.id.includes(constants.FAV_TASKS_LABEL + ":") ||
           taskItem.id.includes(constants.USER_TASKS_LABEL + ":"));
}


export function isString(value: any, notEmpty = false): value is string
{
    return (!!value || (value === "" && !notEmpty)) && value instanceof String || typeof value === "string";
}


/**
 * @param taskType Task type, e.g. `npm`, `apppublisher`, `grunt`, `bash`, etc
 * @returns `true` if enabled, `false` if disabled
 */
export function isTaskTypeEnabled(taskType: string)
{
    const settingName = "enabledTasks." + taskType.replace(/\-/g, "").toLowerCase();
    return configuration.get<boolean>(settingName, false);
}


export function isWatchTask(source: string)
{
    return [ "npm", "tsc", "Workspace" ].includes(source);
}


export function isWorkspaceFolder(value: any): value is WorkspaceFolder
{
    return value && typeof value !== "number";
}


function logUserDataEnv(padding: string)
{
    /* istanbul ignore else */
    if (log.isLoggingEnabled())
    {
        log.value(padding + "os", process.platform, 4);
        log.value(padding + "portable", process.env.VSCODE_PORTABLE, 4);
        log.value(padding + "env:VSCODE_APPDATA", process.env.VSCODE_APPDATA, 4);
        log.value(padding + "env:VSCODE_APPDATA", process.env.APPDATA, 4);
        log.value(padding + "env:VSCODE_APPDATA", process.env.USERPROFILE, 4);
        /* istanbul ignore if */
        if (process.platform === "linux") {
            log.value("env:XDG_CONFIG_HOME", process.env.XDG_CONFIG_HOME, 4);
        }
    }
}


export function lowerCaseFirstChar(s: string, removeSpaces: boolean)
{
    let fs = "";
    /* istanbul ignore else */
    if (s)
    {
        fs = s[0].toString().toLowerCase();
        if (s.length > 1) {
            fs += s.substring(1);
        }
        if (removeSpaces) {
            fs = fs.replace(/ /g, "");
        }
    }
    return fs;
}


export function pathExists(pathToCheck: string)
{
    try {
        fs.accessSync(path.resolve(process.cwd(), pathToCheck));
    } catch (err) {
        return false;
    }
    return true;
}


export function pushIfNotExists(arr: any[], item: any)
{
    if (!arr.includes(item)) { arr.push(item); }
}


export function properCase(name: string | undefined)
{
    if (!name) {
      return name;
    }
    return name.replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr) => ltr.toUpperCase()).replace(/[ ]+/g, " ");
}


export function readFileSync(file: string)
{
    const buf = fs.readFileSync(path.resolve(process.cwd(), file));
    return buf.toString();
}


export function removeFromArray(arr: any[], item: any)
{
    let idx = -1;
    let idx2 = -1;

    if (!arr.includes(item)) {
        return;
    }

    for (const each of arr)
    {
        idx++;
        if (item === each) {
            idx2 = idx;
            break;
        }
    }

    /* istanbul ignore else */
    if (idx2 !== -1 && idx2 < arr.length) {
        arr.splice(idx2, 1);
    }
}


let maxTasksMessageShown = false;
const maxTaskTypeMessageShown: any = {};
export function showMaxTasksReachedMessage(taskType?: string)
{
    if ((!maxTasksMessageShown && !taskType) || (taskType && !maxTaskTypeMessageShown[taskType] && Object.keys(maxTaskTypeMessageShown).length < 3))
    {
        window.showInformationMessage(`The max # of parsed ${taskType ?? ""} tasks in un-licensed mode has been reached`);
        if (taskType) {
            maxTaskTypeMessageShown[taskType] = true;
        }
    }
    maxTasksMessageShown = true;
}


export function timeout(ms: number)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}
