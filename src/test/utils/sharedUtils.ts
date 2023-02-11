
import { join, normalize, resolve } from "path";
import { existsSync, mkdirSync } from "fs";

const testsProjectsDir = normalize(resolve(__dirname, "..", "..", ".vscode-test", "user-data", "projects"));
if (!existsSync(testsProjectsDir)) {
    mkdirSync(testsProjectsDir);
}

export const getWsPath = (p: string) => normalize(resolve(__dirname, "..", "..", "test-fixture", "project1", p));


export const getProjectsPath = (p: string) => normalize(resolve(testsProjectsDir, p));


export const getDevPath = (p: string) => normalize(resolve(__dirname, "..", "..", p));
