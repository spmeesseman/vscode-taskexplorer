
export interface ILogColor
{
    bold: [ 1, 22 ];
    italic: [ 3, 23 ];
    underline: [ 4, 24 ];
    inverse: [ 7, 27 ];
    white: [ 37, 39 ];
    grey: [ 90, 39 ];
    black: [ 30, 39 ];
    blue: [ 34, 39 ];
    cyan: [ 36, 39 ];
    green: [ 32, 39 ];
    magenta: [ 35, 39 ];
    red: [ 31, 39 ];
    yellow: [ 33, 39 ];
};

export type LogColor = number[];

export const colors = { // Don't use 'blue' not visible on cmd.exe
    bold: [ 1, 22 ],
    italic: [ 3, 23 ],
    underline: [ 4, 24 ],
    inverse: [ 7, 27 ],
    white: [ 37, 39 ],
    grey: [ 90, 39 ],
    black: [ 30, 39 ],
    blue: [ 34, 39 ],
    cyan: [ 36, 39 ],
    green: [ 32, 39 ],
    magenta: [ 35, 39 ],
    red: [ 31, 39 ],
    yellow: [ 33, 39 ]
};

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
    withColor(msg: string, color: LogColor): void;
}
