
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
        addWorkspaceFolder: 4500,
        buildTreeNoTasks: 295,
        cache: {
            build: 650,
            buildCancel: 290,
            rebuild: 5000,
            rebuildCancel: 490,
            rebuildNoChanges: 900,
        },
        closeActiveDocument: 20,
        command: 725,
        commandFast: 270,
        config: {
            event: 270,
            eventFast: 90,
            registerExplorerEvent: 420,
            disableEvent: 1140,
            enableEvent: 1885,
            enableEventWorkspace: 1980,
            excludesEvent: 1950,
            excludeTasksEvent: 2900,
            globEvent: 1170,
            groupingEvent: 1040,
            pathToProgramsEvent: 705,
            showHideSpecialFolder: 340,
            showHideUserTasks: 1070,
            readEvent: 25,
            sortingEvent: 700
        },
        excludeCommand: 1590,
        explorerViewStartup: 8200,
        fetchTasksCommand: 2040,
        fileCachePersist: 320,
        findTaskPosition: 505,
        findTaskPositionDocOpen: 70,
        focusCommand: 2450,
        focusCommandAlreadyFocused: 320,
        focusCommandChangeViews: 95,
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
        getTreeTasksNpm: 570, // npm task provider is slower than shit on a turtle
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
        refreshCommand: 9000,
        refreshCommandNoChanges: 230,
        removeWorkspaceFolder: 5000,
        runCommand: 4930,
        runPauseCommand: 3235,
        runStopCommand: 3490,
        storageRead: 55,
        storageUpdate: 60,
        storageSecretRead: 90,
        storageSecretUpdate: 200,
        taskCommand: 1400,
        taskCommandStartupMax: 4300,
        taskProviderReadUri: 90,
        tasks: {
            antParser: 750,
            antTask: 6210,
            antTaskWithAnsicon: 6240,
            bashScript: 3050,
            batchScriptBat: 4700,
            batchScriptCmd: 5725,
            gulpParser: 3920,
            npmCommand: 12310,
            npmCommandPkg: 9800,
            npmInstallCommand: 13100
        },
        taskCount: {
            verify: 600,
            verifyByTree: 640,
            verifyFirstCall: 950,
            verifyNpm: 2100, // internal vscode npm task provider is slower than shit wtf
            verifyWorkspace: 2400,
        },
        viewReport: 350
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
