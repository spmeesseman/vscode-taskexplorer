
import log from "./log/log";
import { visit, JSONVisitor } from "jsonc-parser";
import { TextDocument } from "vscode";
import TaskItem from "../tree/item";
import { providers, providersExternal } from "../extension";
import { isWatchTask } from "./utils/utils";


const findJsonDocumentPosition = (documentText: string, taskItem: TaskItem): number =>
{
    let inScripts = false;
    let inTasks = false;
    let inTaskLabel: any;
    let scriptOffset = 0;

    log.methodStart("find json document position", 3, "   ", false, [[ "task name", taskItem.task.name ]]);

    const visitor: JSONVisitor =
    {
        onError: /* instanbul ignore next */() =>
        {
            /* instanbul ignore next */
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
                /* instanbul ignore else */
                if (typeof value === "string" && (inTaskLabel === "label" || /* instanbul ignore next */inTaskLabel === "script"))
                {
                    log.value("   check string property", value, 4, "   ");
                    if (taskItem.task.name === value)
                    {
                        scriptOffset = offset;
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
            }
            else if (inScripts && taskItem)
            {
                log.value("   check object property", property, 4, "   ");
                if (taskItem.task.name === property || taskItem.task.name.startsWith(property + " - "))
                {
                    scriptOffset = offset;
                }
            }
            else if (property === "tasks")
            {
                inTasks = true;
                /* istanbul ignore else */
                if (!inTaskLabel)
                { // select the script section
                    scriptOffset = offset;
                }
            }
            else if ((property === "label" || property === "script") && inTasks && !inTaskLabel)
            {
                inTaskLabel = "label";
            }
            else
            { // nested object which is invalid, ignore the script
                inTaskLabel = undefined;
            }
        }
    };

    visit(documentText, visitor);

    log.methodDone("find json document position", 3, "   ", [[ "position", scriptOffset ]]);
    return scriptOffset;
};


export const findDocumentPosition = (document: TextDocument, taskItem: TaskItem): number =>
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
        const provider = providers[def.type] || providersExternal[def.type];
        scriptOffset = provider?.getDocumentPosition(taskItem.task.name, documentText) || -1;
    }

    if (scriptOffset === -1) {
        scriptOffset = 0;
    }

    log.methodDone("find task definition document position", 1, "", [[ "offset", scriptOffset ]]);
    return scriptOffset;
};
