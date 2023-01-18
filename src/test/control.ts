
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
    // considers slow at 50% of MochaContext.slow() for each test instance, and coverage
    // markers significantly reduce the overall speed of everything.
    //
    slowTime: {
        addWorkspaceFolder: 13720,
        buildFileCache: 1480,
        buildFileCacheCancel: 1330,
        buildTreeNoTasks: 580,
        rebuildFileCache: 14400,
        rebuildFileCacheCancel: 1780,
        rebuildFileCacheNoChanges: 3370,
        cache: {
            build: 1450,
            buildCancel: 1300,
            rebuild: 14400,
            rebuildCancel: 1770,
            rebuildNoChanges: 3340,
        },
        closeActiveDocument: 25,
        command: 1445,
        commandFast: 545,
        config: {
            event: 300,
            eventFast: 100,
            registerExplorerEvent: 690,
            disableEvent: 1555,
            enableEvent: 2320,
            excludesEvent: 2730,
            excludeTasksEvent: 4225,
            globEvent: 1920,
            groupingEvent: 1575,
            pathToProgramsEvent: 705,
            specialFolderEvent: 455,
            readEvent: 25
        },
        excludeCommand: 2330,
        explorerViewStartup: 21000,
        fetchTasksCommand: 2980,
        fileCachePersist: 450,
        findTaskPosition: 855,
        findTaskPositionDocOpen: 105,
        focusCommand: 3350,
        focusCommandAlreadyFocused: 360,
        focusCommandChangeViews: 120,
        fs: {
            createEvent: 1880,
            createEventTsc: 2350,
            createFolderEvent: 2200,
            deleteEvent: 1750,
            deleteEventTsc: 2385,
            deleteFolderEvent: 2005,
            modifyEvent: 9345,
        },
        getTreeTasks: 285,
        getTreeTasksNpm: 740, // npm task provider is slower than shit on a turtle
        licenseMgrOpenPage: 565,
        licenseMgrOpenPageWithDetail: 980,
        licenseManagerLocalCheck: 1990,
        licenseManagerLocalStartServer: 1200,
        licenseManagerRemoteCheck: 2980,
        licenseManagerRemoteStartServer: 3830,
        min: 50,
        refreshCommand: 19805,
        refreshCommandNoChanges: 380,
        removeWorkspaceFolder: 9970,
        runCommand: 8575,
        runPauseCommand: 2420,
        runStopCommand: 2420,
        showHideSpecialFolder: 430,
        storageRead: 50,
        storageUpdate: 50,
        taskCommand: 1575,
        taskCommandStartupMax: 4950,
        taskProviderReadUri: 100,
        tasks: {
            antParser: 810,
            antTask: 8860,
            antTaskWithAnsicon: 8905,
            bashScript: 3990,
            batchScript: 8065,
            gulpParser: 4110,
            npmCommand: 13905,
            npmCommandPkg: 11280,
            npmInstallCommand: 21630
        },
        taskCount: {
            verify: 815,
            verifyByTree: 840,
            verifyFirstCall: 1360,
            verifyNpm: 3165, // internal vscode npm task provider is slower than shit wtf
            verifyWorkspace: 3490,
        },
        viewReport: 1950
    },
    //
    // WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME, OR waitTime.max)
    //
    waitTime:
    {   //
        // MINIMUM WAIT TIMES
        //
        addWorkspaceFolder: 180,
        config: {
            event: 85,
            eventFast: 35,
            disableEvent: 105,
            enableEvent: 130,
            globEvent: 110,
            groupingEvent: 105,
            registerExplorerEvent: 155
        },
        command: 90,
        commandFast: 55,
        explorerViewStartup: 3100,
        focusCommand: 310,
        fs: {
            createEvent: 135,
            createFolderEvent: 185,
            deleteEvent: 135,
            deleteFolderEvent: 180,
            modifyEvent: 125
        },
        getTreeMin: 290,
        getTreeMax: 1600,
        getTreeTasks: 55,
        min: 40,
        npmCommandMin: 1500,
        refreshCommand: 225,
        refreshCommandNoChanges: 80,
        refreshTaskTypeCommand: 220,
        removeWorkspaceFolder: 160,
        runCommandMin: 670,
        taskCommand: 570,
        verifyTaskCountRetry: 90,
        verifyTaskCountRetryInterval: 200,
        viewReport: 90,
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
        cache: {
            build: number;
            buildCancel: number;
            rebuild: number;
            rebuildCancel: number;
            rebuildNoChanges: number;
        };
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
        fs: {
            createEvent: number;
            createEventTsc: number;
            createFolderEvent: number;
            deleteEvent: number;
            deleteEventTsc: number;
            deleteFolderEvent: number;
            modifyEvent: number;
        };
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
        taskCount: {
            verify: number;
            verifyByTree: number;
            verifyFirstCall: number;
            verifyNpm: number; // internal vscode npm task provider is slower than shit wtf
            verifyWorkspace: number;
        };
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
        fs: {
            createEvent: number;
            createFolderEvent: number;
            deleteEvent: number;
            deleteFolderEvent: number;
            modifyEvent: number;
        };
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
