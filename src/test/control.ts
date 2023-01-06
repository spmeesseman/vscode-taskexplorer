
export const testControl =
{   //
    // KEEP SETTINGS FILE CHANGES (@ test-files/.vscode/workspace.json)
    //
    keepSettingsFileChanges: false,
    //
    // LOGGING DEFAULTS
    //
    logLevel: 1,
    logEnabled: true,
    logToConsole: false,
    logToFile: true,
    logToOutput: false,
    logOpenFileOnFinish: true,
    //
    // These 2 properties are for using update() for coverage, see helper.initSettings
    //
    userLogLevel: 1,
    userPathToAnt: "ant.bat",
    //
    // SLOW TIMES (TESTS MARKED RED WHEN EXCEEDED)s
    //
    slowTime: {
        command: 1450,
        commandFast: 550,
        configEvent: 300,
        configEnableEvent: 875,
        configExcludesEvent: 475,
        configGroupingEvent: 700,
        focusCommand: 4500,
        fsCreateEvent: 1250,
        fsCreateFolderEvent: 1800,
        fsDeleteEvent: 950,
        fsDeleteFolderEvent: 1550,
        fsModifyEvent: 650,
        getTreeTasks: 150,
        npmCommand: 10000,
        bashScript: 4000,
        batchScript: 8000,
        refreshCommand: 10250,
        runCommand: 5000,
        storageUpdate: 50,
        fetchTasksCommand: 3000,
        localLicenseCheck: 2000,
        remoteLicenseCheck: 3750,
        verifyTaskCount: 875
    },
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
