
import { join, normalize, resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import { Uri, WorkspaceFolder } from "vscode";

const testsProjectsDir = normalize(resolve(__dirname, "..", "..", "..", ".vscode-test", "user-data", "projects"));
if (!existsSync(testsProjectsDir)) {
    mkdirSync(testsProjectsDir);
}

export const getWsPath = (p: string) => normalize(resolve(__dirname, "..", "..", "..", "test-fixture", "project1", p));


export const getProjectsPath = (p: string) => normalize(resolve(testsProjectsDir, p));


export const getDevPath = (p: string) => normalize(resolve(__dirname, "..", "..", "..", p));

export const getRelativePath = (folder: WorkspaceFolder, uri: Uri): string =>
{
    const rootUri = folder.uri;
    const absolutePath = uri.path.substring(0, uri.path.lastIndexOf("/") + 1);
    return absolutePath.substring(rootUri.path.length + 1);
};
