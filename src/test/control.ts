
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
        command: 1470,
        commandFast: 560,
        config: {
            event: 315,
            eventFast: 110,
            registerExplorerEvent: 700,
            disableEvent: 1575,
            enableEvent: 2325,
            excludesEvent: 2750,
            excludeTasksEvent: 4225,
            globEvent: 1940,
            groupingEvent: 1595,
            pathToProgramsEvent: 725,
            specialFolderEvent: 475,
            readEvent: 25
        },
        excludeCommand: 2350,
        explorerViewStartup: 19050,
        fetchTasksCommand: 3000,
        fileCachePersist: 470,
        findTaskPosition: 875,
        findTaskPositionDocOpen: 115,
        focusCommand: 3400,
        focusCommandAlreadyFocused: 360,
        focusCommandChangeViews: 130,
        fsCreateEvent: 1890,
        fsCreateFolderEvent: 2210,
        fsDeleteEvent: 1760,
        fsDeleteFolderEvent: 2015,
        fsModifyEvent: 945,
        getTreeTasks: 295,
        getTreeTasksNpm: 750, // npm task provider is slower than shit on a turtle
        licenseMgrOpenPage: 575,
        licenseMgrOpenPageWithDetail: 990,
        licenseManagerLocalCheck: 2000,
        licenseManagerLocalStartServer: 1220,
        licenseManagerRemoteCheck: 3000,
        licenseManagerRemoteStartServer: 3850,
        min: 50,
        refreshCommand: 18625,
        refreshCommandNoChanges: 400,
        rebuildFileCache: 14500,
        rebuildFileCacheCancel: 1810,
        rebuildFileCacheNoChanges: 3400,
        removeWorkspaceFolder: 10000,
        runCommand: 8900,
        runPauseCommand: 2030,
        runStopCommand: 2030,
        showHideSpecialFolder: 440,
        storageRead: 50,
        storageUpdate: 50,
        taskCommand: 1600,
        taskCommandStartupMax: 5000,
        taskProviderReadUri: 100,
        tasks: {
            antParser: 820,
            antTask: 8840,
            antTaskWithAnsicon: 8890,
            bashScript: 4000,
            batchScript: 8075,
            gulpParser: 4085,
            npmCommand: 13925,
            npmCommandPkg: 11300,
            npmInstallCommand: 21650
        },
        verifyTaskCount: 825,
        verifyTaskCountByTree: 850,
        verifyTaskCountFirstCall: 1350,
        verifyTaskCountNpm: 3175, // internal vscode npm task provider is slower than shit wtf
        verifyTaskCountWorkspace: 3500,
        viewReport: 1950
    },
    //
    // WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME, OR waitTime.max)
    //
    waitTime:
    {   //
        // MINIMUM WAIT TIMES
        //
        addWorkspaceFolder: 230,
        config: {
            event: 105,
            eventFast: 45,
            disableEvent: 140,
            enableEvent: 175,
            globEvent: 140,
            groupingEvent: 240,
            registerExplorerEvent: 225
        },
        command: 140,
        commandFast: 70,
        explorerViewStartup: 4000,
        focusCommand: 400,
        fsCreateEvent: 170,
        fsCreateFolderEvent: 220,
        fsDeleteEvent: 170,
        fsDeleteFolderEvent: 220,
        fsModifyEvent: 145,
        getTreeMin: 320,
        getTreeMax: 1680,
        getTreeTasks: 65,
        min: 40,
        npmCommandMin: 2200,
        refreshCommand: 375,
        refreshCommandNoChanges: 100,
        refreshTaskTypeCommand: 350,
        removeWorkspaceFolder: 210,
        runCommandMin: 720,
        taskCommand: 625,
        verifyTaskCountRetry: 125,
        verifyTaskCountRetryInterval: 310,
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
        level: 1 | 2 | 3 | 4 | 5;
        enabled: boolean;
        errors: boolean;
        console: boolean;
        consoleLevel: 1 | 2 | 3 | 4 | 5;
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
        config: {
            event: number;
            eventFast: number;
            registerExplorerEvent: number;
            disableEvent: number;
            enableEvent: number;
            excludesEvent: number;
            excludeTasksEvent: number;
            globEvent: number;
            groupingEvent: number;
            pathToProgramsEvent: number;
            specialFolderEvent: number;
            readEvent: number;
        };
        excludeCommand: number;
        explorerViewStartup: number;
        fetchTasksCommand: number;
        fileCachePersist: number;
        findTaskPosition: number;
        findTaskPositionDocOpen: number;
        focusCommand: number;
        focusCommandAlreadyFocused: number;
        focusCommandChangeViews: number;
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
        min: number;
        refreshCommand: number;
        refreshCommandNoChanges: number;
        rebuildFileCache: number;
        rebuildFileCacheCancel: number;
        rebuildFileCacheNoChanges: number;
        removeWorkspaceFolder: number;
        runCommand: number;
        runPauseCommand: number;
        runStopCommand: number;
        showHideSpecialFolder: number;
        storageRead: number;
        storageUpdate: number;
        taskCommand: number;
        taskCommandStartupMax: number;
        taskProviderReadUri: number;
        tasks: {
            antParser: number;
            antTask: number;
            antTaskWithAnsicon: number;
            bashScript: number;
            batchScript: number;
            gulpParser: number;
            npmCommand: number;
            npmCommandPkg: number;
            npmInstallCommand: number;
        };
        verifyTaskCount: number;
        verifyTaskCountByTree: number;
        verifyTaskCountFirstCall: number;
        verifyTaskCountNpm: number; // npm task provider is slower than shit on a turtle
        verifyTaskCountWorkspace: number;
        viewReport: number;
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
        config: {
            event: number;
            eventFast: number;
            disableEvent: number;
            enableEvent: number;
            globEvent: number;
            groupingEvent: number;
            registerExplorerEvent: number;
        };
        command: number;
        commandFast: number;
        explorerViewStartup: number;
        focusCommand: number;
        getTreeMin: number;
        getTreeMax: number;
        getTreeTasks: number;
        min: number;
        npmCommandMin: number;
        refreshCommand: number;
        refreshCommandNoChanges: number;
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
