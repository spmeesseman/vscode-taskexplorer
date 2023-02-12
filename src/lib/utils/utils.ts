
import { log } from "../log/log";
import * as minimatch from "minimatch";
import { TaskFile } from "../../tree/file";
import { TaskItem } from "../../tree/item";
import { basename, extname, sep } from "path";
import { Globs, Strings } from "../constants";
import { configuration } from "./configuration";
import { Commands, executeCommand } from "../command";
import { LicenseManager } from "../auth/licenseManager";
import { WorkspaceFolder, Uri, workspace, window, Event, Disposable } from "vscode";


export const getCombinedGlobPattern = (defaultPattern: string, globs: string[]) =>
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
};


export const getDateDifference = (date1: Date | number, date2: Date | number, type?: "d" | "h" | "m" | "s") =>
{
	const differene = (typeof date2 === "number" ? date2 : date2.getTime()) - (typeof date1 === "number" ? date1 : date1.getTime());
	switch (type)
    {
		case "s":
			return Math.floor(differene / 1000);
        case "m":
            return Math.floor(differene / (1000 * 60));
        case "h":
            return Math.floor(differene / (1000 * 60 * 60));
		case "d":
			return Math.floor(differene / (1000 * 60 * 60 * 24));
		default:
			return differene;
	}
};


export const getGroupSeparator = () => configuration.get<string>("groupSeparator", Strings.DEFAULT_SEPARATOR);


export const getGlobPattern = (taskType: string) =>
{
    taskType = taskType.replace(/\W*\-/, "");
    if (taskType === "ant") {
        return getCombinedGlobPattern(Globs.GLOB_ANT,
                [ ...configuration.get<string[]>("includeAnt", []), ...configuration.get<string[]>("globPatternsAnt", []) ]);
    }
    else if (taskType === "bash") {
        return getCombinedGlobPattern(Globs.GLOB_BASH, configuration.get<string[]>("globPatternsBash", []));
    }
    else {
        return Globs["GLOB_" + taskType.toUpperCase()];
    }
};


export const getPackageManager = () =>
{
    let pkgMgr = workspace.getConfiguration("npm", null).get<string>("packageManager") || "npm";
    if (pkgMgr.match(/(npm|auto)/)) { // pnpm/auto?  only other option is yarn
        pkgMgr = "npm";
    }
    return pkgMgr;
};


export const getWorkspaceProjectName = (fsPath: string) =>
{
    let project = basename(fsPath);
    const wsf = workspace.getWorkspaceFolder(Uri.file(fsPath));
    /* istanbul ignore else */
    if (wsf) {
        project = basename(wsf.uri.fsPath);
    }
    return project;
};


export const isArray = <T>(value: any): value is T[] => !!value && Array.isArray(value);


export const isBoolean = (value: any): value is boolean => (value === false || value === true) && typeof value === "boolean";


export const isError = (e: any): e is Error => e instanceof Error;


export const isExcluded = (uriPath: string, logPad = "") =>
{
    const exclude = configuration.get<string[]>("exclude", []);

    log.methodStart("Check exclusion", 4, logPad, false, [[ "path", uriPath ]]);

    for (const pattern of exclude)
    {
        log.value("   checking pattern", pattern, 5);
        if (testPattern(uriPath, pattern))
        {
            log.methodDone("Check exclusion", 4, logPad, [[ "excluded", "yes" ]]);
            return true;
        }
        if (!extname(uriPath) && !uriPath.endsWith(sep))
        {
            if (testPattern(uriPath + sep, pattern))
            {
                log.methodDone("Check exclusion", 4, logPad, [[ "excluded", "yes" ]]);
                return true;
            }
        }
    }

    log.methodDone("Check exclusion", 4, logPad, [[ "excluded", "no" ]]);
    return false;
};


export const isFunction = (value: any) => !!value && typeof value === "function";


export const isNumber = (n: any): n is number => (n || n === 0) && typeof n === "number" && isFinite(n);


export const isObject = (value: any): value is { [key: string]: any } => !!value && (value instanceof Object || typeof value === "object") && !isArray(value);


export const isObjectEmpty = (value: any) =>
{
    if (value)
    {
        for (const key in value)
        {
            if ({}.hasOwnProperty.call(value, key)) {
                return false;
            }
        }
    }
    return true;
};


export const isSpecial = (taskItem: TaskItem) =>
{
    return taskItem && taskItem.id &&
           (taskItem.id.includes(Strings.LAST_TASKS_LABEL + ":") ||
            taskItem.id.includes(Strings.FAV_TASKS_LABEL + ":") ||
            taskItem.id.includes(Strings.USER_TASKS_LABEL + ":"));
};


export const isString = (value: any, notEmpty = false): value is string =>
    (!!value || (value === "" && !notEmpty)) && (value instanceof String || typeof value === "string");


export const isTaskFile = (t: any): t is TaskFile => t instanceof TaskFile;


/**
 * @param taskType Task type, e.g. `npm`, `apppublisher`, `grunt`, `bash`, etc
 * @returns `true` if enabled, `false` if disabled
 */
export const isTaskTypeEnabled = (taskType: string) =>
{
    const settingName = "enabledTasks." + taskType.replace(/\-/g, "").toLowerCase();
    return configuration.get<boolean>(settingName, false);
};


export const isUri = (u: any): u is Uri => !!u && u instanceof Uri;


export const isWorkspaceFolder = (value: any): value is WorkspaceFolder => value && typeof value !== "number";


export const lowerCaseFirstChar = (s: string, removeSpaces: boolean) =>
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
};


export const oneTimeEvent = <T>(event: Event<T>): Event<T> =>
{
	return (listener: (e: T) => unknown, thisArgs?: unknown, disposables?: Disposable[]) =>
    {
		const result = event(e => { result.dispose(); return listener.call(thisArgs, e); }, null, disposables);
		return result;
	};
};


export const pushIfNotExists = (arr: any[], item: any) =>
{
    if (!arr.includes(item)) { arr.push(item); }
};


export const pluralize = (s: string, count: number) => `${count} ${s}${count === 1 ? "" : "s"}`;


// export const removeFromArray = <T>(arr: T[], cb: (value: any, index: number, array: T[]) => void)
// {
//     const shallowReverse = arr.slice().reverse();
//     for (const item of shallowReverse)
//     {
//         fn(item, index, object);
//     }
//     shallowReverse.forEach((item, index, object) =>
//     {
//         fn(item, index, object);
//     });
// };

export const removeFromArray = (arr: any[], item: any) =>
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
};


// // Removes \ / : * ? " < > | and C0 and C1 control codes
// // eslint-disable-next-line no-control-regex
// const illegalCharsForFSRegex = /[\\/:*?"<>|\x00-\x1f\x80-\x9f]/g;
//
// export function sanitizeForFileSystem(s: string, replacement: string = '_') {
// 	if (!s) return s;
// 	return s.replace(illegalCharsForFSRegex, replacement);
// }


let maxTasksMessageShown = false;
const maxTaskTypeMessageShown: any = {};
export const showMaxTasksReachedMessage = (licMgr: LicenseManager, taskType?: string, force?: boolean) =>
{
    if (force || ((!maxTasksMessageShown && !taskType) || (taskType && !maxTaskTypeMessageShown[taskType] && Object.keys(maxTaskTypeMessageShown).length < 3)))
    {
        maxTasksMessageShown = true;
        licMgr.setMaxTasksReached(true);
        if (taskType)
        {
            maxTaskTypeMessageShown[taskType] = true;
        }
        const msg = `The max # of parsed ${taskType ?? ""} tasks in un-licensed mode has been reached`;
        return window.showInformationMessage(msg, "Enter License Key", "Info", "Not Now")
		.then(async (action) =>
		{
			if (action === "Enter License Key")
			{
				await executeCommand(Commands.EnterLicense);
			}
			else if (action === "Info")
			{
				await executeCommand(Commands.ShowLicensePage);
			}
		});
    }
};


export const testPattern = (path: string, pattern: string) => minimatch(path, pattern, { dot: true, nocase: true });


export const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
