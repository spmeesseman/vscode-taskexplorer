
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
        addWorkspaceFolder: 2000,
        addWorkspaceFolderEmpty: 1310,
        addWorkspaceFolderFake: 1500,
        buildTreeNoTasks: 295,
        cache: {
            build: 490,
            buildCancel: 295,
            rebuild: 3900,
            rebuildCancel: 490,
            rebuildNoChanges: 890,
        },
        closeEditors: 20,
        command: 675,
        commandFast: 265,
        commandShowOutput: 800,
        config: {
            event: 270,
            eventFast: 90,
            registerExplorerEvent: 390,
            disableEvent: 1125,
            enableEvent: 1860,
            enableEventWorkspace: 1940,
            excludesEvent: 1900,
            excludeTasksEvent: 2800,
            globEvent: 1125,
            groupingEvent: 990,
            pathToProgramsEvent: 710,
            showHideSpecialFolder: 340,
            showHideUserTasks: 1000,
            readEvent: 25,
            sortingEvent: 740,
            terminalEvent: 250
        },
        excludeCommand: 1370,
        explorerViewStartup: 7565,
        fetchTasksCommand: 1840,
        fileCachePersist: 250,
        findTaskPosition: 325,
        findTaskPositionDocOpen: 40,
        focusCommand: 2340,
        focusCommandAlreadyFocused: 320,
        focusCommandChangeViews: 195,
        fs: {
            createEvent: 1610,
            createEventTsc: 1755,
            createFolderEvent: 1655,
            deleteEvent: 1350,
            deleteEventTsc: 1635,
            deleteFolderEvent: 1445,
            modifyEvent: 1075,
        },
        getTreeTasks: 205,
        getTreeTasksNpm: 490, // npm task provider is slower than shit on a turtle
        licenseMgr: {
            page: 160,
            pageWithDetail: 275,
            checkLicense: 400,
            enterKey: 845,
            getMaxTasks: 360,
            localStartServer: 1195,
            serverDownHostUp: 14100,
            setLicenseCmd: 210
        },
        min: 50,
        refreshCommand: 6800,
        refreshCommandNoChanges: 245,
        removeWorkspaceFolder: 2000,
        removeWorkspaceFolderEmpty: 415,
        removeWorkspaceFolderFake: 500,
        runCommand: 4900,
        runPauseCommand: 3255,
        runStopCommand: 3510,
        storageRead: 55,
        storageUpdate: 60,
        storageSecretRead: 95,
        storageSecretUpdate: 200,
        taskCommand: 1050,
        taskProviderReadUri: 90,
        tasks: {
            antParser: 490,
            antTask: 3400,
            antTaskWithAnsicon: 3450,
            bashScript: 3075,
            batchScriptBat: 4150,
            batchScriptCmd: 5150,
            gulpParser: 3875,
            npmCommand: 8500,
            npmCommandPkg: 7500,
            npmInstallCommand: 9500
        },
        taskCount: {
            verify: 460,
            verifyByTree: 500,
            verifyFirstCall: 680,
            verifyNpm: 1400, // internal vscode npm task provider is slower than shit wtf
            verifyWorkspace: 1800
        },
        viewReport: 375
    },
    //
    // SLOW TIMES (TESTS MARKED RED WHEN EXCEEDED)
    // Slow times are generally 2x the amount of time the command "should" take.  Mocha
    // considers slow at 50% of MochaContext.slow() for each test instance, and coverage
    // markers significantly reduce the overall speed of everything.
    //
    slowTimeMultiRoot: {
        addWorkspaceFolder: 3200,
        addWorkspaceFolderEmpty: 1510,
        addWorkspaceFolderFake: 2500,
        buildTreeNoTasks: 325,
        cache: {
            build: 540,
            buildCancel: 330,
            rebuild: 4500,
            rebuildCancel: 540,
            rebuildNoChanges: 980,
        },
        closeEditors: 25,
        command: 725,
        commandFast: 290,
        commandShowOutput: 950,
        config: {
            event: 300,
            eventFast: 100,
            registerExplorerEvent: 430,
            disableEvent: 1250,
            enableEvent: 2040,
            enableEventWorkspace: 2100,
            excludesEvent: 2080,
            excludeTasksEvent: 3080,
            globEvent: 1240,
            groupingEvent: 1090,
            pathToProgramsEvent: 780,
            showHideSpecialFolder: 375,
            showHideUserTasks: 1100,
            readEvent: 30,
            sortingEvent: 800,
            terminalEvent: 300
        },
        excludeCommand: 1510,
        explorerViewStartup: 8250,
        fetchTasksCommand: 2020,
        fileCachePersist: 275,
        findTaskPosition: 355,
        findTaskPositionDocOpen: 45,
        focusCommand: 2575,
        focusCommandAlreadyFocused: 360,
        focusCommandChangeViews: 200,
        fs: {
            createEvent: 1930,
            createEventTsc: 2105,
            createFolderEvent: 1985,
            deleteEvent: 1620,
            deleteEventTsc: 1920,
            deleteFolderEvent: 1735,
            modifyEvent: 1290,
        },
        getTreeTasks: 225,
        getTreeTasksNpm: 540, // npm task provider is slower than shit on a turtle
        licenseMgr: {
            page: 175,
            pageWithDetail: 325,
            checkLicense: 440,
            enterKey: 930,
            getMaxTasks: 400,
            localStartServer: 1315,
            serverDownHostUp: 14100,
            setLicenseCmd: 230
        },
        min: 50,
        refreshCommand: 7500,
        refreshCommandNoChanges: 310,
        removeWorkspaceFolder: 2200,
        removeWorkspaceFolderEmpty: 1100,
        removeWorkspaceFolderFake: 1375,
        runCommand: 5400,
        runPauseCommand: 3590,
        runStopCommand: 3860,
        storageRead: 60,
        storageUpdate: 65,
        storageSecretRead: 105,
        storageSecretUpdate: 220,
        taskCommand: 1155,
        taskProviderReadUri: 100,
        tasks: {
            antParser: 540,
            antTask: 3740,
            antTaskWithAnsicon: 3795,
            bashScript: 3375,
            batchScriptBat: 4550,
            batchScriptCmd: 5650,
            gulpParser: 4275,
            npmCommand: 9300,
            npmCommandPkg: 8200,
            npmInstallCommand: 10400
        },
        taskCount: {
            verify: 500,
            verifyByTree: 550,
            verifyFirstCall: 750,
            verifyNpm: 1540, // internal vscode npm task provider is slower than shit wtf
            verifyWorkspace: 1980
        },
        viewReport: 400
    },
    //
    // WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME, OR waitTime.max)
    //
    waitTime:
    {   //
        // MINIMUM WAIT TIMES
        //
        addWorkspaceFolder: 225,
        command: 70,
        commandFast: 45,
        config: {
            event: 75,
            eventFast: 40,
            excludesEvent: 95,
            excludeTasksEvent: 165,
            disableEvent: 105,
            enableEvent: 125,
            globEvent: 110,
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
            createEvent: 200,
            createFolderEvent: 225,
            deleteEvent: 190,
            deleteFolderEvent: 210,
            modifyEvent: 185
        },
        getTreeMin: 170,
        getTreeTasks: 50,
        max: 12000,
        min: 35,
        npmCommandMin: 1100,
        refreshCommand: 140,
        refreshCommandNoChanges: 75,
        refreshTaskTypeCommand: 125,
        removeWorkspaceFolder: 200,
        runCommandMin: 500,
        taskCommand: 450,
        verifyTaskCountRetry: 70,
        verifyTaskCountRetryInterval: 100,
        viewReport: 80,
    },
    waitTimeMultiRoot:
    {   //
        // MINIMUM WAIT TIMES
        //
        addWorkspaceFolder: 565,
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
            showHideSpecialFolder: 150,
            showHideUserTasks: 160,
            sortingEvent: 150
        },
        explorerViewStartup: 3200,
        focusCommand: 350,
        fs: {
            createEvent: 500,
            createFolderEvent: 565,
            deleteEvent: 485,
            deleteFolderEvent: 525,
            modifyEvent: 475
        },
        getTreeMin: 250,
        getTreeTasks: 80,
        max: 15000,
        min: 55,
        npmCommandMin: 1700,
        refreshCommand: 225,
        refreshCommandNoChanges: 115,
        refreshTaskTypeCommand: 200,
        removeWorkspaceFolder: 500,
        runCommandMin: 775,
        taskCommand: 700,
        verifyTaskCountRetry: 110,
        verifyTaskCountRetryInterval: 160,
        viewReport: 130,
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
    addWorkspaceFolderFake: number;
    buildTreeNoTasks: number;
    cache: {
        build: number;
        buildCancel: number;
        rebuild: number;
        rebuildCancel: number;
        rebuildNoChanges: number;
    };
    closeEditors: number;
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
        terminalEvent: number;
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
        checkLicense: number;
        enterKey: number;
        getMaxTasks: number;
        localStartServer: number;
        serverDownHostUp: number;
        setLicenseCmd: number;
    };
    min: number;
    refreshCommand: number;
    refreshCommandNoChanges: number;
    removeWorkspaceFolder: number;
    removeWorkspaceFolderEmpty: number;
    removeWorkspaceFolderFake: number;
    runCommand: number;
    runPauseCommand: number;
    runStopCommand: number;
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
        verifyNpm: number; // internal vscode npm task provider is slower than shit wtf
        verifyWorkspace: number;
    };
    viewReport: number;
};


export interface IWaitTimes
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
    max: number;
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
    slowTime: ISlowTimes;
    //
    // WAIT TIMES (MAX TIME IS USUALLY ~ SLOW TIME; OR waitTime.max)
    //
    waitTime: IWaitTimes;
};
