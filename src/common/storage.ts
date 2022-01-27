import {
    Memento, ExtensionContext
} from "vscode";

export let storage: Memento;

export const initStorage = (context: ExtensionContext) =>
{
    //
    // Set up extension custom storage
    //
    storage = new Storage(context.globalState);
};

class Storage
{
    private storage: Memento;

    constructor(storageMemento: Memento)
    {
        this.storage = storageMemento;
    }

    // public keys(): string[]
    // {
    //     return [ "vscode-taskexplorer" ];
    // }

    public get<T>(key: string, defaultValue?: T): T | undefined
    {
        if (defaultValue)
        {
            let v = this.storage.get<T>(key, defaultValue);
            //
            // why have to do this?  In one case, passing a default of [] for a non-existent
            // value, the VSCode memento does not return[]. It returns an empty string????
            // So perform a double check if the value is falsy.
            //
            if (!v) {
                v = defaultValue;
            }
            return v;
        }
        return this.storage.get<T>(key);
    }

    public async update(key: string, value: any)
    {
        await this.storage.update(key, value);
    }
}
