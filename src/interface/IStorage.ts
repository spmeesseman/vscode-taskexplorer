import { Event, SecretStorageChangeEvent } from "vscode";


export interface StorageChangeEvent
{
    readonly key: string;
    readonly workspace: boolean;
};


export interface IStorage // extends Memento
{
    onDidChange: Event<StorageChangeEvent>;
    onDidChangeSecrets: Event<SecretStorageChangeEvent>;
    delete(key: string): Thenable<void>;
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue?: T): T;
    getSecret(key: string): Thenable<string | undefined>;
    update(key: string, value: any): Thenable<void>;
    updateSecret(key: string, value: any): Thenable<void>;
    keys(): readonly string[];
    get2<T>(key: string): Promise<T | undefined>;
    get2<T>(key: string, defaultValue?: T): Promise<T>;
    get2Sync<T>(key: string): T | undefined;
    get2Sync<T>(key: string, defaultValue?: T): T;
    update2(key: string, value: any): Promise<void>;
    update2Sync(key: string, value: any): void;
}
