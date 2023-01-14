import { IDictionary } from "./IDictionary";


export interface ITestControl
{   //
    // KEEP SETTINGS FILE CHANGES (@ test-files/.vscode/workspace.json)
    //
    keepSettingsFileChanges: boolean;
    //
    // Global settings that will get set/unset
    //
    vsCodeAutoDetectGrunt: "on" | "off";
    vsCodeAutoDetectGulp: "on" | "off";
    //
    // LOGGING DEFAULTS
    //
    log: {
        level: 0 | 1 | 2 | 3 | 4 | number;
        enabled: boolean;
        errors: boolean;
        console: boolean;
        consoleLevel: 0 | 1 | 2 | 3 | 4 | number;
        file: boolean;
        fileSymbols: boolean;
        output: boolean;
        openFileOnFinish: boolean; // not yet
        blockScaryColors: boolean;
    };
    //
    // Rolling success count and failure flag
    //
    tests: {
        clearBestTime: boolean;
        clearAllBestTimes: boolean;
        numSuites: number;
        numSuitesFail: number;
        numSuitesSuccess: number;
        numTests: number;
        numTestsFail: number;
        numTestsSuccess: number;
        suiteResults: IDictionary<any>;
    };
    //
    // These 2 properties are for using update() for coverage; see helper.initSettings
    //
    user: {
        logLevel: number;
        pathToAnt: string;
        pathToAnsicon: string;
    };
    //
    // SLOW TIMES (TESTS MARKED RED WHEN EXCEEDED)s
    //
    slowTime: {
        addWorkspaceFolder: number;
        bashScript: number;
        batchScript: number;
        buildFileCache: number;
        buildFileCacheCancel: number;
        buildTreeNoTasks: number;
        command: number;
        commandFast: number;
        configEvent: number;
        configEventFast: number;
        configRegisterExplorerEvent: number;
        configDisableEvent: number;
        configEnableEvent: number;
        configExcludesEvent: number;
        configGlobEvent: number;
        configGroupingEvent: number;
        configSpecialFolderEvent: number;
        configReadEvent: number;
        explorerViewStartup: number;
        fetchTasksCommand: number;
        findDocumentPositionCommand: number;
        focusCommand: number;
        fsCreateEvent: number;
        fsCreateFolderEvent: number;
        fsDeleteEvent: number;
        fsDeleteFolderEvent: number;
        fsModifyEvent: number;
        getTreeTasks: number;
        getTreeTasksNpm: number; // npm task provider is slower than shit on a turtle
        licenseMgrOpenPage: number;
        licenseMgrOpenPageWithDetail: number;
        licenseManagerLocalCheck: number;
        licenseManagerLocalStartServer: number;
        licenseManagerRemoteCheck: number;
        licenseManagerRemoteStartServer: number;
        npmCommand: number;
        npmCommandPkg: number;
        npmInstallCommand: number;
        refreshCommand: number;
        rebuildFileCache: number;
        rebuildFileCacheCancel: number;
        removeWorkspaceFolder: number;
        runCommand: number;
        runPauseCommand: number;
        runStopCommand: number;
        showHideSpecialFolder: number;
        storageRead: number;
        storageUpdate: number;
        taskProviderReadUri: number;
        verifyTaskCount: number;
        verifyTaskCountByTree: number;
        verifyTaskCountNpm: number; // npm task provider is slower than shit on a turtle
        verifyTaskCountWorkspace: number;
        viewReport: number;
        walkTaskTree: number;
        walkTaskTreeWithDocOpen: number;
        workspaceInvalidation: number;
    };
    //
    // WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME; OR waitTime.max)
    //
    waitTime:
    {   //
        // MINIMUM WAIT TIMES
        //
        addWorkspaceFolder: number;
        fsCreateEvent: number;
        fsCreateFolderEvent: number;
        fsDeleteEvent: number;
        fsDeleteFolderEvent: number;
        fsModifyEvent: number;
        configEvent: number;
        configEventFast: number;
        configDisableEvent: number;
        configEnableEvent: number;
        configGlobEvent: number;
        command: number;
        commandFast: number;
        configGroupingEvent: number;
        configRegisterExplorerEvent: number;
        explorerViewStartup: number;
        focusCommand: number;
        getTreeMin: number;
        getTreeMax: number;
        getTreeTasks: number;
        min: number;
        npmCommandMin: number;
        rebuildFileCache: number;
        rebuildFileCacheCancel: number;
        refreshCommand: number;
        refreshTaskTypeCommand: number;
        removeWorkspaceFolder: number;
        runCommandMin: number;
        verifyTaskCountRetry: number;
        verifyTaskCountRetryInterval: number;
        viewReport: number;
        //
        // MAXIMUM WAIT TIMES
        //
        max: number;
        runCommandMax: number;
        waitTimeForNpmCommandMax: number;
    };
};
