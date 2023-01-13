import {
    Memento, ExtensionContext
} from "vscode";
import { isNumber, isString } from "./utils";

export let storage: Memento;

export const initStorage = (context: ExtensionContext, isTests: boolean) =>
{
    //
    // Set up extension custom storage
    //
    storage = new Storage(context.globalState, isTests);
};

class Storage
{
    private storage: Memento;
    private isTests: boolean;


    constructor(storageMemento: Memento, isTests: boolean)
    {
        this.storage = storageMemento;
        this.isTests = isTests;
    }


    public get<T>(key: string, defaultValue?: T): T | undefined
    {
        if (defaultValue || (isString(defaultValue) && defaultValue === "") || (isNumber(defaultValue) && defaultValue === 0))
        {
            let v = this.storage.get<T>((!this.isTests ? /* istanbul ignore next */"" : "tests") + key, defaultValue);
            //
            // why have to do this?  In one case, passing a default of [] for a non-existent
            // value, the VSCode memento does not return[]. It returns an empty string????
            // So perform a double check if the value is falsy.
            //
            /* istanbul ignore if */
            if (!v) {
                v = defaultValue;
            }
            return v;
        }
        return this.storage.get<T>((!this.isTests ? /* istanbul ignore next */"" : "tests") + key);
    }


    // update = (key: string, value: any) => this.storage.update(key, value);
    public async update(key: string, value: any)
    {
        await this.storage.update((!this.isTests ? /* istanbul ignore next */"" : "tests") + key, value);
    }
}
