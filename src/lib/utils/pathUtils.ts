
import { log } from "../log/log";
import { dirname, join, relative, resolve, sep } from "path";
import { Task, Uri, WorkspaceFolder } from "vscode";
import { pathExists, pathExistsSync } from "./fs";
import { homedir } from "os";
import { isWorkspaceFolder } from "./utils";


export const getCwd = (uri: Uri): string =>
{
    return uri.fsPath.substring(0, uri.fsPath.lastIndexOf(sep) + 1);
};


/**
 * Gets the base/root/install path of the extension
 */
export const getInstallPath = async() =>
{
    let dir = __dirname;
    while (dir.length > 3 && !(await pathExists(join(dir, "package.json")))) {
        dir = dirname(dir);
    }
    return dir;
};


export const getInstallPathSync = () =>
{
    let dir = __dirname;
    while (dir.length > 3 && !(pathExistsSync(join(dir, "package.json")))) {
        dir = dirname(dir);
    }
    return dir;
};


export const getPortableDataPath = (logPad = "") =>
{
    /* istanbul ignore else */
    if (process.env.VSCODE_PORTABLE)
    {
        const uri = Uri.parse(process.env.VSCODE_PORTABLE);
        /* istanbul ignore else */
        if (uri)
        {
            if (pathExistsSync(uri.fsPath))
            {
                try {
                    const fullPath = join(uri.fsPath, "user-data", "User");
                    log.value(logPad + "found portable user data path", fullPath, 4);
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
};


export const getRelativePath = (folder: WorkspaceFolder, uri: Uri): string =>
{
    const rootUri = folder.uri;
    const absolutePath = uri.path.substring(0, uri.path.lastIndexOf("/") + 1);
    return absolutePath.substring(rootUri.path.length + 1);
};


export const getTaskRelativePath = (task: Task) =>
{
    let relativePath = task.definition.path ?? "";
    if (task.source === "tsc" && isWorkspaceFolder(task.scope))
    {
        if (task.name.indexOf(" - ") !== -1 && task.name.indexOf(" - tsconfig.json") === -1)
        {
            relativePath = dirname(task.name.substring(task.name.indexOf(" - ") + 3));
        }
    }
    return relativePath;
};


export const getUserDataPath = (platform?: string, logPad = "") =>
{
    let userPath: string | undefined = "";

    log.write(logPad + "get user data path", 4);
    logUserDataEnv(logPad + "   ");
    //
    // Check if data path was passed on the command line
    //
    let argvIdx = process.argv.indexOf("--user-data-dir");
    if (argvIdx !== -1) {
        userPath = resolve(process.argv[++argvIdx]);
        log.value(logPad + "user path is", userPath, 4);
        return userPath;
    }
    //
    // If this is a portable install (zip install), then VSCODE_PORTABLE will be defined in the
    // environment this process is running in
    //
    userPath = getPortableDataPath(logPad + "   ");
    if (!userPath)
    {   //
        // Use system user data path
        //
        userPath = getDefaultUserDataPath(platform);
    }
    userPath = resolve(userPath);
    log.value(logPad + "user path is", userPath, 4);
    return userPath;
};


const getDefaultUserDataPath = (platform?: string) =>
{   //
    // Support global VSCODE_APPDATA environment variable
    //
    let appDataPath = process.env.VSCODE_APPDATA;
    //
    // Otherwise check per platform
    //
    if (!appDataPath)
    {
        switch (platform || process.platform)
        {
            case "win32":
                appDataPath = process.env.APPDATA;
                if (!appDataPath) {
                    const userProfile = process.env.USERPROFILE || "";
                    appDataPath = join(userProfile, "AppData", "Roaming");
                }
                break;
            case "darwin":
                appDataPath = join(homedir(), "Library", "Application Support");
                break;
            case "linux":
                appDataPath = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
                break;
            default:
                return ".";
        }
    }
    return join(appDataPath, "vscode");
};


const logUserDataEnv = (padding: string) =>
{
    if (log.isLoggingEnabled())
    {
        log.value(padding + "os", process.platform, 4);
        log.value(padding + "portable", process.env.VSCODE_PORTABLE, 4);
        log.value(padding + "env:VSCODE_APPDATA", process.env.VSCODE_APPDATA, 4);
        log.value(padding + "env:VSCODE_APPDATA", process.env.APPDATA, 4);
        log.value(padding + "env:VSCODE_APPDATA", process.env.USERPROFILE, 4);
        log.value("env:XDG_CONFIG_HOME", process.env.XDG_CONFIG_HOME, 4); // linux
    }
};
