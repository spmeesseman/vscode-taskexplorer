import { IDictionary } from "./IDictionary";

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

export interface ITeFigures extends IDictionary<any>
{
    color: IDictionary<any>;
    // color: IDictionary<(msg: string, color: LogColor) => string>;
    colors: ILogColors;
    withColor(msg: string, color: LogColor): string;
}
