/* eslint-disable @typescript-eslint/naming-convention */

import { IDictionary } from "./interface";


const constants: IDictionary<string> =
{
    DEFAULT_SEPARATOR: "-",
    LAST_TASKS_STORE: "lastTasks",
    LAST_TASKS_LABEL: "Last Tasks",
    FAV_TASKS_STORE: "favoriteTasks",
    FAV_TASKS_LABEL: "Favorites",
    USER_TASKS_LABEL: "User Tasks",
    TASKS_RENAME_STORE: "Renames",
    GLOB_ANT: "**/[Bb][Uu][Ii][Ll][Dd].[Xx][Mm][Ll]",
    GLOB_APPPUBLISHER: "**/.publishrc*",
    GLOB_MAVEN: "**/pom.xml",
    GLOB_BASH: "**/*.[Ss][Hh]",
    GLOB_BATCH: "**/*.{[Bb][Aa][Tt],[Cc][Mm][Dd]}",
    GLOB_GULP: "**/[Gg][Uu][Ll][Pp][Ff][Ii][Ll][Ee].{[Jj][Ss],[Tt][Ss],[Mm][Jj][Ss],[Bb][Aa][Bb][Ee][Ll].[Jj][Ss]}",
    GLOB_GRADLE: "**/*.[Gg][Rr][Aa][Dd][Ll][Ee]",
    GLOB_GRUNT: "**/[Gg][Rr][Uu][Nn][Tt][Ff][Ii][Ll][Ee].[Jj][Ss]",
    GLOB_MAKE: "**/[Mm]akefile",
    GLOB_NPM: "**/package.json",
    GLOB_NSIS: "**/*.[Nn][Ss][Ii]",
    GLOB_PERL: "**/*.[Pp][Ll]",
    GLOB_COMPOSER: "**/composer.json",
    GLOB_POWERSHELL: "**/*.[Pp][Ss]1",
    GLOB_PYTHON: "**/*.[Pp][Yy]",
    GLOB_PIPENV: "**/[Pp][Ii][Pp][Ff][Ii][Ll][Ee]",
    GLOB_RUBY: "**/*.rb",
    GLOB_TSC: "**/tsconfig.json",
    GLOB_WORKSPACE: "**/.vscode/tasks.json"
};

export default constants;
