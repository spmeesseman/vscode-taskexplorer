
// eslint-disable-next-line import/no-extraneous-dependencies
import { IDictionary } from "@spmeesseman/vscode-taskexplorer-types";

export const testControl: ITestControl =
{   //
    // KEEP SETTINGS FILE CHANGES (@ test-files/.vscode/workspace.json)
    //
    keepSettingsFileChanges: false,
    //
    // Global settings that will get set/unset
    //
    vsCodeAutoDetectGrunt: "off",
    vsCodeAutoDetectGulp: "off",
    //
    // LOGGING DEFAULTS
    //
    log: {
        level: 2,
        enabled: false,
        errors: false,
        console: false,
        consoleLevel: 1,
        file: true,
        fileSymbols: false,
        output: false,
        openFileOnFinish: true, // not yet
        blockScaryColors: true
    },
    //
    // Rolling success count and failure flag
    //
    tests: {
        clearAllBestTimes: false,
        clearBestTime: false,
        clearBestTimesOnTestCountChange: true,
        numSuites: 0,
        numSuitesFail: 0,
        numSuitesSuccess: 0,
        numTests: 0,
        numTestsFail: 0,
        numTestsSuccess: 0,
        suiteResults: {} as IDictionary<any>
    },
    //
    // These 2 properties are for using update() for coverage, see helper.initSettings
    //
    user: {
        logLevel: 1,
        pathToAnt: "c:\\Code\\ant\\bin\\ant.bat",
        pathToAnsicon: "c:\\Code\\ansicon\\x64\\ansicon.exe"
    },
    //
    // SLOW TIMES (TESTS MARKED RED WHEN EXCEEDED)s
    //
    slowTime: {
        addWorkspaceFolder: 13750,
        bashScript: 4000,
        batchScript: 8000,
        buildFileCache: 1500,
        buildFileCacheCancel: 1350,
        buildTreeNoTasks: 600,
        closeActiveDocument: 25,
        command: 1450,
        commandFast: 550,
        configEvent: 315,
        configEventFast: 120,
        configRegisterExplorerEvent: 700,
        configDisableEvent: 1575,
        configEnableEvent: 2280,
        configExcludesEvent: 475,
        configGlobEvent: 1940,
        configGroupingEvent: 700,
        configSpecialFolderEvent: 450,
        configReadEvent: 25,
        explorerViewStartup: 17800,
        fetchTasksCommand: 3000,
        fileCachePersist: 470,
        findDocumentPositionCommand: 850,
        focusCommand: 3400,
        focusCommandAlreadyFocused: 125,
        fsCreateEvent: 1650,
        fsCreateFolderEvent: 1950,
        fsDeleteEvent: 1350,
        fsDeleteFolderEvent: 1650,
        fsModifyEvent: 810,
        getTreeTasks: 215,
        getTreeTasksNpm: 750, // npm task provider is slower than shit on a turtle
        licenseMgrOpenPage: 575,
        licenseMgrOpenPageWithDetail: 990,
        licenseManagerLocalCheck: 2000,
        licenseManagerLocalStartServer: 5010,
        licenseManagerRemoteCheck: 3000,
        licenseManagerRemoteStartServer: 10000,
        npmCommand: 11925,
        npmCommandPkg: 9300,
        npmInstallCommand: 19650,
        refreshCommand: 18850,
        rebuildFileCache: 15500,
        rebuildFileCacheCancel: 1810,
        removeWorkspaceFolder: 10000,
        runCommand: 8500,
        runPauseCommand: 2000,
        runStopCommand: 2000,
        showHideSpecialFolder: 440,
        storageRead: 50,
        storageUpdate: 50,
        taskProviderReadUri: 100,
        taskCommand: 1600,
        verifyTaskCount: 875,
        verifyTaskCountByTree: 850,
        verifyTaskCountNpm: 3075, // npm task provider is slower than shit on a turtle
        verifyTaskCountWorkspace: 3500,
        viewReport: 1950,
        walkTaskTree: 5500,
        walkTaskTreeWithDocOpen: 26000,
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
        configEvent: 125,
        configEventFast: 50,
        configDisableEvent: 160,
        configEnableEvent: 195,
        configGlobEvent: 160,
        command: 150,
        commandFast: 60,
        configGroupingEvent: 280,
        configRegisterExplorerEvent: 245,
        explorerViewStartup: 5000,
        focusCommand: 500,
        fsCreateEvent: 200,
        fsCreateFolderEvent: 250,
        fsDeleteEvent: 200,
        fsDeleteFolderEvent: 250,
        fsModifyEvent: 150,
        getTreeMin: 350,
        getTreeMax: 1800,
        getTreeTasks: 75,
        min: 50,
        npmCommandMin: 3000,
        rebuildFileCache: 15500,
        rebuildFileCacheCancel: 50,
        refreshCommand: 500,
        refreshTaskTypeCommand: 1000,
        removeWorkspaceFolder: 250,
        runCommandMin: 1000,
        taskCommand: 625,
        verifyTaskCountRetry: 150,
        verifyTaskCountRetryInterval: 400,
        viewReport: 120,
        //
        // MAXIMUM WAIT TIMES
        //
        max: 15000,
        runCommandMax: 3500,
        waitTimeForNpmCommandMax: 12000
    }
};


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
        clearAllBestTimes: boolean;
        clearBestTime: boolean;
        clearBestTimesOnTestCountChange: boolean;
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
        closeActiveDocument: number;
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
        fileCachePersist: number;
        findDocumentPositionCommand: number;
        focusCommand: number;
        focusCommandAlreadyFocused: number;
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
        taskCommand: number;
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
        taskCommand: number;
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
