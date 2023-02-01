
// eslint-disable-next-line import/no-extraneous-dependencies
import { IDictionary } from "@spmeesseman/vscode-taskexplorer-types";

export const testControl: ITestControl =
{   //
    // Is multi-root workspace - Populated by initSettings() on startup
    //
    isMultiRootWorkspace: false,
    //
    // KEEP SETTINGS FILE CHANGES (@ test-fixture/project1/.vscode/workspace.json)
    //
    keepSettingsFileChanges: false,
    //
    // LOGGING DEFAULTS
    //
    log: {
        blockScaryColors: true,
        console: false,
        consoleLevel: 1,
        enabled: false,
        errors: false,          // print errors to console regardless if logging is enabled or not
        file: false,
        fileSymbols: false,
        level: 2,
        licServerReqSteps: false,
        openFileOnFinish: true, // not yet. got it working opening a separate vscode instance but not existing one
        output: false,          // enabled automatically if enabled is `true` and all 3 output flags are `false`
        taskExecutionSteps: false
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
        addWorkspaceFolder: 1485,
        addWorkspaceFolderEmpty: 1430,
        cache: {
            build: 480,
            buildCancel: 300,
            persist: 245,
            rebuild: 3825,
            rebuildCancel: 500,
            rebuildNoChanges: 880,
        },
        cleanup: 320,
        closeEditors: 15,
        commands: {
            fast: 250,
            refresh: 6250,
            refreshNoChanges: 235,
            run: 4750,
            runPause: 3100,
            runStop: 3400,
            showOutput: 880,
            standard: 660
        },
        config: {
            event: 270,
            eventFast: 90,
            registerExplorerEvent: 330,
            disableEvent: 1000,
            enableEvent: 1725,
            enableEventWorkspace: 1825,
            excludesEvent: 1775,
            excludeTasksEvent: 2750,
            globEvent: 1125,
            groupingEvent: 990,
            pathToProgramsEvent: 710,
            readEvent: 25,
            shellChange: 1325,
            showHideSpecialFolder: 525,
            showHideUserTasks: 975,
            sortingEvent: 815,
            terminalEvent: 250
        },
        excludeCommand: 1350,
        explorerViewStartup: 9500,
        fetchTasksCommand: 350,
        findTaskPosition: 280,
        findTaskPositionDocOpen: 30,
        focusCommand: 2330,
        focusCommandAlreadyFocused: 375,
        focusCommandChangeViews: 775,
        fs: {
            createEvent: 1550,
            createEventTsc: 1835,
            createFolderEvent: 1600,
            deleteEvent: 1325,
            deleteEventTsc: 1655,
            deleteFolderEvent: 1400,
            modifyEvent: 1140,
            modifyEventAnt: 1200
        },
        getTreeTasks: 205,
        getTreeTasksNpm: 470, // npm task provider is slower than shit on a turtle
        licenseMgr: {
            page: 220,
            pageWithDetail: 275,
            checkLicense: 400,
            enterKey: 840,
            get30DayLicense: 1445,
            getMaxTasks: 365,
            setLicenseCmd: 210
        },
        min: 50,
        removeWorkspaceFolder: 550,
        removeWorkspaceFolderEmpty: 475,
        reorderWorkspaceFolders: 580,
        storageRead: 15,
        storageUpdate: 25,
        storageSecretRead: 35,
        storageSecretUpdate: 45,
        taskCommand: 950,
        taskProviderReadUri: 90,
        tasks: {
            antParser: 1535,
            antTask: 3300,
            antTaskWithAnsicon: 3375,
            bashScript: 3075,
            batchScriptBat: 4140,
            batchScriptCmd: 5140,
            gulpParser: 3870,
            npmCommand: 8000,
            npmCommandPkg: 7000,
            npmInstallCommand: 8600
        },
        taskCount: {
            verify: 375,
            verifyByTree: 425,
            verifyFirstCall: 550
        },
        viewReleaseNotes: 415,
        viewReport: 380
    },
    //
    // SLOW TIMES (TESTS MARKED RED WHEN EXCEEDED)
    // Slow times are generally 2x the amount of time the command "should" take.  Mocha
    // considers slow at 50% of MochaContext.slow() for each test instance, and coverage
    // markers significantly reduce the overall speed of everything.
    //
    slowTimeMultiRoot: {
        addWorkspaceFolder: 3250,
        addWorkspaceFolderEmpty: 1625,
        cache: {
            build: 540,
            buildCancel: 330,
            persist: 275,
            rebuild: 4500,
            rebuildCancel: 540,
            rebuildNoChanges: 980,
        },
        cleanup: 375,
        closeEditors: 20,
        commands: {
            fast: 290,
            refresh: 6250,
            refreshNoChanges: 235,
            run: 5400,
            runPause: 3590,
            runStop: 3860,
            showOutput: 1250,
            standard: 725
        },
        config: {
            event: 310,
            eventFast: 105,
            registerExplorerEvent: 430,
            disableEvent: 1250,
            enableEvent: 2040,
            enableEventWorkspace: 2100,
            excludesEvent: 2080,
            excludeTasksEvent: 3080,
            globEvent: 1240,
            groupingEvent: 1090,
            pathToProgramsEvent: 780,
            readEvent: 30,
            shellChange: 1490,
            showHideSpecialFolder: 625,
            showHideUserTasks: 1100,
            sortingEvent: 800,
            terminalEvent: 300
        },
        excludeCommand: 1510,
        explorerViewStartup: 9500,
        fetchTasksCommand: 375,
        findTaskPosition: 355,
        findTaskPositionDocOpen: 45,
        focusCommand: 2575,
        focusCommandAlreadyFocused: 700,
        focusCommandChangeViews: 775,
        fs: {
            createEvent: 1930,
            createEventTsc: 2105,
            createFolderEvent: 1985,
            deleteEvent: 1620,
            deleteEventTsc: 1920,
            deleteFolderEvent: 1735,
            modifyEvent: 1430,
            modifyEventAnt: 1590
        },
        getTreeTasks: 225,
        getTreeTasksNpm: 540, // npm task provider is slower than shit on a turtle
        licenseMgr: {
            page: 215,
            pageWithDetail: 275,
            checkLicense: 405,
            enterKey: 845,
            get30DayLicense: 1500,
            getMaxTasks: 370,
            setLicenseCmd: 220
        },
        min: 50,
        refreshCommand: 7500,
        refreshCommandNoChanges: 345,
        removeWorkspaceFolder: 2275,
        removeWorkspaceFolderEmpty: 1450,
        reorderWorkspaceFolders: 935,
        storageRead: 20,
        storageUpdate: 30,
        storageSecretRead: 40,
        storageSecretUpdate: 50,
        taskCommand: 1155,
        taskProviderReadUri: 100,
        tasks: {
            antParser: 1600,
            antTask: 3740,
            antTaskWithAnsicon: 3795,
            bashScript: 3375,
            batchScriptBat: 4550,
            batchScriptCmd: 5650,
            gulpParser: 4300,
            npmCommand: 9500,
            npmCommandPkg: 8200,
            npmInstallCommand: 10400
        },
        taskCount: {
            verify: 400,
            verifyByTree: 450,
            verifyFirstCall: 750,
        },
        viewReleaseNotes: 655,
        viewReport: 390
    },
    //
    // WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME, OR waitTime.max)
    //
    waitTime:
    {   //
        // MINIMUM WAIT TIMES
        //
        addWorkspaceFolder: 220,
        blurCommand: 225,
        command: 70,
        commandFast: 45,
        config: {
            event: 75,
            eventFast: 40,
            excludesEvent: 90,
            excludeTasksEvent: 160,
            disableEvent: 100,
            enableEvent: 120,
            globEvent: 105,
            groupingEvent: 95,
            pathToProgramsEvent: 115,
            registerExplorerEvent: 125,
            shellChange: 95,
            showHideSpecialFolder: 95,
            showHideUserTasks: 100,
            sortingEvent: 95
        },
        explorerViewStartup: 1700,
        focusCommand: 210,
        fs: {
            createEvent: 195,
            createFolderEvent: 215,
            createEventTsc: 240,
            deleteEvent: 185,
            deleteFolderEvent: 205,
            modifyEvent: 180
        },
        getTreeTasks: 50,
        licenseMgr: {
            get30DayLicense: 250
        },
        max: 12000,
        min: 35,
        npmCommandMin: 1000,
        refreshCommand: 135,
        refreshCommandNoChanges: 75,
        refreshTaskTypeCommand: 120,
        removeWorkspaceFolder: 185,
        reorderWorkspaceFolders: 100,
        runCommandMin: 425,
        taskCommand: 375,
        viewReport: 80
    },
    waitTimeMultiRoot:
    {   //
        // MINIMUM WAIT TIMES
        //
        addWorkspaceFolder: 565,
        blurCommand: 250,
        command: 115,
        commandFast: 70,
        config: {
            event: 120,
            eventFast: 65,
            excludesEvent: 160,
            excludeTasksEvent: 250,
            disableEvent: 170,
            enableEvent: 195,
            globEvent: 175,
            groupingEvent: 155,
            pathToProgramsEvent: 190,
            registerExplorerEvent: 205,
            shellChange: 130,
            showHideSpecialFolder: 150,
            showHideUserTasks: 160,
            sortingEvent: 150
        },
        explorerViewStartup: 3200,
        focusCommand: 350,
        fs: {
            createEvent: 500,
            createFolderEvent: 565,
            createEventTsc: 550,
            deleteEvent: 485,
            deleteFolderEvent: 525,
            modifyEvent: 475
        },
        getTreeTasks: 80,
        licenseMgr: {
            get30DayLicense: 300
        },
        max: 15000,
        min: 55,
        npmCommandMin: 1700,
        refreshCommand: 225,
        refreshCommandNoChanges: 115,
        refreshTaskTypeCommand: 200,
        removeWorkspaceFolder: 500,
        reorderWorkspaceFolders: 150,
        runCommandMin: 775,
        taskCommand: 700,
        viewReport: 130
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


export interface ISlowTimes
{
    addWorkspaceFolder: number;
    addWorkspaceFolderEmpty: number;
    cache: {
        build: number;
        buildCancel: number;
        persist: number;
        rebuild: number;
        rebuildCancel: number;
        rebuildNoChanges: number;
    };
    cleanup: number;
    closeEditors: number;
    commands: {
        fast: number;
        refresh: number;
        refreshNoChanges: number;
        run: number;
        runPause: number;
        runStop: number;
        showOutput: number;
        standard: number;
    };
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
        shellChange: number;
        showHideSpecialFolder: number;
        showHideUserTasks: number;
        sortingEvent: number;
        terminalEvent: number;
    };
    excludeCommand: number;
    explorerViewStartup: number;
    fetchTasksCommand: number;
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
        modifyEventAnt: number;
    };
    getTreeTasks: number;
    getTreeTasksNpm: number; // npm task provider is slower than shit on a turtle
    licenseMgr: {
        page: number;
        pageWithDetail: number;
        checkLicense: number;
        enterKey: number;
        get30DayLicense: number;
        getMaxTasks: number;
        setLicenseCmd: number;
    };
    min: number;
    removeWorkspaceFolder: number;
    removeWorkspaceFolderEmpty: number;
    reorderWorkspaceFolders: number;
    storageRead: number;
    storageUpdate: number;
    storageSecretRead: number;
    storageSecretUpdate: number;
    taskCommand: number;
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
    };
    viewReleaseNotes: number;
    viewReport: number;
};


export interface IWaitTimes
{   //
    // MINIMUM WAIT TIMES
    //
    addWorkspaceFolder: number;
    blurCommand: number;
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
        shellChange: number;
        showHideSpecialFolder: number;
        showHideUserTasks: number;
        sortingEvent: number;
    };
    explorerViewStartup: number;
    focusCommand: number;
    fs: {
        createEvent: number;
        createEventTsc: number;
        createFolderEvent: number;
        deleteEvent: number;
        deleteFolderEvent: number;
        modifyEvent: number;
    };
    getTreeTasks: number;
    licenseMgr: {
        get30DayLicense: number;
    };
    max: number;
    min: number;
    npmCommandMin: number;
    refreshCommand: number;
    refreshCommandNoChanges: number;
    refreshTaskTypeCommand: number;
    removeWorkspaceFolder: number;
    reorderWorkspaceFolders: number;
    runCommandMin: number;
    taskCommand: number;
    viewReport: number;
};


export interface ITestControl extends IDictionary<any>
{   //
    // Is multi-root workspace - Populated by initSettings() on startup
    //
    isMultiRootWorkspace: boolean;
    //
    // KEEP SETTINGS FILE CHANGES (@ test-fixture/project1/.vscode/workspace.json)
    //
    keepSettingsFileChanges: boolean;
    //
    // LOGGING DEFAULTS
    //
    log: {
        blockScaryColors: boolean;
        console: boolean;
        consoleLevel: 1 | 2 | 3 | 4 | 5;
        enabled: boolean;
        errors: boolean;
        file: boolean;
        fileSymbols: boolean;
        level: 1 | 2 | 3 | 4 | 5;
        licServerReqSteps: boolean;
        openFileOnFinish: boolean; // not yet
        output: boolean;
        taskExecutionSteps: boolean;
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
    slowTime: ISlowTimes;
    //
    // WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME; OR waitTime.max)
    //
    waitTime: IWaitTimes;
};
