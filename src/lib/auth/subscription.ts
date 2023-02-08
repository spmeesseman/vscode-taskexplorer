/* eslint-disable @typescript-eslint/naming-convention */
export default {};
//
// import { getDateDifference } from "../../lib/utils/utils";
//
// export const enum SubscriptionPlanId
// {
// 	Free = 0,
// 	Single = 1,
// 	Teams = 2,
// 	Enterprise = 3,
// }
//
// export type FreeSubscriptionPlans = Extract<SubscriptionPlanId, SubscriptionPlanId.Free | SubscriptionPlanId.FreePlus>;
// export type PaidSubscriptionPlans = Exclude<SubscriptionPlanId, SubscriptionPlanId.Free | SubscriptionPlanId.FreePlus>;
// export type RequiredSubscriptionPlans = Exclude<SubscriptionPlanId, SubscriptionPlanId.Free>;
//
//
// export interface Subscription
// {
// 	readonly plan: {
// 		readonly actual: SubscriptionPlan;
// 		readonly effective: SubscriptionPlan;
// 	};
// 	account: SubscriptionAccount | undefined;
// 	previewTrial?: SubscriptionPreviewTrial;
//
// 	state: SubscriptionState;
// }
//
//
// export interface SubscriptionPlan
// {
// 	readonly id: SubscriptionPlanId;
// 	readonly name: string;
// 	readonly startedOn: string;
// 	readonly expiresOn?: string | undefined;
// }
//
//
// export interface SubscriptionAccount
// {
// 	readonly id: string;
// 	readonly name: string;
// 	readonly email: string | undefined;
// 	readonly verified: boolean;
// }
//
// export interface SubscriptionPreviewTrial
// {
// 	readonly startedOn: string;
// 	readonly expiresOn: string;
// }
//
// export const enum SubscriptionState
// {
// 	NotVerified = -1,
// 	Free = 0,
// 	Paid = 1
// }
//
//
// export const computeSubscriptionState = (subscription: Optional<Subscription, "state">): SubscriptionState =>
// {
// 	const {
// 		account,
// 		plan: { actual, effective },
// 		previewTrial: preview,
// 	} = subscription;
//
// 	if (account?.verified === false) return SubscriptionState.VerificationRequired;
//
// 	if (actual.id === effective.id) {
// 		switch (effective.id) {
// 			case SubscriptionPlanId.Free:
// 				return !preview ? SubscriptionState.Free : SubscriptionState.FreePreviewTrialExpired;
//
// 			case SubscriptionPlanId.FreePlus:
// 				return SubscriptionState.FreePlusTrialExpired;
//
// 			case SubscriptionPlanId.Pro:
// 			case SubscriptionPlanId.Teams:
// 			case SubscriptionPlanId.Enterprise:
// 				return SubscriptionState.Paid;
// 		}
// 	}
//
// 	switch (effective.id) {
// 		case SubscriptionPlanId.Free:
// 			return preview == null ? SubscriptionState.Free : SubscriptionState.FreeInPreviewTrial;
//
// 		case SubscriptionPlanId.FreePlus:
// 			return SubscriptionState.FreePlusTrialExpired;
//
// 		case SubscriptionPlanId.Pro:
// 			return actual.id === SubscriptionPlanId.Free
// 				? SubscriptionState.FreeInPreviewTrial
// 				: SubscriptionState.FreePlusInTrial;
//
// 		case SubscriptionPlanId.Teams:
// 		case SubscriptionPlanId.Enterprise:
// 			return SubscriptionState.Paid;
// 	}
// };
//
//
// export const getSubscriptionPlan = (id: SubscriptionPlanId, startedOn?: Date, expiresOn?: Date): SubscriptionPlan =>
// {
// 	return {
// 		id,
// 		name: getSubscriptionPlanName(id),
// 		startedOn: (startedOn ?? new Date()).toISOString(),
// 		expiresOn: expiresOn ? expiresOn.toISOString() : undefined,
// 	};
// };
//
//
// export const getSubscriptionTimeRemaining = (subscription: Optional<Subscription, "state">, unit?: "days" | "hours" | "minutes" | "seconds") =>
// {
// 	return getTimeRemaining(subscription.plan.effective.expiresOn, unit);
// };
//
//
// export const getTimeRemaining = (expiresOn: string | undefined, unit?: "days" | "hours" | "minutes" | "seconds") =>
// {
// 	return expiresOn ? getDateDifference(Date.now(), new Date(expiresOn), unit) : undefined;
// };
//
//
// export const isSubscriptionPaid = (subscription: Optional<Subscription, "state">) =>
// {
// 	return isSubscriptionPaidPlan(subscription.plan.effective.id);
// };
//
//
// export const isSubscriptionPaidPlan = (id: SubscriptionPlanId): id is PaidSubscriptionPlans =>
// {
// 	return id !== SubscriptionPlanId.Free && id !== SubscriptionPlanId.FreePlus;
// };
//
//
// export const isSubscriptionExpired = (subscription: Optional<Subscription, "state">) =>
// {
// 	const remaining = getSubscriptionTimeRemaining(subscription);
// 	return !!remaining && remaining <= 0;
// };
//
//
// export const isSubscriptionTrial = (subscription: Optional<Subscription, "state">) =>
// {
// 	return subscription.plan.actual.id !== subscription.plan.effective.id;
// };
//
//
// export const isSubscriptionPreviewTrialExpired = (subscription: Optional<Subscription, "state">) =>
// {
// 	const remaining = getTimeRemaining(subscription.previewTrial?.expiresOn);
// 	return !!remaining ? remaining <= 0 : undefined;
// };
//