
import { normalize, resolve } from "path";

export const getWsPath = (p: string) => normalize(resolve(__dirname, "../../../test-files", p));

export const getTestsPath = (p: string) => normalize(resolve(__dirname, p));
