
import { configuration } from "../lib/utils/configuration";

export const testControl =
{   //
    // KEEP SETTINGS FILE CHANGES (@ test-files/.vscode/workspace.json)
    //
    keepSettingsFileChanges: false,
    //
    // LOGGING DEFAULTS
    //
    logLevel: 1,
    writeToConsole: false,
    writeToFile: false,
    writeToOutput: true,
    //
    // Use update() here for coverage, since these two settings wont trigger any processing
    //
    userLogLevel: configuration.get<number>("logging.level"),
    userPathToAnt: configuration.get<string>("pathToPrograms.ant"),
    //
    // SLOW TIMES (TESTS MARKED RED WHEN EXCEEDED)
    //
    slowTimeForCommand: 1450,
    slowTimeForCommandFast: 550,
    slowTimeForConfigEvent: 300,
    slowTimeForConfigEnableEvent: 875,
    slowTimeForConfigExcludesEvent: 475,
    slowTimeForConfigGroupingEvent: 700,
    slowTimeForFocusCommand: 4500,
    slowTimeForFsCreateEvent: 1250,
    slowTimeForFsCreateFolderEvent: 1800,
    slowTimeForFsDeleteEvent: 950,
    slowTimeForFsDeleteFolderEvent: 1550,
    slowTimeForNpmCommand: 10000,
    slowTimeForRefreshCommand: 10250,
    slowTimeForFetchTasksCommand: 3000,
    slowTimeForLocalLicenseCheck: 2000,
    slowTimeForRemoteLicenseCheck: 3750,
    slowTimeForVerifyTaskCount: 1250,
    //
    // MINIMUM WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME)
    //
    waitTimeForBuildTree: 5000,
    waitTimeForFsCreateEvent: 200,
    waitTimeForFsDeleteEvent: 200,
    waitTimeForFsModifyEvent: 150,
    waitTimeForConfigEvent: 125,
    waitTimeForConfigEnableEvent: 175,
    waitTimeForCommand: 150,
    waitTimeForCommandFast: 50,
    waitTimeForNpmCommandMin: 3000,
    waitTimeForRefreshCommand: 500,
    waitTimeForRefreshTaskTypeCommand: 1000,
    waitTimeForRunCommand: 3500,
    waitTimeMax: 15000,
    //
    // MAXIMUM WAIT TIMES
    //
    waitTimeForNpmCommandMax: 12000
};
