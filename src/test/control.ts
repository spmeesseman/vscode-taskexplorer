
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
        addWorkspaceFolder: 4000,
        buildTreeNoTasks: 295,
        cache: {
            build: 650,
            buildCancel: 290,
            rebuild: 5000,
            rebuildCancel: 490,
            rebuildNoChanges: 900,
        },
        closeActiveDocument: 20,
        command: 700,
        commandFast: 250,
        config: {
            event: 270,
            eventFast: 90,
            registerExplorerEvent: 410,
            disableEvent: 1135,
            enableEvent: 1880,
            enableEventWorkspace: 1975,
            excludesEvent: 1940,
            excludeTasksEvent: 2850,
            globEvent: 1160,
            groupingEvent: 1030,
            pathToProgramsEvent: 710,
            showHideSpecialFolder: 340,
            showHideUserTasks: 1060,
            readEvent: 25,
            sortingEvent: 700
        },
        excludeCommand: 1550,
        explorerViewStartup: 7750,
        fetchTasksCommand: 2000,
        fileCachePersist: 300,
        findTaskPosition: 490,
        findTaskPositionDocOpen: 65,
        focusCommand: 2400,
        focusCommandAlreadyFocused: 320,
        focusCommandChangeViews: 90,
        fs: {
            createEvent: 1615,
            createEventTsc: 1760,
            createFolderEvent: 1665,
            deleteEvent: 1370,
            deleteEventTsc: 1700,
            deleteFolderEvent: 1450,
            modifyEvent: 975,
        },
        getTreeTasks: 195,
        getTreeTasksNpm: 560, // npm task provider is slower than shit on a turtle
        licenseMgr: {
            page: 125,
            pageWithDetail: 325,
            downCheck: 300,
            enterKey: 845,
            localCheck: 1825,
            localStartServer: 1195,
            remoteCheck: 2315,
            remoteStartServer: 3625,
            setLicenseCmd: 210
        },
        min: 50,
        refreshCommand: 8500,
        refreshCommandNoChanges: 230,
        removeWorkspaceFolder: 3000,
        runCommand: 4900,
        runPauseCommand: 3255,
        runStopCommand: 3510,
        storageRead: 55,
        storageUpdate: 60,
        storageSecretRead: 90,
        storageSecretUpdate: 200,
        taskCommand: 1300,
        taskCommandStartupMax: 4000,
        taskProviderReadUri: 90,
        tasks: {
            antParser: 740,
            antTask: 6000,
            antTaskWithAnsicon: 6050,
            bashScript: 3050,
            batchScriptBat: 4500,
            batchScriptCmd: 5525,
            gulpParser: 3900,
            npmCommand: 12300,
            npmCommandPkg: 9750,
            npmInstallCommand: 13000
        },
        taskCount: {
            verify: 580,
            verifyByTree: 630,
            verifyFirstCall: 925,
            verifyNpm: 2050, // internal vscode npm task provider is slower than shit wtf
            verifyWorkspace: 2350,
        },
        viewReport: 375
    },
    //
    // WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME, OR waitTime.max)
    //
    waitTime:
    {   //
        // MINIMUM WAIT TIMES
        //
        addWorkspaceFolder: 160,
        command: 80,
        commandFast: 50,
        config: {
            event: 85,
            eventFast: 45,
            excludesEvent: 110,
            excludeTasksEvent: 160,
            disableEvent: 115,
            enableEvent: 140,
            globEvent: 110,
            groupingEvent: 100,
            registerExplorerEvent: 150,
            showHideSpecialFolder: 95,
            showHideUserTasks: 115,
            sortingEvent: 110
        },
        explorerViewStartup: 2800,
        focusCommand: 240,
        fs: {
            createEvent: 185,
            createFolderEvent: 200,
            deleteEvent: 180,
            deleteFolderEvent: 195,
            modifyEvent: 180
        },
        getTreeMin: 190,
        getTreeTasks: 55,
        min: 40,
        npmCommandMin: 1425,
        refreshCommand: 165,
        refreshCommandNoChanges: 75,
        refreshTaskTypeCommand: 140,
        removeWorkspaceFolder: 130,
        runCommandMin: 600,
        taskCommand: 500,
        verifyTaskCountRetry: 70,
        verifyTaskCountRetryInterval: 140,
        viewReport: 90,
        //
        // MAXIMUM WAIT TIMES
        //
        max: 15000,
        runCommandMax: 3400,
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
