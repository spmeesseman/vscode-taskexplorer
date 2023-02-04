
import log from "./log/log";
import TaskItem from "../tree/item";
import { basename } from "path";
import { window, Terminal } from "vscode";


export const getTerminal = (taskItem: TaskItem, logPad = ""): Terminal | undefined =>
{
    let checkNum = 0;
    let term: Terminal | undefined;

    log.write("Get terminal", 1, logPad);

    if (!window.terminals || window.terminals.length === 0)
    {
        log.write("   zero terminals alive", 2, logPad);
        return term;
    }

    // if (window.terminals.length === 1)
    // {
    //     log.write("   return only terminal alive", 2, logPad);
    //     return window.terminals[0];
    // }

    const check = (taskName: string) =>
    {
        let termNum = 0,
            term2: Terminal | undefined;
        log.value("   Checking possible task terminal name #" + (++checkNum).toString(), taskName, 2);
        taskName = taskName.toLowerCase();
        for (const t of window.terminals)
        {
            log.value("      == terminal " + (++termNum) + " name", t.name, 2, logPad);
            let termName = t.name.toLowerCase().replace("task - ", "");
            /* istanbul ignore if */
            if (termName.endsWith(" Task")) {
                termName = termName.substring(0, termName.length - 5);
            }
            /* istanbul ignore else */
            if (taskName.indexOf(termName) !== -1 || /* istanbul ignore next */ termName.indexOf(taskName) !== -1)
            {
                term2 = t;
                log.write("   found!", 2, logPad);
                break;
            }
        }
        return term2;
    };

    let relPath = taskItem.task.definition.path ? /* istanbul ignore next */ taskItem.task.definition.path : "";
    /* istanbul ignore if */
    if (relPath[relPath.length - 1] === "/" || relPath[relPath.length - 1] === "\\")
    {
        relPath = relPath.substring(0, relPath.length - 1);
    }

    /* istanbul ignore next */
    if (taskItem.taskFile.folder.workspaceFolder)
    {
        const lblString = taskItem.task.name;
        let taskName = taskItem.taskFile.label + ": " + taskItem.label +
                        " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
        term = check(taskName);

        if (!term && lblString.indexOf("(") !== -1)
        {
            taskName = taskItem.taskSource + ": " + lblString.substring(0, lblString.indexOf("(")).trim() +
                       (relPath ? " - " : "") + taskItem.taskFile.folder.workspaceFolder.name + ")";
            term = check(taskName);
        }

        if (!term)
        {
            taskName = taskItem.taskSource + ": " + lblString +
                       (relPath ? " - " : "") + relPath + " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
            term = check(taskName);
        }

        if (!term)
        {
            taskName = taskItem.taskSource + ": " + lblString + " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
            term = check(taskName);
        }

        if (!term)
        {
            taskName = taskItem.taskSource + ": " + lblString +
                       (relPath ? " - " : "") + relPath + " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
            term = check(taskName);
        }

        if (!term && taskItem.taskSource === "Workspace")
        {
            taskName = "npm: " + lblString +
                       (relPath ? " - " : "") + relPath + " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
            term = check(taskName);
        }

        if (!term && lblString.indexOf("(") !== -1)
        {
            taskName = taskItem.taskSource + ": " + lblString.substring(0, lblString.indexOf("(")).trim() +
                       (relPath ? " - " : "") + relPath + " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
            term = check(taskName);
        }

        if (!term && lblString.indexOf("(") !== -1)
        {
            taskName = taskItem.taskSource + ": " + lblString.substring(0, lblString.indexOf("(")).trim() +
                       (relPath ? " - " : "") + relPath + " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
            term = check(taskName);
        }

        if (!term && relPath)
        {
            const folder = taskItem.getFolder();
            if (folder) {
                taskName = folder.name + " (" + relPath + ")";
                term = check(taskName);
            }
            if (!term)
            {
                const folder = taskItem.getFolder();
                if (folder) {
                    taskName = folder.name + " (" + basename(relPath) + ")";
                    term = check(taskName);
                }
            }
        }
    }

    return term;
};
