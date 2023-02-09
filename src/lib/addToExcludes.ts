

import { log } from "./log/log";
import { configuration } from "./utils/configuration";
import { pushIfNotExists, removeFromArray } from "./utils/utils";
import { enableConfigWatcher } from "./watcher/configWatcher";


export const addToExcludes = async(paths: string[], excludesList: string, disableConfigWatcher: boolean, logPad: string) =>
{
    const excludes = configuration.get<string[]>(excludesList, []);
    log.methodStart("add to excludes", 2, logPad, false, [[ "paths", paths.join(", ") ]]);
    for (const p of paths) {
        pushIfNotExists(excludes, p);
    }
    if (disableConfigWatcher) {
        enableConfigWatcher(false);
    }
    await configuration.update(excludesList, excludes);
    if (disableConfigWatcher) {
        enableConfigWatcher(true);
    }
    log.methodDone("add to excludes", 2, logPad);
};


export const removeFromExcludes = async(paths: string[], excludesList: string, disableConfigWatcher: boolean, logPad: string) =>
{
    const excludes = configuration.get<string[]>(excludesList, []);
    log.methodStart("remove from excludes", 2, logPad, false, [[ "paths", paths.join(", ") ]]);
    for (const p of paths) {
        removeFromArray(excludes, p);
    }
    if (disableConfigWatcher) {
        enableConfigWatcher(false);
    }
    await configuration.update(excludesList, excludes);
    if (disableConfigWatcher) {
        enableConfigWatcher(true);
    }
    log.methodDone("remove from excludes", 2, logPad);
};
