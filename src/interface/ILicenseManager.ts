import { Task, WebviewPanel } from "vscode";

export interface ILicenseManager
{
    checkLicense: (logPad?: string) => Promise<void>;
    dispose: () => void;
    enterLicenseKey: () => Promise<void>;
    getLicenseKey: () => Promise<string | undefined>;
    getMaxNumberOfTasks: (taskType?: string) => number;
    getMaxNumberOfTaskFiles: () => number;
    getVersion: () => string;
    getWebviewPanel: () => WebviewPanel | undefined;
    isBusy: () => boolean;
    isLicensed: () => boolean;
    requestLicense: (logPad: string) => Promise<string | undefined>;
    setLicenseKey: (licenseKey: string | undefined) => Promise<void>;
    setMaxTasksReached: (maxReached: boolean) => void;
    setTasks: (tasks: Task[], logPad?: string) => Promise<void>;
    setTestData(taskCounts: any): void;
}
