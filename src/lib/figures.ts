import { colors, withColor } from "../interface/ILog";

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
