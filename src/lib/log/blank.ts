
import { write } from "./write";

export const blank = (level?: number, queueId?: string) =>
{
    write("", level, "", queueId);
};
