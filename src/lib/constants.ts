/* eslint-disable @typescript-eslint/naming-convention */

import { IDictionary } from "../interface";


export const Strings =
{
	DEFAULT_SEPARATOR: "-",
    LAST_TASKS_STORE: "lastTasks",
    LAST_TASKS_LABEL: "Last Tasks",
    FAV_TASKS_STORE: "favoriteTasks",
    FAV_TASKS_LABEL: "Favorites",
    USER_TASKS_LABEL: "User Tasks",
    TASKS_RENAME_STORE: "Renames",
};

export const Globs: IDictionary<string> =
{
    GLOB_ANT: "**/[Bb][Uu][Ii][Ll][Dd].[Xx][Mm][Ll]",
    GLOB_APPPUBLISHER: "**/.publishrc*",
    GLOB_MAVEN: "**/pom.xml",
    GLOB_BASH: "**/*.[Ss][Hh]",
    GLOB_BATCH: "**/*.{[Bb][Aa][Tt],[Cc][Mm][Dd]}",
    GLOB_EXTERNAL: "**/tasks.test",
    GLOB_GULP: "**/[Gg][Uu][Ll][Pp][Ff][Ii][Ll][Ee].{[Jj][Ss],[Tt][Ss],[Mm][Jj][Ss],[Bb][Aa][Bb][Ee][Ll].[Jj][Ss]}",
    GLOB_GRADLE: "**/*.[Gg][Rr][Aa][Dd][Ll][Ee]",
    GLOB_GRUNT: "**/[Gg][Rr][Uu][Nn][Tt][Ff][Ii][Ll][Ee].[Jj][Ss]",
    GLOB_JENKINS: "**/[Jj]enkinsfile",
    GLOB_MAKE: "**/[Mm]akefile",
    GLOB_NPM: "**/package.json",
    GLOB_NSIS: "**/*.[Nn][Ss][Ii]",
    GLOB_PERL: "**/*.[Pp][Ll]",
    GLOB_COMPOSER: "**/composer.json",
    GLOB_POWERSHELL: "**/*.[Pp][Ss]1",
    GLOB_PYTHON: "**/*.[Pp][Yy]",
    GLOB_PIPENV: "**/[Pp][Ii][Pp][Ff][Ii][Ll][Ee]",
    GLOB_RUBY: "**/*.rb",
    GLOB_TSC: "**/tsconfig.{json,*.json}",
    GLOB_WEBPACK: "**/[Ww][Ee][Bb][Pp][Aa][Cc][Kk].{js,*.js,json,*.json}",
    GLOB_WORKSPACE: "**/.vscode/tasks.json"
};

export const enum GlyphChars
{
	AngleBracketLeftHeavy = "\u2770",
	AngleBracketRightHeavy = "\u2771",
	ArrowBack = "\u21a9",
	ArrowDown = "\u2193",
	ArrowDownUp = "\u21F5",
	ArrowDropRight = "\u2937",
	ArrowHeadRight = "\u27A4",
	ArrowLeft = "\u2190",
	ArrowLeftDouble = "\u21d0",
	ArrowLeftRight = "\u2194",
	ArrowLeftRightDouble = "\u21d4",
	ArrowLeftRightDoubleStrike = "\u21ce",
	ArrowLeftRightLong = "\u27f7",
	ArrowRight = "\u2192",
	ArrowRightDouble = "\u21d2",
	ArrowRightHollow = "\u21e8",
	ArrowUp = "\u2191",
	ArrowUpDown = "\u21C5",
	ArrowUpRight = "\u2197",
	ArrowsHalfLeftRight = "\u21cb",
	ArrowsHalfRightLeft = "\u21cc",
	ArrowsLeftRight = "\u21c6",
	ArrowsRightLeft = "\u21c4",
	Asterisk = "\u2217",
	Check = "✔",
	Dash = "\u2014",
	Dot = "\u2022",
	Ellipsis = "\u2026",
	EnDash = "\u2013",
	Envelope = "\u2709",
	EqualsTriple = "\u2261",
	Flag = "\u2691",
	FlagHollow = "\u2690",
	MiddleEllipsis = "\u22EF",
	MuchLessThan = "\u226A",
	MuchGreaterThan = "\u226B",
	Pencil = "\u270E",
	Space = "\u00a0",
	SpaceThin = "\u2009",
	SpaceThinnest = "\u200A",
	SquareWithBottomShadow = "\u274F",
	SquareWithTopShadow = "\u2750",
	Warning = "\u26a0",
	ZeroWidthSpace = "\u200b",
}
