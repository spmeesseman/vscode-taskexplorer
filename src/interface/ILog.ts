import { OutputChannel } from "vscode";

export type LogLevel = number; // 1 | 2 | 3 | 4 | 5;
export type LogType = "global";
export type LogColor = [ number, number ];

export interface ILogQueueItem
{
    fn: any;
    args: any[];
    scope: any;
}

export interface ILogColors
{
    bold: LogColor;
    italic: LogColor;
    underline: LogColor;
    inverse: LogColor;
    white: LogColor;
    grey: LogColor;
    black: LogColor;
    blue: LogColor;
    cyan: LogColor;
    green: LogColor;
    magenta: LogColor;
    red: LogColor;
    yellow: LogColor;
};

export interface ILogSymbols
{
    bullet: "●"; bulletBig: "⬢"; checkboxOn: "☒"; checkboxOff: "☐"; end: "◀"; error: "✘"; info: "ℹ";
    pointer: "❯"; pointerSmall: "›"; start: "▶"; star: "★"; success: "✔"; up: "△"; warning: "⚠";
    blue: { error: "✘"; info: "ℹ"; success: "✔"; warning: "⚠" };
    color: { end: "◀"; error: "✘"; info: "ℹ"; pointer: "❯"; start: "▶"; success: "✔"; up: "△"; warning: "⚠" };
}

export interface ILogConfig
{
    channelWriteFn: string;
    dirPath: string;
    errorChannel: OutputChannel;
    extensionAuthor: string;
    extensionId: string;
    isTests: boolean;
    outputChannel: OutputChannel;
}

export interface ILogControl
{
    blockScaryColors: boolean;
    enable: boolean;
    enableFile: boolean;
    enableModuleReload: boolean;
    enableOutputWindow: boolean;
    level: LogLevel;
    trace: boolean;
    valueWhiteSpace: number;
    writeToConsole: boolean;
    writeToConsoleLevel: number;
};

export interface ILogState
{
    fileName: string;
    lastErrorMesage: string[];
    lastLogPad: string;
    lastWriteWasBlank: boolean;
    lastWriteWasBlankError: boolean;
    lastWriteToConsoleWasBlank: boolean;
    msgQueue: Record<string, ILogQueueItem[]>;
    tzOffset: number;
};

export interface ILog
{
    readonly colors: ILogColors;
    readonly control: ILogControl;
    readonly lastPad: string;
    readonly state: ILogState;
    readonly symbols: ILogSymbols;
    blank(level?: LogLevel, queueId?: string): void;
    dequeue(queueId: string): void;
    dispose(): void;
    error(msg: any, params?: (string|any)[][], queueId?: string, symbols?: [ string, string ]): void;
    info(msg: string, level?: LogLevel, logPad?: string, queueId?: string): void;
    // method(fileTag: string, methodTag: string, msg: string, level: LogLevel, logPad: string, params?: (string|any)[][], queueId?: string): void;
    methodStart(msg: string, level?: LogLevel, logPad?: string, doLogBlank?: boolean, params?: (string|any)[][], queueId?: string): void;
    methodDone(msg: string, level?: LogLevel, logPad?: string, params?: (string|any)[][], queueId?: string): void;
    methodEvent(msg: string, tag?: string,  level?: LogLevel, params?: (string|any)[][], queueId?: string): void;
    setWriteToConsole?(set: boolean, level?: LogLevel): void;
    value(msg: string, value: any, level?: LogLevel, logPad?: string, queueId?: string): void;
    values(level: LogLevel, logPad: string, params: any | (string|any)[][], queueId?: string): void;
    warn(msg: any, params?: (string|any)[][], queueId?: string): void;
    write(msg: string, level?: LogLevel, logPad?: string, queueId?: string, isValue?: boolean, isError?: boolean): void;
    write2(tag: string, msg: string, level?: LogLevel, logPad?: string, params?: (string|any)[][], queueId?: string, isValue?: boolean, isError?: boolean): void;
    withColor(msg: string, color: any): void;
}
