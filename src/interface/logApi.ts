
export type LogColor = [ number, number ];
export type LogStyle = [ number, number ];

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

export class LogColors implements ILogColors
{
    bold: LogStyle = [ 1, 22 ];
    italic: LogStyle = [ 3, 23 ];
    underline: LogStyle = [ 4, 24 ];
    inverse: LogStyle = [ 7, 27 ];
    white: LogColor = [ 37, 39 ];
    grey: LogColor = [ 90, 39 ];
    black: LogColor = [ 30, 39 ];
    blue: LogColor = [ 34, 39 ];
    cyan: LogColor = [ 36, 39 ];
    green: LogColor = [ 32, 39 ];
    magenta: LogColor = [ 35, 39 ];
    red: LogColor = [ 31, 39 ];
    yellow: LogColor = [ 33, 39 ];
};

export const colors = new LogColors();

export const withColor = (msg: string, color: LogColor) =>
{
    return "\x1B[" + color[0] + "m" + msg + "\x1B[" + color[1] + "m";
};

export interface ILogApi
{
    blank(level?: number, queueId?: string): void;
    dequeue(queueId: string): void;
    error(msg: any, params?: (string|any)[][], queueId?: string): void;
    isLoggingEnabled(): boolean;
    getLogFileName(): string;
    methodStart(msg: string, level?: number, logPad?: string, doLogBlank?: boolean, params?: (string|any)[][], queueId?: string): void;
    methodDone(msg: string, level?: number, logPad?: string, params?: (string|any)[][], queueId?: string): void;
    setWriteToConsole(set: boolean, level?: number): void;
    value(msg: string, value: any, level?: number, logPad?: string, queueId?: string): void;
    values(level: number, logPad: string, params: any | (string|any)[][], queueId?: string): void;
    write(msg: string, level?: number, logPad?: string, queueId?: string): void;
    withColor(msg: string, color: LogColor): void;
}
