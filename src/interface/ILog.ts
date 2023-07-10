
export type LogLevel = number; // 1 | 2 | 3 | 4 | 5;
export type LogType = "global";

export interface ILogQueueItem
{
    fn: any;
    args: any[];
    scope: any;
}

/*
export interface ILogControl
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
    msgQueue: Record<string, ILogQueueItem[]>;
    tzOffset: number;
    useTags: boolean;
    useTagsMaxLength: number;
    writeToConsole: boolean;
    writeToConsoleLevel: number;
};
*/


export interface ILogControl
{
    dirPath: string;
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
    level: LogLevel;
    msgQueue: Record<string, ILogQueueItem[]>;
    outputChannel: any;
    outputChannelWriteFn: string;
    type: LogType;
    tzOffset: number;
    useTags: boolean;
    useTagsMaxLength: number;
    valueWhiteSpace: number;
    writeToConsole: boolean;
    writeToConsoleLevel: number;
};

export interface ILog
{
    readonly control: ILogControl;
    readonly lastPad: string;
    blank(level?: LogLevel, queueId?: string): void;
    dequeue(queueId: string): void;
    dispose(): void;
    error(msg: any, params?: (string|any)[][], queueId?: string, symbols?: [ string, string ]): void;
    info(msg: string, level?: LogLevel, logPad?: string, queueId?: string): void;
    methodStart(msg: string, level?: LogLevel, logPad?: string, doLogBlank?: boolean, params?: (string|any)[][], queueId?: string): void;
    methodDone(msg: string, level?: LogLevel, logPad?: string, params?: (string|any)[][], queueId?: string): void;
    methodEvent(msg: string, tag?: string,  level?: LogLevel, params?: (string|any)[][], queueId?: string): void;
    setWriteToConsole?(set: boolean, level?: LogLevel): void;
    value(msg: string, value: any, level?: LogLevel, logPad?: string, queueId?: string): void;
    values(level: LogLevel, logPad: string, params: any | (string|any)[][], queueId?: string): void;
    warn(msg: any, params?: (string|any)[][], queueId?: string): void;
    write(msg: string, level?: LogLevel, logPad?: string, queueId?: string, isValue?: boolean, isError?: boolean): void;
    withColor(msg: string, color: any): void;
}
