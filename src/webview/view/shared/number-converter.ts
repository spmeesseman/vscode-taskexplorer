
import type { ValueConverter } from "@microsoft/fast-element";

export const numberConverter: ValueConverter =
{
	toView: (value: number): string =>
	{
		return value.toString();
	},
	fromView: (value: string): number =>
	{
		return parseInt(value, 10);
	}
};
