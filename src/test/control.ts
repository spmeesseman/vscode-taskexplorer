
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
        suiteResults: {}
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
        addWorkspaceFolder: 10120,
        buildFileCache: 1020,
        buildFileCacheCancel: 860,
        buildTreeNoTasks: 420,
        rebuildFileCache: 10400,
        rebuildFileCacheCancel: 1180,
        rebuildFileCacheNoChanges: 2370,
        cache: {
            build: 990,
            buildCancel: 800,
            rebuild: 10200,
            rebuildCancel: 1790,
            rebuildNoChanges: 2240,
        },
        closeActiveDocument: 25,
        command: 945,
        commandFast: 345,
        config: {
            event: 270,
            eventFast: 90,
            registerExplorerEvent: 450,
            disableEvent: 1170,
            enableEvent: 1895,
            enableEventWorkspace: 2135,
            excludesEvent: 2040,
            excludeTasksEvent: 3275,
            globEvent: 1320,
            groupingEvent: 1175,
            pathToProgramsEvent: 705,
            showHideSpecialFolder: 340,
            showHideUserTasks: 1180,
            specialFolderEvent: 395,
            readEvent: 25,
            sortingEvent: 1100
        },
        excludeCommand: 1830,
        explorerViewStartup: 16000,
        fetchTasksCommand: 2380,
        fileCachePersist: 380,
        findTaskPosition: 655,
        findTaskPositionDocOpen: 85,
        focusCommand: 2650,
        focusCommandAlreadyFocused: 320,
        focusCommandChangeViews: 100,
        fs: {
            createEvent: 1620,
            createEventTsc: 1850,
            createFolderEvent: 1700,
            deleteEvent: 1390,
            deleteEventTsc: 1885,
            deleteFolderEvent: 1505,
            modifyEvent: 995,
        },
        getTreeTasks: 225,
        getTreeTasksNpm: 640, // npm task provider is slower than shit on a turtle
        licenseManagerEnterKey: 850,
        licenseMgrOpenPage: 115,
        licenseMgrOpenPageWithDetail: 330,
        licenseManagerDownCheck: 660,
        licenseManagerLocalCheck: 1770,
        licenseManagerLocalStartServer: 1200,
        licenseManagerRemoteCheck: 2320,
        licenseManagerRemoteStartServer: 3630,
        min: 50,
        refreshCommand: 16105,
        refreshCommandNoChanges: 300,
        removeWorkspaceFolder: 7970,
        runCommand: 6050,
        runPauseCommand: 1995,
        runStopCommand: 2240,
        storageRead: 50,
        storageUpdate: 50,
        storageSecretRead: 100,
        storageSecretUpdate: 245,
        taskCommand: 1525,
        taskCommandStartupMax: 4920,
        taskProviderReadUri: 95,
        tasks: {
            antParser: 860,
            antTask: 7510,
            antTaskWithAnsicon: 7540,
            bashScript: 3690,
            batchScriptBat: 6900,
            batchScriptCmd: 7275,
            gulpParser: 4110,
            npmCommand: 13345,
            npmCommandPkg: 10290,
            npmInstallCommand: 18630
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
        addWorkspaceFolder: 170,
        command: 90,
        commandFast: 50,
        config: {
            event: 95,
            eventFast: 45,
            excludesEvent: 120,
            excludeTasksEvent: 170,
            disableEvent: 125,
            enableEvent: 150,
            globEvent: 120,
            groupingEvent: 110,
            registerExplorerEvent: 160,
            showHideSpecialFolder: 100,
            showHideUserTasks: 125,
            sortingEvent: 125
        },
        explorerViewStartup: 3000,
        focusCommand: 250,
        fs: {
            createEvent: 195,
            createFolderEvent: 210,
            deleteEvent: 190,
            deleteFolderEvent: 205,
            modifyEvent: 190
        },
        getTreeMin: 200,
        getTreeTasks: 55,
        min: 40,
        npmCommandMin: 1500,
        refreshCommand: 175,
        refreshCommandNoChanges: 80,
        refreshTaskTypeCommand: 150,
        removeWorkspaceFolder: 140,
        runCommandMin: 620,
        taskCommand: 520,
        verifyTaskCountRetry: 75,
        verifyTaskCountRetryInterval: 150,
        viewReport: 90,
        //
        // MAXIMUM WAIT TIMES
        //
        max: 15000,
        runCommandMax: 3500,
        waitTimeForNpmCommandMax: 12000
    }
};


interface ISuiteResults extends IDictionary<any>
{
    timeStarted: number;
    numTests: number;
    successCount: number;
    suiteName: string;
    success: boolean;
    timeFinished: number;
    numTestsFailed: number;
}


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
        suiteResults: IDictionary<ISuiteResults>;
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
            enableEventWorkspace: number;
            excludesEvent: number;
            excludeTasksEvent: number;
            globEvent: number;
            groupingEvent: number;
            pathToProgramsEvent: number;
            readEvent: number;
            showHideSpecialFolder: number;
            showHideUserTasks: number;
            sortingEvent: number;
            specialFolderEvent: number;
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
        licenseManagerEnterKey: number;
        licenseMgrOpenPage: number;
        licenseMgrOpenPageWithDetail: number;
        licenseManagerDownCheck: number;
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
        storageRead: number;
        storageUpdate: number;
        storageSecretRead: number;
        storageSecretUpdate: number;
        taskCommand: number;
        taskCommandStartupMax: number;
        taskProviderReadUri: number;
        tasks: {
            antParser: number;
            antTask: number;
            antTaskWithAnsicon: number;
            bashScript: number;
            batchScriptBat: number;
            batchScriptCmd: number;
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
        command: number;
        commandFast: number;
        config: {
            event: number;
            eventFast: number;
            disableEvent: number;
            enableEvent: number;
            excludesEvent: number;
            excludeTasksEvent: number;
            globEvent: number;
            groupingEvent: number;
            registerExplorerEvent: number;
            showHideSpecialFolder: number;
            showHideUserTasks: number;
            sortingEvent: number;
        };
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
