
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
        bashScript: 4000,
        batchScript: 8000,
        buildFileCache: 1500,
        command: 1450,
        commandFast: 550,
        configEvent: 300,
        configRegisterExplorerEvent: 500,
        configEnableEvent: 975,
        configExcludesEvent: 475,
        configGroupingEvent: 700,
        fetchTasksCommand: 3000,
        focusCommand: 4500,
        fsCreateEvent: 1250,
        fsCreateFolderEvent: 1800,
        fsDeleteEvent: 950,
        fsDeleteFolderEvent: 1550,
        fsModifyEvent: 650,
        getTreeTasks: 150,
        localLicenseCheck: 2000,
        npmCommand: 12500,
        refreshCommand: 10250,
        rebuildFileCache: 4500,
        remoteLicenseCheck: 3750,
        runCommand: 5000,
        runPauseCommand: 2000,
        runStopCommand: 2000,
        showHideSpecialFolder: 350,
        storageUpdate: 50,
        taskProviderReadUri: 100,
        verifyTaskCount: 875,
        workspaceInvalidation: 15000
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
