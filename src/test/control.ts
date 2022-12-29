
import { configuration } from "../common/configuration";

export const testControl = {
    keepSettingsFile: false,
    logLevel: 3,
    writeToConsole: false,
    writeToOutput: false,
    slowTimeForCommand: 1250,
    slowTimeForCommandFast: 450,
    slowTimeForConfigEvent: 200,
    slowTimeForConfigEnableEvent: 750,
    slowTimeForFocusCommand: 2000,
    slowTimeForFsCreateEvent: 1200,
    slowTimeForFsDeleteEvent: 750,
    slowTimeForNpmCommand: 7500,
    slowTimeForRefreshCommand: 10000,
    slowTimeForFetchTasksCommand: 1000,
    userLogLevel: configuration.get<number>("debugLevel"),
    userPathToAnt: configuration.get<string>("pathToPrograms.ant"),
    waitTimeForBuildTree: 5000,
    waitTimeForFsCreateEvent: 200,
    waitTimeForFsDeleteEvent: 200,
    waitTimeForFsModifyEvent: 150,
    waitTimeForConfigEvent: 125,
    waitTimeForConfigEnableEvent: 175,
    waitTimeForCommand: 150,
    waitTimeForCommandFast: 50,
    waitTimeForNpmCommand: 7000,
    waitTimeForRefreshCommand: 500,
    waitTimeForRefreshTaskTypeCommand: 1000,
    waitTimeForRunCommand: 3000,
    waitTimeMax: 15000
};
