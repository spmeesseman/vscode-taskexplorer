
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
    // Global settings that will get set/unset
    //
    vsCodeAutoDetectGrunt: "off",
    vsCodeAutoDetectGulp: "off",
    //
    // SLOW TIMES (TESTS MARKED RED WHEN EXCEEDED)s
    //
    slowTime: {
        addWorkspaceFolder: 13750,
        bashScript: 4000,
        batchScript: 8000,
        buildFileCache: 1500,
        buildFileCacheCancel: 1350,
        buildTree: 20000,
        buildTreeNoTasks: 600,
        command: 1450,
        commandFast: 550,
        configEvent: 315,
        configEventFast: 120,
        configRegisterExplorerEvent: 750,
        configEnableEvent: 1575,
        configExcludesEvent: 475,
        configGlobEvent: 1940,
        configGroupingEvent: 700,
        configSpecialFolderEvent: 450,
        configReadEvent: 25,
        explorerViewStartup: 10100,
        fetchTasksCommand: 3000,
        findDocumentPositionCommand: 850,
        focusCommand: 3400,
        fsCreateEvent: 1650,
        fsCreateFolderEvent: 1950,
        fsDeleteEvent: 1350,
        fsDeleteFolderEvent: 1650,
        fsModifyEvent: 810,
        getTreeTasks: 215,
        getTreeTasksNpm: 750, // npm task provider is slower than shit on a turtle
        licenseMgrOpenPage: 1000,
        licenseManagerLocalCheck: 2000,
        licenseManagerLocalStartServer: 8500,
        licenseManagerRemoteCheck: 3000,
        licenseManagerRemoteStartServer: 10000,
        npmCommand: 11925,
        npmCommandPkg: 9300,
        npmInstallCommand: 14780,
        refreshCommand: 14150,
        rebuildFileCache: 15500,
        rebuildFileCacheCancel: 1750,
        removeWorkspaceFolder: 10000,
        runCommand: 5000,
        runPauseCommand: 2000,
        runStopCommand: 2000,
        showHideSpecialFolder: 440,
        storageRead: 50,
        storageUpdate: 50,
        taskProviderReadUri: 100,
        verifyTaskCount: 875,
        verifyTaskCountNpm: 3075, // npm task provider is slower than shit on a turtle
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
        configEventFast: 50,
        configEnableEvent: 195,
        configGlobEvent: 160,
        command: 150,
        commandFast: 60,
        configRegisterExplorerEvent: 275,
        explorerViewStartup: 5000,
        focusCommand: 500,
        getTreeMin: 350,
        getTreeMax: 1800,
        getTreeTasks: 75,
        min: 50,
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
