
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
    // Default command shell to use
    //
    defaultWindowsShell: undefined,
    // defaultWindowsShell: "C:\\Windows\\System32\\cmd.exe",
    //
    // LOGGING DEFAULTS
    //
    log: {
        level: 2,
        enabled: false,
        errors: false,           // print errors to console regardless if logging is enabled or not
        console: false,
        consoleLevel: 1,
        file: false,
        fileSymbols: false,
        output: false,          // enabled automatically if enabled is `true` and all 3 output flags are `false`
        openFileOnFinish: true, // nope. not yet
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
    // SLOW TIMES (TESTS MARKED RED WHEN EXCEEDED)
    // Slow times are generally 2x the amount of time the command "should" take.  Mocha
    // considers slow at 50% of MochaContext.slow() for each test instance.
    //
    slowTime: {
        addWorkspaceFolder: 13750,
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
        configSpecialFolderEvent: 475,
        configReadEvent: 25,
        explorerViewStartup: 19050,
        fetchTasksCommand: 3000,
        fileCachePersist: 470,
        findDocumentPositionCommand: 850,
        focusCommand: 3400,
        focusCommandAlreadyFocused: 130,
        fsCreateEvent: 1660,
        fsCreateFolderEvent: 1940,
        fsDeleteEvent: 1450,
        fsDeleteFolderEvent: 1750,
        fsModifyEvent: 810,
        getTreeTasks: 215,
        getTreeTasksNpm: 750, // npm task provider is slower than shit on a turtle
        licenseMgrOpenPage: 575,
        licenseMgrOpenPageWithDetail: 990,
        licenseManagerLocalCheck: 2000,
        licenseManagerLocalStartServer: 1125,
        licenseManagerRemoteCheck: 3000,
        licenseManagerRemoteStartServer: 3850,
        npmCommand: 11925,
        npmCommandPkg: 9300,
        npmInstallCommand: 19650,
        refreshCommand: 18960,
        rebuildFileCache: 15500,
        rebuildFileCacheCancel: 1810,
        removeWorkspaceFolder: 10000,
        runCommand: 8900,
        runPauseCommand: 2030,
        runStopCommand: 2030,
        showHideSpecialFolder: 440,
        storageRead: 50,
        storageUpdate: 50,
        taskProviderReadUri: 100,
        taskCommand: 1600,
        tasks: {
            antParser: 800,
            antTask: 4200,
            bashScript: 4000,
            batchScript: 8000,
            gulpParser: 3900
        },
        verifyTaskCount: 825,
        verifyTaskCountByTree: 850,
        verifyTaskCountFirstCall: 1350,
        verifyTaskCountNpm: 3075, // npm task provider is slower than shit on a turtle
        verifyTaskCountWorkspace: 3500,
        viewReport: 1950,
        walkTaskTree: 5500,
        walkTaskTreeWithDocOpen: 27850
    },
    //
    // WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME, OR waitTime.max)
    //
    waitTime:
    {   //
        // MINIMUM WAIT TIMES
        //
        addWorkspaceFolder: 230,
        configEvent: 105,
        configEventFast: 45,
        configDisableEvent: 140,
        configEnableEvent: 175,
        configGlobEvent: 140,
        command: 130,
        commandFast: 60,
        configGroupingEvent: 240,
        configRegisterExplorerEvent: 225,
        explorerViewStartup: 4000,
        focusCommand: 400,
        fsCreateEvent: 180,
        fsCreateFolderEvent: 230,
        fsDeleteEvent: 180,
        fsDeleteFolderEvent: 230,
        fsModifyEvent: 135,
        getTreeMin: 330,
        getTreeMax: 1700,
        getTreeTasks: 65,
        min: 40,
        npmCommandMin: 2200,
        refreshCommand: 400,
        refreshTaskTypeCommand: 800,
        removeWorkspaceFolder: 220,
        runCommandMin: 750,
        taskCommand: 525,
        verifyTaskCountRetry: 130,
        verifyTaskCountRetryInterval: 320,
        viewReport: 100,
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
    //
    //
    defaultWindowsShell: string | undefined;
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
        tasks: {
            antParser: number;
            antTask: number;
            bashScript: number;
            batchScript: number;
            gulpParser: number;
        };
        verifyTaskCount: number;
        verifyTaskCountByTree: number;
        verifyTaskCountFirstCall: number;
        verifyTaskCountNpm: number; // npm task provider is slower than shit on a turtle
        verifyTaskCountWorkspace: number;
        viewReport: number;
        walkTaskTree: number;
        walkTaskTreeWithDocOpen: number;
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
