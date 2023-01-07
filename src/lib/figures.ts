import { colors, withColor } from "../interface/logApi";

export default
{
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
        info: withColor("ℹ", colors.magenta),
        warning: withColor("⚠", colors.yellow),
        error: withColor("✘", colors.red),
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
