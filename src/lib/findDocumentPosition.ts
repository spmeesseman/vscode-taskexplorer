
import log from "./log/log";
import { TextDocument } from "vscode";
import TaskItem from "../tree/item";
import { providers, providersExternal } from "../extension";
import { isWatchTask } from "./utils/utils";
import { IDictionary } from "../interface";


const jsonMap: IDictionary<{object: string; preKey: string; postKey: string}> = {
    npm: {
        object: "\"scripts\"",
        preKey: "(?<=\\s)+\"",
        postKey: "\" *\\:"
    },
    workspace: {
        object: "\"tasks\"",
        preKey: "\"(?:script|label)\" *\\: *\"",
        postKey: "\"(?:\\s|,|$)*"
    }
};


const findJsonDocumentPosition = (documentText: string, taskItem: TaskItem): number =>
{
    log.methodStart("find json document position", 3, "   ", false, [[ "task name", taskItem.task.name ]]);

    const props = jsonMap[taskItem.taskSource.toLowerCase()],
          blockOffset = documentText.indexOf(props.object),
          regex = new RegExp("(" + props.preKey + taskItem.task.name + props.postKey + ")", "gm");

    let scriptOffset = blockOffset,
        match: RegExpExecArray | null;

    if ((match = regex.exec(documentText.substring(blockOffset))) !== null)
    {
        scriptOffset = match.index + match[0].indexOf(taskItem.task.name) + blockOffset;
    }

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
    if (taskItem.taskSource === "npm" || taskItem.taskSource === "Workspace") // JSON
    {
        log.write("   find json position", 2);
        scriptOffset = findJsonDocumentPosition(documentText, taskItem);
    }
    else if (!isWatchTask(taskItem.taskSource))
    {
        const provider = providers[def.type] || /* istanbul ignore next */providersExternal[def.type];
        scriptOffset = provider?.getDocumentPosition(taskItem.task.name, documentText) || -1;
    }

    if (scriptOffset === -1) {
        scriptOffset = 0;
    }

    log.methodDone("find task definition document position", 1, "", [[ "offset", scriptOffset ]]);
    return scriptOffset;
};
