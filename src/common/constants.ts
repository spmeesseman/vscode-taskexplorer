//import { camelcase } from "../util";

export function camelcase(name: string) 
{
  return name
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
      return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
    })
    .replace(/[\s\-]+/g, "");
}

export const xml2jsParseSettings = {
  mergeAttrs: true,
  explicitRoot: false,
  explicitArray: false,
  attrNameProcessors: [camelcase],
  tagNameProcessors: [camelcase]
};
