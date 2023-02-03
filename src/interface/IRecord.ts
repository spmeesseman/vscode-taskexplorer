

export type IRecord<K extends keyof any, TValue> =
{
    [id in K]: TValue;
};
