
import log from "./log/log";
import { configuration } from "./utils/configuration";
import { env, MessageItem, Uri, window } from "vscode";
import { IDictionary } from "../interface";


const showMessage = async(type: "info" | "warn" | "error", message: string, suppressionKey?: string, doNotShowAgain: MessageItem | null = { title: "Don't Show Again" }, ...actions: MessageItem[]): Promise<MessageItem | undefined> =>
{
	log.write(`ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(doNotShowAgain)})`);

	if (suppressionKey && configuration.get(`advanced.messages.${suppressionKey}` as const)) {
		log.write(`ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(doNotShowAgain)}) skipped`);
		return undefined;
	}

	if (suppressionKey && doNotShowAgain) {
		actions.push(doNotShowAgain);
	}

	let result: MessageItem | undefined;
	switch (type) {
		case "info":
			result = await window.showInformationMessage(message, ...actions);
			break;

		case "warn":
			result = await window.showWarningMessage(message, ...actions);
			break;

		case "error":
			result = await window.showErrorMessage(message, ...actions);
			break;
	}

	if (suppressionKey && (!doNotShowAgain || result === doNotShowAgain)) {
		log.write(
			`ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(
				doNotShowAgain,
			)}) don't show again requested`,
		);
		await suppressedMessage(suppressionKey);
		if (result === doNotShowAgain) return undefined;
	}

	log.write(
		`ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(doNotShowAgain)}) returned ${
			result ? result.title : result
		}`,
	);

	return result;
};


export const showWhatsNewMessage = async(version: string) =>
{
	const whatsnew = { title: "See What's New" };
	const result = await showMessage(
		"info",
		`Task Explorer ${version} — check out what's new!`,
		undefined,
		null,
		whatsnew,
	);

	if (result === whatsnew) {
		void (await env.openExternal(Uri.parse("https://app.spmeesseman.com/taskexplorer/help/")));
	}
};


const suppressedMessage = (suppressionKey: string) =>
{
	const messages = { ...configuration.get<IDictionary<boolean>>("advanced.messages") };

	messages[suppressionKey] = true;

	for (const [ key, value ] of Object.entries(messages)) {
		if (value !== true) {
			delete messages[key as keyof typeof messages];
		}
	}

	return configuration.update("advanced.messages", messages);
};
