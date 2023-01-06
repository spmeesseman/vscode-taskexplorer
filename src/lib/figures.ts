import { colors, withColor } from "../interface/logApi";

export default
{
    colors,
    withColor,

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
    },

    color:
    {
        success: withColor("✔", colors.green),
        info: withColor("ℹ", colors.magenta),
        warning: withColor("⚠", colors.yellow),
        error: withColor("✘", colors.red),
        start: withColor("▶", colors.green),
        end: withColor("◀", colors.green),
        pointer: withColor("❯", colors.grey),
    }

};
