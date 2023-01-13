import { Task, WebviewPanel } from "vscode";

export interface ILicenseManager
{
    checkLicense: (logPad?: string) => Promise<void>;
    dispose: () => void;
    enterLicenseKey: () => Promise<void>;
    getLicenseKey: () => string | undefined;
    getMaxNumberOfTasks: (taskType?: string) => number;
    getMaxNumberOfTaskFiles: () => number;
    getVersion: () => string;
    getWebviewPanel: () => WebviewPanel | undefined;
    isLicensed: () => boolean;
    setLicenseKey: (licenseKey: string | undefined) => Promise<void>;
    setTasks: (tasks: Task[], logPad?: string) => Promise<void>;
}
