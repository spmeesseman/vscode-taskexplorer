
export const testControl =
{   //
    // KEEP SETTINGS FILE CHANGES (@ test-files/.vscode/workspace.json)
    //
    keepSettingsFileChanges: false,
    //
    // LOGGING DEFAULTS
    //
    logLevel: 2,
    logEnabled: false,
    logToConsole: false,
    logToConsoleLevel: 3,
    logToFile: true,
    logToFileSymbols: false,
    logToOutput: false,
    logOpenFileOnFinish: true, // not yet
    //
    // These 2 properties are for using update() for coverage, see helper.initSettings
    //
    userLogLevel: 1,
    userPathToAnt: "c:\\Code\\ant\\bin\\ant.bat",
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
        configEventFast: 90,
        configRegisterExplorerEvent: 500,
        configEnableEvent: 975,
        configExcludesEvent: 475,
        configGroupingEvent: 700,
        configReadEvent: 25,
        fetchTasksCommand: 3000,
        focusCommand: 4500,
        fsCreateEvent: 1250,
        fsCreateFolderEvent: 1800,
        fsDeleteEvent: 950,
        fsDeleteFolderEvent: 1550,
        fsModifyEvent: 650,
        getTreeTasks: 150,
        licenseMgrOpenPage: 1000,
        licenseManagerLocalCheck: 2000,
        licenseManagerLocalStartServer: 8500,
        licenseManagerRemoteCheck: 3000,
        licenseManagerRemoteStartServer: 10000,
        npmCommand: 12500,
        refreshCommand: 10250,
        rebuildFileCache: 4500,
        rebuildFileCacheCancel: 1750,
        runCommand: 5000,
        runPauseCommand: 2000,
        runStopCommand: 2000,
        showHideSpecialFolder: 350,
        storageRead: 50,
        storageUpdate: 50,
        taskProviderReadUri: 100,
        verifyTaskCount: 875,
        walkTaskTree: 5500,
        walkTaskTreeWithDocOpen: 30000,
        workspaceInvalidation: 15000
    },
    //
    // MINIMUM WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME)
    //
    waitTime:
    {
        buildTree: 5000,
        fsCreateEvent: 200,
        fsDeleteEvent: 200,
        fsModifyEvent: 150,
        configEvent: 125,
        configEnableEvent: 175,
        command: 150,
        commandFast: 50,
        getTreeMin: 350,
        getTreeMax: 1800,
        npmCommandMin: 3000,
        refreshCommand: 500,
        refreshTaskTypeCommand: 1000,
        runCommand: 3500,
        max: 15000,
        //
        // MAXIMUM WAIT TIMES
        //
        waitTimeForNpmCommandMax: 12000
    }
};
