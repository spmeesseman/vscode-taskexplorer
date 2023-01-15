
import figures from "../figures";
import { dirname, join } from "path";
import blank from "./blank";
import error from "./error";
import warn from "./warn";
import write from "./write";
import { value, values } from "./value";
import { createDir } from "../utils/fs";
import { configuration } from "../utils/configuration";
import { OutputChannel, ExtensionContext, commands, window, workspace, ConfigurationChangeEvent } from "vscode";
import { IDictionary, ILogQueueItem } from "../../interface";
import { methodDone, methodStart } from "./method";

interface ILogControl
{
    enable: boolean;
    enableFile: boolean;
    enableFileSymbols: boolean;
    enableOutputWindow: boolean;
    fileName: string;
    isTests: boolean;
    isTestsBlockScaryColors: boolean;
    lastErrorMesage: string[];
    lastWriteWasBlank: boolean;
    lastWriteWasBlankError: boolean;
    lastWriteToConsoleWasBlank: boolean;
    logLevel: number;
    logOutputChannel: OutputChannel | undefined;
    logValueWhiteSpace: number;
    msgQueue: IDictionary<ILogQueueItem[]>;
    tzOffset: number;
    useTags: boolean;
    useTagsMaxLength: number;
    writeToConsole: boolean;
    writeToConsoleLevel: number;
};

export const logControl: ILogControl =
{
    enable: false,
    enableFile: false,
    enableFileSymbols: false,
    enableOutputWindow: false,
    fileName: "",
    isTests: false,
    isTestsBlockScaryColors: false,
    lastErrorMesage: [],
    lastWriteWasBlank: false,
    lastWriteWasBlankError: false,
    lastWriteToConsoleWasBlank: false,
    logLevel: 1,
    logOutputChannel: undefined,
    logValueWhiteSpace: 45,
    msgQueue: {},
    useTags: true,
    useTagsMaxLength: 8,
    tzOffset: (new Date()).getTimezoneOffset() * 60000,
    writeToConsole: false,
    writeToConsoleLevel: 2
};


const colors = figures.colors;


const dequeue = (queueId: string) =>
{
    if (logControl.msgQueue[queueId])
    {
        logControl.msgQueue[queueId].forEach((l) =>
        {
            l.fn.call(l.scope, ...l.args);
        });
        delete logControl.msgQueue[queueId];
    }
};


/**
 * @param enable If `false`, set all log function to empty functions.  If `true`, apply all log functions
 */
const enableLog = (enable: boolean) =>
{
    Object.assign(logFunctions,
    {
        blank: enable ? blank : () => {},
        dequeue: enable ? dequeue : () => {},
        error: enable ? error : () => {},
        methodStart: enable ? methodStart : () => {},
        methodDone: enable ? methodDone : () => {},
        value: enable ? value : () => {},
        values: enable ? values : () => {},
        warn: enable ? warn : () => {},
        withColor: enable ? withColor : () => {},
        write: enable ? write : () => {}
    });
};


const initLog = async(context: ExtensionContext, testsRunning: number) =>
{
    const showLogOutput = (show: boolean) =>
    {
        if (logControl.logOutputChannel && show) {
            logControl.logOutputChannel.show();
        }
    };

    logControl.isTests = testsRunning > 0;
    logControl.isTestsBlockScaryColors = testsRunning > 1;
    logControl.enable = configuration.get<boolean>("logging.enable", false);
    logControl.logLevel = configuration.get<number>("logging.level", 1);
    logControl.enableOutputWindow = configuration.get<boolean>("logging.enableOutputWindow", true);
    logControl.enableFile = configuration.get<boolean>("logging.enableFile", false);
    logControl.enableFileSymbols = configuration.get<boolean>("logging.enableFileSymbols", true);
    logControl.fileName = join(context.logUri.fsPath, getFileName());
    await createDir(dirname(logControl.fileName));

    //
    // Set up a log in the Output window (even if enableOutputWindow is off)
    //
    logControl.logOutputChannel = window.createOutputChannel("Task Explorer");
    context.subscriptions.push(logControl.logOutputChannel);
    context.subscriptions.push(
        commands.registerCommand("taskExplorer.showOutput", showLogOutput)
    );
    const d = workspace.onDidChangeConfiguration(async e => {
        await processConfigChanges(context, e);
    });
    context.subscriptions.push(d);
    // showLogOutput(showLog || false);

    //
    // If logging isn't enabled,then set all log function to empty functions
    //
    /* istanbul ignore else */
    if (!logControl.enable){
        enableLog(logControl.enable);
    }
    //
    // This function should only be called once, so blank it in the export
    //
    Object.assign(logFunctions,
    {
        initLog: /* istanbul ignore next */() => {},
    });

    write("Log has been initialized", 1);
    logLogFileLocation();
};


const getFileName = () =>
{
    const locISOTime = (new Date(Date.now() - logControl.tzOffset)).toISOString().slice(0, -1).split("T")[0].replace(/[\-]/g, "");
    return `taskexplorer-${locISOTime}.log`;
};


const getLogFileName = () => logControl.fileName;


const isLoggingEnabled = () => logControl.enable;


const logLogFileLocation = () =>
{
    if (logControl.enable && logControl.enableFile)
    {
        /* istanbul ignore else */
        if (logControl.logOutputChannel)
        {
            logControl.logOutputChannel.appendLine("***********************************************************************************************");
            logControl.logOutputChannel.appendLine(" Log File: " + logControl.fileName);
            logControl.logOutputChannel.appendLine("***********************************************************************************************");
        }
        /* istanbul ignore else */
        if (logControl.isTests)
        {
            console.log(`    ${figures.color.info} ${withColor("*************************************************************************************", colors.grey)}`);
            console.log(`    ${figures.color.info} ${withColor(" Log File: " + logControl.fileName, colors.grey)}`);
            console.log(`    ${figures.color.info} ${withColor("*************************************************************************************", colors.grey)}`);
        }
    }
};


const processConfigChanges = (ctx: ExtensionContext, e: ConfigurationChangeEvent) =>
{
    if (e.affectsConfiguration("taskExplorer.logging.enable"))
    {
        logControl.enable = configuration.get<boolean>("logging.enable", false);
        enableLog(logControl.enable);
    }
    if (e.affectsConfiguration("taskExplorer.logging.enableOutputWindow"))
    {
        logControl.enableOutputWindow = configuration.get<boolean>("logging.enableOutputWindow", true);
    }
    if (e.affectsConfiguration("taskExplorer.logging.enableFile"))
    {
        logControl.enableFile = configuration.get<boolean>("logging.enableFile", false);
        logLogFileLocation();
        if (logControl.enableFile) {
            window.showInformationMessage("Log file location: " + logControl.fileName);
        }
    }
    if (e.affectsConfiguration("taskExplorer.logging.enableFileSymbols"))
    {
        logControl.enableFileSymbols = configuration.get<boolean>("logging.enableFileSymbols", true);
    }
    if (e.affectsConfiguration("taskExplorer.logging.level"))
    {
        logControl.logLevel = configuration.get<number>("logging.level", 1);
    }
};


const setWriteToConsole = (set: boolean, level = 2) =>
{
    logControl.writeToConsole = set;
    logControl.writeToConsoleLevel = level;
};


const withColor = figures.withColor;


const logFunctions =
{
    blank,
    colors,
    dequeue,
    enableLog,
    error,
    initLog,
    getLogFileName,
    isLoggingEnabled,
    methodStart,
    methodDone,
    setWriteToConsole,
    value,
    values,
    warn,
    withColor,
    write
};

export default logFunctions;
