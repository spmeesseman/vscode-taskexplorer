
export interface IStorage // extends Memento
{
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue?: T): T;
    update(key: string, value: any): Thenable<void>;
    get2<T>(key: string): Promise<T | undefined>;
    get2<T>(key: string, defaultValue?: T): Promise<T>;
    get2Sync<T>(key: string): T | undefined;
    get2Sync<T>(key: string, defaultValue?: T): T;
    update2(key: string, value: any): Promise<void>;
    update2Sync(key: string, value: any): void;
}
