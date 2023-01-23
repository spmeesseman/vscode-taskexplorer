
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
        addWorkspaceFolder: 8440,
        buildTreeNoTasks: 360,
        cache: {
            build: 800,
            buildCancel: 290,
            rebuild: 6450,
            rebuildCancel: 490,
            rebuildNoChanges: 1240,
        },
        closeActiveDocument: 25,
        command: 850,
        commandFast: 305,
        config: {
            event: 270,
            eventFast: 90,
            registerExplorerEvent: 430,
            disableEvent: 1160,
            enableEvent: 1885,
            enableEventWorkspace: 2015,
            excludesEvent: 2000,
            excludeTasksEvent: 3015,
            globEvent: 1190,
            groupingEvent: 1080,
            pathToProgramsEvent: 705,
            showHideSpecialFolder: 340,
            showHideUserTasks: 1110,
            readEvent: 25,
            sortingEvent: 960
        },
        excludeCommand: 1710,
        explorerViewStartup: 10200,
        fetchTasksCommand: 2140,
        fileCachePersist: 350,
        findTaskPosition: 535,
        findTaskPositionDocOpen: 75,
        focusCommand: 2450,
        focusCommandAlreadyFocused: 320,
        focusCommandChangeViews: 95,
        fs: {
            createEvent: 1615,
            createEventTsc: 1785,
            createFolderEvent: 1665,
            deleteEvent: 1370,
            deleteEventTsc: 1795,
            deleteFolderEvent: 1465,
            modifyEvent: 975,
        },
        getTreeTasks: 200,
        getTreeTasksNpm: 580, // npm task provider is slower than shit on a turtle
        licenseMgr: {
            page: 110,
            pageWithDetail: 325,
            downCheck: 225,
            enterKey: 845,
            localCheck: 1795,
            localStartServer: 1195,
            remoteCheck: 2315,
            remoteStartServer: 3625,
            setLicenseCmd: 210
        },
        min: 60,
        refreshCommand: 11505,
        refreshCommandNoChanges: 250,
        removeWorkspaceFolder: 6470,
        runCommand: 5100,
        runPauseCommand: 2875,
        runStopCommand: 3140,
        storageRead: 65,
        storageUpdate: 65,
        storageSecretRead: 95,
        storageSecretUpdate: 205,
        taskCommand: 1415,
        taskCommandStartupMax: 4520,
        taskProviderReadUri: 95,
        tasks: {
            antParser: 780,
            antTask: 6910,
            antTaskWithAnsicon: 6940,
            bashScript: 3250,
            batchScriptBat: 5300,
            batchScriptCmd: 6375,
            gulpParser: 3955,
            npmCommand: 12340,
            npmCommandPkg: 10000,
            npmInstallCommand: 13630
        },
        taskCount: {
            verify: 675,
            verifyByTree: 700,
            verifyFirstCall: 1085,
            verifyNpm: 2525, // internal vscode npm task provider is slower than shit wtf
            verifyWorkspace: 2750,
        },
        viewReport: 700
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
        licenseMgr: {
            page: number;
            pageWithDetail: number;
            downCheck: number;
            enterKey: number;
            localCheck: number;
            localStartServer: number;
            remoteCheck: number;
            remoteStartServer: number;
            setLicenseCmd: number;
        };
        min: number;
        refreshCommand: number;
        refreshCommandNoChanges: number;
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
