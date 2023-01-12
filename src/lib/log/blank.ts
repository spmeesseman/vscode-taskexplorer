import write from "./write";

const blank = (level?: number, queueId?: string) =>
{
    write("", level, "", queueId);
};

export default blank;
