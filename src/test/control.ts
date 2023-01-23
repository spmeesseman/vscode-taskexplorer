
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
        addWorkspaceFolder: 9120,
        buildFileCache: 880,
        buildFileCacheCancel: 675,
        buildTreeNoTasks: 390,
        rebuildFileCache: 9000,
        rebuildFileCacheCancel: 980,
        rebuildFileCacheNoChanges: 1900,
        cache: {
            build: 910,
            buildCancel: 750,
            rebuild: 9300,
            rebuildCancel: 1590,
            rebuildNoChanges: 1840,
        },
        closeActiveDocument: 25,
        command: 880,
        commandFast: 315,
        config: {
            event: 270,
            eventFast: 90,
            registerExplorerEvent: 440,
            disableEvent: 1170,
            enableEvent: 1895,
            enableEventWorkspace: 2035,
            excludesEvent: 2010,
            excludeTasksEvent: 3045,
            globEvent: 1200,
            groupingEvent: 1105,
            pathToProgramsEvent: 705,
            showHideSpecialFolder: 330,
            showHideUserTasks: 1130,
            specialFolderEvent: 375,
            readEvent: 25,
            sortingEvent: 1000
        },
        excludeCommand: 1810,
        explorerViewStartup: 13000,
        fetchTasksCommand: 2220,
        fileCachePersist: 360,
        findTaskPosition: 585,
        findTaskPositionDocOpen: 80,
        focusCommand: 2450,
        focusCommandAlreadyFocused: 320,
        focusCommandChangeViews: 95,
        fs: {
            createEvent: 1600,
            createEventTsc: 1790,
            createFolderEvent: 1670,
            deleteEvent: 1360,
            deleteEventTsc: 1805,
            deleteFolderEvent: 1470,
            modifyEvent: 975,
        },
        getTreeTasks: 205,
        getTreeTasksNpm: 600, // npm task provider is slower than shit on a turtle
        licenseManagerEnterKey: 845,
        licenseMgrOpenPage: 110,
        licenseMgrOpenPageWithDetail: 325,
        licenseManagerDownCheck: 665,
        licenseManagerLocalCheck: 1795,
        licenseManagerLocalStartServer: 1195,
        licenseManagerRemoteCheck: 2315,
        licenseManagerRemoteStartServer: 3625,
        min: 60,
        refreshCommand: 13105,
        refreshCommandNoChanges: 260,
        removeWorkspaceFolder: 6470,
        runCommand: 5350,
        runPauseCommand: 2465,
        runStopCommand: 2730,
        storageRead: 65,
        storageUpdate: 65,
        storageSecretRead: 95,
        storageSecretUpdate: 240,
        taskCommand: 1515,
        taskCommandStartupMax: 4650,
        taskProviderReadUri: 95,
        tasks: {
            antParser: 830,
            antTask: 7510,
            antTaskWithAnsicon: 7540,
            bashScript: 3690,
            batchScriptBat: 6900,
            batchScriptCmd: 7275,
            gulpParser: 4010,
            npmCommand: 13345,
            npmCommandPkg: 10290,
            npmInstallCommand: 16630
        },
        taskCount: {
            verify: 745,
            verifyByTree: 790,
            verifyFirstCall: 1275,
            verifyNpm: 3015, // internal vscode npm task provider is slower than shit wtf
            verifyWorkspace: 3100,
        },
        viewReport: 1550
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
