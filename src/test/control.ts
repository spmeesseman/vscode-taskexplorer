
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
    userPathToAnsicon: "c:\\Code\\ansicon\\x64\\ansicon.exe",
    //
    // SLOW TIMES (TESTS MARKED RED WHEN EXCEEDED)s
    //
    slowTime: {
        addWorkspaceFolder: 12000,
        bashScript: 4000,
        batchScript: 8000,
        buildFileCache: 1500,
        buildFileCacheCancel: 1350,
        buildTree: 20000,
        buildTreeNoTasks: 600,
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
        fsCreateEvent: 1450,
        fsCreateFolderEvent: 1900,
        fsDeleteEvent: 1150,
        fsDeleteFolderEvent: 1550,
        fsModifyEvent: 750,
        getTreeTasks: 200,
        licenseMgrOpenPage: 1000,
        licenseManagerLocalCheck: 2000,
        licenseManagerLocalStartServer: 8500,
        licenseManagerRemoteCheck: 3000,
        licenseManagerRemoteStartServer: 10000,
        npmCommand: 12500,
        refreshCommand: 10250,
        rebuildFileCache: 15500,
        rebuildFileCacheCancel: 1750,
        removeWorkspaceFolder: 10000,
        runCommand: 5000,
        runCommandNoWait: 3750,
        runPauseCommand: 2000,
        runPauseCommandNoWait: 1750,
        runStopCommand: 2000,
        runStopCommandNoWait: 2200,
        showHideSpecialFolder: 350,
        storageRead: 50,
        storageUpdate: 50,
        taskProviderReadUri: 100,
        verifyTaskCount: 875,
        viewReport: 1950,
        walkTaskTree: 5500,
        walkTaskTreeWithDocOpen: 25000,
        workspaceInvalidation: 15000
    },
    //
    // WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME, OR waitTime.max)
    //
    waitTime:
    {   //
        // MINIMUM WAIT TIMES
        //
        addWorkspaceFolder: 250,
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
        getTreeTasks: 75,
        npmCommandMin: 3000,
        rebuildFileCacheCancel: 50,
        refreshCommand: 500,
        refreshTaskTypeCommand: 1000,
        removeWorkspaceFolder: 250,
        runCommandMin: 1000,
        //
        // MAXIMUM WAIT TIMES
        //
        max: 15000,
        runCommandMax: 3500,
        waitTimeForNpmCommandMax: 12000
    }
};
