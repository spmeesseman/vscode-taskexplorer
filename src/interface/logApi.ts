
export const enum LogColor
{
    black = "\\u001b[30m",
    red = "\\u001b[31",
    green = "\\u001b[32m",
    yellow = "\\u001b[33m",
    blue = "\\u001b[34m", // "<span style=\"color:blue\">"  "</style>"
    magenta = "\\u001b[35",
    cyan = "\\u001b[36m",
    white = "\\u001b[37m"
}

export interface ILogApi
{
    blank(level?: number, queueId?: string): void;
    dequeue(queueId: string): void;
    error(msg: any, params?: (string|any)[][], queueId?: string): void;
    isLoggingEnabled(): boolean;
    getLogFileName(): string;
    methodStart(msg: string, level?: number, logPad?: string, doLogBlank?: boolean, params?: (string|any)[][], queueId?: string): void;
    methodDone(msg: string, level?: number, logPad?: string, doLogBlank?: boolean, params?: (string|any)[][], queueId?: string): void;
    setWriteToConsole(set: boolean, level?: number): void;
    value(msg: string, value: any, level?: number, logPad?: string, queueId?: string): void;
    values(level: number, logPad: string, params: any | (string|any)[][], doLogBlank?: boolean, queueId?: string): void;
    write(msg: string, level?: number, logPad?: string, queueId?: string): void;
}
