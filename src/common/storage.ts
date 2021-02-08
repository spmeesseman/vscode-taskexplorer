import {
    Memento, ExtensionContext
} from "vscode";

export let storage: Memento | undefined;

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

    public get<T>(key: string, defaultValue?: T): T
    {
        return this.storage.get<T>(key, defaultValue);
    }

    public async update(key: string, value: any)
    {
        await this.storage.update(key, value);
    }
}
