
export interface ILogApi
{
    blank(level?: number, queueId?: string): void;
    dequeue(queueId: string): void;
    error(msg: any, params?: (string|any)[][], queueId?: string): void;
    isLoggingEnabled(): boolean;
    methodStart(msg: string, level?: number, logPad?: string, doLogBlank?: boolean, params?: (string|any)[][], queueId?: string): void;
    methodDone(msg: string, level?: number, logPad?: string, doLogBlank?: boolean, params?: (string|any)[][], queueId?: string): void;
    setWriteToConsole(set: boolean, level?: number): void;
    value(msg: string, value: any, level?: number, logPad?: string, queueId?: string): void;
    values(level: number, logPad: string, params: any | (string|any)[][], doLogBlank?: boolean, queueId?: string): void;
    write(msg: string, level?: number, logPad?: string, queueId?: string): void;
}
