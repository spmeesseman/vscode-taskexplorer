
import { configuration } from "../lib/utils/configuration";

export const testControl = {
    keepSettingsFile: false,
    logLevel: 1,
    writeToConsole: false,
    writeToFile: false,
    writeToFileName: "taskexplorer.log",
    writeToOutput: true,
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
    // Use update() here for coverage, since these two settings wont trigger any processing
    userLogLevel: configuration.get<number>("logging.level"),
    userPathToAnt: configuration.get<string>("pathToPrograms.ant"),
    waitTimeForBuildTree: 5000,
    waitTimeForFsCreateEvent: 200,
    waitTimeForFsDeleteEvent: 200,
    waitTimeForFsModifyEvent: 150,
    waitTimeForConfigEvent: 125,
    waitTimeForConfigEnableEvent: 175,
    waitTimeForCommand: 150,
    waitTimeForCommandFast: 50,
    waitTimeForNpmCommandMin: 3000,
    waitTimeForNpmCommandMax: 10000,
    waitTimeForRefreshCommand: 500,
    waitTimeForRefreshTaskTypeCommand: 1000,
    waitTimeForRunCommand: 3000,
    waitTimeMax: 15000
};
