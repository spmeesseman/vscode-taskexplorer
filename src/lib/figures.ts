import { ILogColors, LogColor, LogStyle } from "../interface";


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

export const figures = {
    colors,
    withColor,

    // figures: {

    success: "✔",
    info: "ℹ",
	warning: "⚠",
	error: "✘",
	pointer: "❯",
	start: "▶",
	end: "◀",
	nodejs: "⬢",
	star: "★",
	checkboxOn: "☒",
	checkboxOff: "☐",
	pointerSmall: "›",
	bullet: "●",
    up: "△",

    color:
    {
        success: withColor("✔", colors.green),
        successBlue: withColor("✔", colors.blue),
        info: withColor("ℹ", colors.magenta),
        infoTask: withColor("ℹ", colors.blue),
        warning: withColor("⚠", colors.yellow),
        warningTests: withColor("⚠", colors.blue),
        error: withColor("✘", colors.red),
        errorTests: withColor("✘", colors.blue),
        start: withColor("▶", colors.green),
        end: withColor("◀", colors.green),
        pointer: withColor("❯", colors.grey),
        up: withColor("△", colors.green),
    },

    // }

    // mocha:
    // {
    //     success: "✅",
    //     warning: "⚠️",
    //     error: "❌️"
    // },

    // emoji:
    // {
    //     cross: "✖️",
    //     love: "😍",
    //     happy: "😀",
    //     heart: "💓",
    //     success: "✔️",
    //     red: "🟠",
    //     yellow: "🟡",
    //     green: "🟢",
    //     purple: "🟣"
    // },

    old:
    {
        tick: "√",
        info: "i",
        warning: "‼",
        cross: "×",
        pointer: ">",
        star: "✶",
        play: "►",
        nodejs: "♦",
        checkboxOn: "[×]",
        checkboxOff: "[ ]",
        up: "∆"
    }

};
