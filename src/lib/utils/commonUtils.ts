/* eslint-disable prefer-arrow/prefer-arrow-functions */

export function properCase(name: string | undefined, removeSpaces?: boolean)
{
    if (!name) {
      return "";
    }
    return name.replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr) => ltr.toUpperCase()).replace(/[ ]+/g, !removeSpaces ? " " : "");
}
