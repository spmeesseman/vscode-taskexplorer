
import { normalize, resolve } from "path";

export const getWsPath = (p: string) => normalize(resolve(__dirname, "../../../test-fixture/project1", p));

export const getTestsPath = (p: string) => normalize(resolve(__dirname, p));
