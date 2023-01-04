

import { visit, JSONVisitor } from "jsonc-parser";
import { TextDocument } from "vscode";
import { getTaskName } from "./getTaskName";
import TaskItem from "../tree/item";
import * as log from "./utils/log";
import { providers, providersExternal } from "../extension";
import { isWatchTask } from "./utils/utils";


function findJsonDocumentPosition(documentText: string, taskItem: TaskItem)
{
    let inScripts = false;
    let inTasks = false;
    let inTaskLabel: any;
    let scriptOffset = 0;

    log.methodStart("find json document position", 3, "   ", false, [[ "task name", taskItem.task.name ]]);

    const visitor: JSONVisitor =
    {
        onError: () =>
        {
            return scriptOffset;
        },
        onObjectEnd: () =>
        {
            if (inScripts)
            {
                inScripts = false;
            }
        },
        onLiteralValue: (value: any, offset: number, _length: number) =>
        {
            if (inTaskLabel)
            {
                if (typeof value === "string")
                {
                    if (inTaskLabel === "label" || inTaskLabel === "script")
                    {
                        log.value("   check string property", value, 4, "   ");
                        if (taskItem.task.name === value)
                        {
                            scriptOffset = offset;
                        }
                    }
                }
                inTaskLabel = undefined;
            }
        },
        onObjectProperty: (property: string, offset: number, _length: number) =>
        {
            if (property === "scripts")
            {
                inScripts = true;
                if (!taskItem)
                { // select the script section
                    scriptOffset = offset;
                }
            }
            else if (inScripts && taskItem)
            {
                const label = getTaskName(property, taskItem.task.definition.path);
                log.value("   check object property", label, 4, "   ");
                if (taskItem.task.name === label)
                {
                    scriptOffset = offset;
                }
            }
            else if (property === "tasks")
            {
                inTasks = true;
                if (!inTaskLabel)
                { // select the script section
                    scriptOffset = offset;
                }
            }
            else if ((property === "label" || property === "script") && inTasks && !inTaskLabel)
            {
                inTaskLabel = "label";
                if (!inTaskLabel)
                { // select the script section
                    scriptOffset = offset;
                }
            }
            else
            { // nested object which is invalid, ignore the script
                inTaskLabel = undefined;
            }
        }
    };

    visit(documentText, visitor);

    log.methodDone("find json document position", 3, "   ", false, [[ "position", scriptOffset ]]);
    return scriptOffset;
}


export function findDocumentPosition(document: TextDocument, taskItem: TaskItem): number
{
    let scriptOffset = 0;
    const documentText = document.getText();

    log.methodStart("find task definition document position", 1, "", true,
        [[ "task label", taskItem.label ], [ "task source", taskItem.taskSource ]]
    );

    const def = taskItem.task.definition;
    if (taskItem.taskSource === "npm" || taskItem.taskSource === "Workspace")
    {
        log.write("   find json position", 2);
        scriptOffset = findJsonDocumentPosition(documentText, taskItem);
    }
    else if (!isWatchTask(taskItem.taskSource))
    {
        const provider = providers.get(def.type) || providersExternal.get(def.type);
        scriptOffset = provider?.getDocumentPosition(taskItem.task.name, documentText) || -1;
    }

    if (scriptOffset === -1) {
        scriptOffset = 0;
    }

    log.methodDone("find task definition document position", 1, "", true, [[ "offset", scriptOffset ]]);
    return scriptOffset;
}
