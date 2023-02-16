
import { Disposable, Event, EventEmitter } from "vscode";

//
//  TODO - Remove istanbul tags when sessions are implemented
//
/* istanbul ignore next */
const passthrough = (value: any, resolve: (value?: any) => void) => resolve(value);

export type PromiseAdapter<T, U> = (
    value: T,
    resolve:
        (value: U | PromiseLike<U>) => void,
    reject:
        (reason: any) => void
) => any;


// export const oneTimeEvent = <T>(event: Event<T>): Event<T> =>
// {
// 	return (listener: (e: T) => unknown, thisArgs?: unknown, disposables?: Disposable[]) =>
//     {
// 		const result = event(e => { result.dispose(); return listener.call(thisArgs, e); }, null, disposables);
// 		return result;
// 	};
// };


/**
 * Return a promise that resolves with the next emitted event, or with some future
 * event as decided by an adapter.
 *
 * If specified, the adapter is a function that will be called with
 * `(event, resolve, reject)`. It will be called once per event until it resolves or
 * rejects.
 *
 * The default adapter is the passthrough function `(value, resolve) => resolve(value)`.
 *
 * @param event the event
 * @param adapter controls resolution of the returned promise
 * @returns a promise that resolves or rejects as specified by the adapter
 */

//
//  TODO - Remove istanbul tags when sessions are implemented
//

/* istanbul ignore next */
export const promiseFromEvent = <T, U>(event: Event<T>, adapter: PromiseAdapter<T, U> = passthrough): { promise: Promise<U>; cancel: EventEmitter<void> } =>
{
    let subscription: Disposable;
    const cancel = new EventEmitter<void>();

    return {
        promise: new Promise<U>((resolve, reject) =>
        {
            cancel.event(_ => reject("Cancelled"));
            subscription = event((value: T) =>
            {
                try
                {
                    Promise.resolve(adapter(value, resolve, reject))
                        .catch(reject);
                } catch (error)
                {
                    reject(error);
                }
            });
        }).then(
            (result: U) =>
            {
                subscription.dispose();
                return result;
            },
            error =>
            {
                subscription.dispose();
                throw error;
            }
        ),
        cancel
    };
};
