
export function getTaskName(script: string, relativePath: string | undefined)
{
    if (relativePath && relativePath.length)
    {
        if (relativePath.endsWith("/") || relativePath.endsWith("\\")) {
            return `${script} - ${relativePath.substring(0, relativePath.length - 1)}`;
        }
        else {
            return `${script} - ${relativePath}`;
        }
    }
    return script;
}
