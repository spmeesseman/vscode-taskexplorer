
import { warn } from "./warn";
import { write } from "./write";
import { blank } from "./blank";
import { error } from "./error";
import { figures } from "../figures";
import { dirname, join } from "path";
import { value, values } from "./value";
import { createDir } from "../utils/fs";
import { methodDone, methodStart } from "./method";
import { configuration } from "../utils/configuration";
import { IDictionary, ILogQueueItem } from "../../interface";
import { OutputChannel, ExtensionContext, commands, window, workspace, ConfigurationChangeEvent } from "vscode";

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
    lastLogPad: string;
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
    lastLogPad: "",
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
        const channel: OutputChannel = logControl.logOutputChannel as OutputChannel;
        channel.appendLine("***********************************************************************************************");
        channel.appendLine(" Log File: " + logControl.fileName);
        channel.appendLine("***********************************************************************************************");
        /* istanbul ignore else */
        if (logControl.isTests)
        {
            console.log(`    ${figures.color.info} ${figures.withColor("*************************************************************************************", colors.grey)}`);
            console.log(`    ${figures.color.info} ${figures.withColor(" Log File: " + logControl.fileName, colors.grey)}`);
            console.log(`    ${figures.color.info} ${figures.withColor("*************************************************************************************", colors.grey)}`);
        }
    }
};


const getLogPad = () => logControl.lastLogPad;


const processConfigChanges = (ctx: ExtensionContext, e: ConfigurationChangeEvent) =>
{
    if (e.affectsConfiguration("taskexplorer.logging.enable"))
    {
        logControl.enable = configuration.get<boolean>("logging.enable", false);
        enableLog(logControl.enable);
    }
    if (e.affectsConfiguration("taskexplorer.logging.enableOutputWindow"))
    {
        logControl.enableOutputWindow = configuration.get<boolean>("logging.enableOutputWindow", true);
    }
    if (e.affectsConfiguration("taskexplorer.logging.enableFile"))
    {
        logControl.enableFile = configuration.get<boolean>("logging.enableFile", false);
        logLogFileLocation();
        if (logControl.enableFile) {
            window.showInformationMessage("Log file location: " + logControl.fileName);
        }
    }
    if (e.affectsConfiguration("taskexplorer.logging.enableFileSymbols"))
    {
        logControl.enableFileSymbols = configuration.get<boolean>("logging.enableFileSymbols", true);
    }
    if (e.affectsConfiguration("taskexplorer.logging.level"))
    {
        logControl.logLevel = configuration.get<number>("logging.level", 1);
    }
};


const registerLog = async(context: ExtensionContext, testsRunning: number) =>
{
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

    //
    // Register disposables
    //
    context.subscriptions.push(...[
        logControl.logOutputChannel,
        commands.registerCommand("taskexplorer.showOutput", (show: boolean) => showLogOutput(show)),
        workspace.onDidChangeConfiguration(e => processConfigChanges(context, e))
    ]);

    //
    // If logging isn't enabled, then set all log function to empty functions. This
    // function should only be called once, so don't let istanbul pop it
    //
    /* istanbul ignore next */
    if (!logControl.enable) {
        /* istanbul ignore next */
        enableLog(logControl.enable);
    }

    //
    // This function should only be called once, so blank it in the export
    //
    Object.assign(logFunctions,
    {
        registerLog: /* istanbul ignore next */() => {},
    });

    write("Log has been initialized", 1);
    logLogFileLocation();
};


const setWriteToConsole = (set: boolean, level = 2) =>
{
    logControl.writeToConsole = set;
    logControl.writeToConsoleLevel = level;
};


const showLogOutput = async(show: boolean) =>
{
    const channel: OutputChannel = logControl.logOutputChannel as OutputChannel;
    if (show) {
        await commands.executeCommand("workbench.panel.output.focus");
        channel.show();
    }
    else {
        channel.hide();
    }
};


const withColor = figures.withColor;


const logFunctions =
{
    blank,
    colors,
    dequeue,
    enableLog,
    error,
    registerLog,
    getLogFileName,
    getLogPad,
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

export const log = logFunctions;
