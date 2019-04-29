"use strict";

import
{
    Memento
} from "vscode";

export class Storage 
{
    private storage: Memento;
    
    constructor(storageMemento: Memento)
    {
        this.storage = storageMemento;
    }

    public get<T>(key: string, defaultValue?: T): T
    {
        return this.storage.get<T>(key, defaultValue!);
    }

    public update(key: string, value: any): Thenable<void>
    {
        return this.storage.update(key, value);
    }
}
