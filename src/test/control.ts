
// eslint-disable-next-line import/no-extraneous-dependencies
import { IDictionary } from "@spmeesseman/vscode-taskexplorer-types";

export const testControl: ITestControl =
{   //
    // KEEP SETTINGS FILE CHANGES (@ test-fixture/project1/.vscode/workspace.json)
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
        clearBestTimesOnTestCountChange: false,
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
        addWorkspaceFolder: 2500,
        buildTreeNoTasks: 295,
        cache: {
            build: 520,
            buildCancel: 290,
            rebuild: 4200,
            rebuildCancel: 490,
            rebuildNoChanges: 890,
        },
        closeActiveDocument: 20,
        command: 675,
        commandFast: 265,
        commandShowOutput: 765,
        config: {
            event: 270,
            eventFast: 90,
            registerExplorerEvent: 390,
            disableEvent: 1125,
            enableEvent: 1860,
            enableEventWorkspace: 1940,
            excludesEvent: 1900,
            excludeTasksEvent: 2820,
            globEvent: 1130,
            groupingEvent: 990,
            pathToProgramsEvent: 710,
            showHideSpecialFolder: 340,
            showHideUserTasks: 1020,
            readEvent: 25,
            sortingEvent: 725
        },
        excludeCommand: 1425,
        explorerViewStartup: 7565,
        fetchTasksCommand: 1850,
        fileCachePersist: 260,
        findTaskPosition: 350,
        findTaskPositionDocOpen: 40,
        focusCommand: 2340,
        focusCommandAlreadyFocused: 320,
        focusCommandChangeViews: 90,
        fs: {
            createEvent: 1610,
            createEventTsc: 1755,
            createFolderEvent: 1655,
            deleteEvent: 1350,
            deleteEventTsc: 1635,
            deleteFolderEvent: 1445,
            modifyEvent: 970,
        },
        getTreeTasks: 205,
        getTreeTasksNpm: 495, // npm task provider is slower than shit on a turtle
        licenseMgr: {
            page: 150,
            pageWithDetail: 325,
            downCheck: 350,
            enterKey: 845,
            localCheck: 1825,
            localStartServer: 1195,
            remoteCheck: 2315,
            remoteStartServer: 3625,
            serverDownHostUp: 14100,
            setLicenseCmd: 210
        },
        min: 50,
        refreshCommand: 6975,
        refreshCommandNoChanges: 245,
        removeWorkspaceFolder: 1975,
        runCommand: 4900,
        runPauseCommand: 3255,
        runStopCommand: 3510,
        storageRead: 55,
        storageUpdate: 60,
        storageSecretRead: 95,
        storageSecretUpdate: 200,
        taskCommand: 1125,
        taskCommandStartupMax: 3000,
        taskProviderReadUri: 90,
        tasks: {
            antParser: 500,
            antTask: 3650,
            antTaskWithAnsicon: 3700,
            bashScript: 3025,
            batchScriptBat: 4200,
            batchScriptCmd: 5200,
            gulpParser: 3850,
            npmCommand: 10000,
            npmCommandPkg: 8500,
            npmInstallCommand: 11000
        },
        taskCount: {
            verify: 460,
            verifyByTree: 500,
            verifyFirstCall: 675,
            verifyNpm: 1400, // internal vscode npm task provider is slower than shit wtf
            verifyWorkspace: 1800
        },
        viewReport: 410
    },
    //
    // WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME, OR waitTime.max)
    //
    waitTime:
    {   //
        // MINIMUM WAIT TIMES
        //
        addWorkspaceFolder: 145,
        command: 70,
        commandFast: 45,
        config: {
            event: 75,
            eventFast: 40,
            excludesEvent: 95,
            excludeTasksEvent: 145,
            disableEvent: 105,
            enableEvent: 125,
            globEvent: 105,
            groupingEvent: 95,
            pathToProgramsEvent: 120,
            registerExplorerEvent: 130,
            showHideSpecialFolder: 95,
            showHideUserTasks: 105,
            sortingEvent: 95
        },
        explorerViewStartup: 2000,
        focusCommand: 220,
        fs: {
            createEvent: 190,
            createFolderEvent: 205,
            deleteEvent: 180,
            deleteFolderEvent: 180,
            modifyEvent: 175
        },
        getTreeMin: 170,
        getTreeTasks: 50,
        min: 35,
        npmCommandMin: 1100,
        refreshCommand: 140,
        refreshCommandNoChanges: 75,
        refreshTaskTypeCommand: 125,
        removeWorkspaceFolder: 115,
        runCommandMin: 500,
        taskCommand: 450,
        verifyTaskCountRetry: 70,
        verifyTaskCountRetryInterval: 100,
        viewReport: 80,
        //
        // MAXIMUM WAIT TIMES
        //
        max: 12000,
        runCommandMax: 3200,
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
    // KEEP SETTINGS FILE CHANGES (@ test-fixture/project1/.vscode/workspace.json)
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
        commandShowOutput: number;
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
            serverDownHostUp: number;
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
            pathToProgramsEvent: number;
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
