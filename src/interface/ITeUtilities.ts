
import { WorkspaceFolder, Uri } from "vscode";

export interface ITeCommonUtilities
{
	properCase(name: string | undefined, removeSpaces?: boolean): string;
}

export interface ITePathUtilities
{
	getCwd(uri: Uri): string;
	getInstallPath(): Promise<string>;
	getPortableDataPath(logPad?: string): string | undefined;
	getRelativePath(folder: WorkspaceFolder, uri: Uri): string;
	getUserDataPath(platform?: string, logPad?: string): string;
}

export interface ITeTaskUtilities
{
	getScriptTaskTypes(): string[];
	getTaskTypes(): string[];
	getTaskTypeFriendlyName(taskType: string, lowerCase?: boolean): string;
	getTaskTypeRealName(taskType: string): string;
	isScriptType(source: string): boolean;
	isWatchTask(source: string): boolean;
}

export interface ITeUtilities
{
	getDateDifference(date1: Date | number, date2: Date | number, type?: "d" | "h" | "m" | "s"): number;
	getGroupSeparator(): string;
	getPackageManager(): string;
	lowerCaseFirstChar(s: string, removeSpaces: boolean): string;
	isBoolean(value: any): value is boolean;
	isNumber(n: any): n is number;
	isObject(value: any): value is { [key: string]: any };
	isObjectEmpty(value: any): boolean;
	isString(value: any, notEmpty?: boolean): value is string;
	isWorkspaceFolder(value: any): value is WorkspaceFolder;
	pushIfNotExists(arr: any[], item: any): void;
	removeFromArray(arr: any[], item: any): void;
	showMaxTasksReachedMessage(licMgr: any, taskType?: string, force?: boolean): void;
	timeout(ms: number): Promise<void>;
}
