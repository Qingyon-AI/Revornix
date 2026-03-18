import { AccessPlanLevel, Plan } from '@/enums/product';
import { UserRole } from '@/enums/user';
import type { PrivateUserInfo } from '@/generated';
import type { UserResponseDTO } from '@/generated-pay';

export const normalizePlanLevel = (value?: number | null) => {
	if (value === AccessPlanLevel.MAX) {
		return AccessPlanLevel.MAX;
	}
	if (value === AccessPlanLevel.PRO) {
		return AccessPlanLevel.PRO;
	}
	return AccessPlanLevel.FREE;
};

export const getUserPlanLevel = (paySystemUserInfo?: UserResponseDTO) => {
	if (!paySystemUserInfo?.userPlan?.expireTime) {
		return AccessPlanLevel.FREE;
	}
	if (new Date(paySystemUserInfo.userPlan.expireTime).getTime() <= Date.now()) {
		return AccessPlanLevel.FREE;
	}
	const productUuid = paySystemUserInfo?.userPlan?.plan?.product?.uuid;
	if (productUuid === Plan.MAX) {
		return AccessPlanLevel.MAX;
	}
	if (productUuid === Plan.PRO) {
		return AccessPlanLevel.PRO;
	}
	return AccessPlanLevel.FREE;
};

export const isPrivilegedUser = (mainUserInfo?: PrivateUserInfo) => {
	return (
		mainUserInfo?.role === UserRole.ROOT || mainUserInfo?.role === UserRole.ADMIN
	);
};

export const isOwnedByCurrentUser = (
	creatorId?: number | null,
	mainUserInfo?: PrivateUserInfo,
) =>
	creatorId != null &&
	mainUserInfo?.id != null &&
	creatorId === mainUserInfo.id;

export const hasPaidPlan = (paySystemUserInfo?: UserResponseDTO) => {
	const productUuid = paySystemUserInfo?.userPlan?.plan?.product?.uuid;
	return Boolean(productUuid && productUuid !== Plan.FREE);
};

export const hasActivePaidPlan = (paySystemUserInfo?: UserResponseDTO) => {
	if (!hasPaidPlan(paySystemUserInfo)) {
		return false;
	}
	const expireTime = paySystemUserInfo?.userPlan?.expireTime;
	if (!expireTime) {
		return false;
	}
	return new Date(expireTime).getTime() > Date.now();
};

export const hasPlanLevelAccess = (
	requiredPlanLevel?: number | null,
	paySystemUserInfo?: UserResponseDTO,
	mainUserInfo?: PrivateUserInfo,
) =>
	isPrivilegedUser(mainUserInfo) ||
	getUserPlanLevel(paySystemUserInfo) >=
	normalizePlanLevel(requiredPlanLevel ?? AccessPlanLevel.FREE);

export const isSubscriptionLocked = (
	requiredPlanLevel?: number | null,
	paySystemUserInfo?: UserResponseDTO,
	mainUserInfo?: PrivateUserInfo,
) => !hasPlanLevelAccess(requiredPlanLevel, paySystemUserInfo, mainUserInfo);

export const hasModelPlanLevelAccess = (
	requiredPlanLevel?: number | null,
	creatorId?: number | null,
	paySystemUserInfo?: UserResponseDTO,
	mainUserInfo?: PrivateUserInfo,
) =>
	isOwnedByCurrentUser(creatorId, mainUserInfo) ||
	hasPlanLevelAccess(requiredPlanLevel, paySystemUserInfo, mainUserInfo);

export const isModelSubscriptionLocked = (
	requiredPlanLevel?: number | null,
	creatorId?: number | null,
	paySystemUserInfo?: UserResponseDTO,
	mainUserInfo?: PrivateUserInfo,
) =>
	!hasModelPlanLevelAccess(
		requiredPlanLevel,
		creatorId,
		paySystemUserInfo,
		mainUserInfo,
	);

export const getPlanLevelTranslationKey = (requiredPlanLevel?: number | null) => {
	switch (normalizePlanLevel(requiredPlanLevel)) {
		case AccessPlanLevel.MAX:
			return 'setting_required_plan_level_max';
		case AccessPlanLevel.PRO:
			return 'setting_required_plan_level_pro';
		default:
			return 'setting_required_plan_level_free';
	}
};

export const shouldShowPlanLevelIndicator = (
	requiredPlanLevel?: number | null,
	mainUserInfo?: PrivateUserInfo,
) =>
	!isPrivilegedUser(mainUserInfo) &&
	normalizePlanLevel(requiredPlanLevel ?? AccessPlanLevel.FREE) >
		AccessPlanLevel.FREE;

export const getSubscriptionCtaTranslationKey = (
	paySystemUserInfo?: UserResponseDTO,
	requiredPlanLevel?: number | null,
) => {
	if (hasPaidPlan(paySystemUserInfo) && !hasActivePaidPlan(paySystemUserInfo)) {
		return 'account_plan_go_to_renew';
	}
	const userPlanLevel = getUserPlanLevel(paySystemUserInfo);
	const normalizedRequiredPlanLevel = normalizePlanLevel(requiredPlanLevel);
	if (userPlanLevel === AccessPlanLevel.FREE) {
		return 'account_plan_go_to_subscribe';
	}
	if (normalizedRequiredPlanLevel > userPlanLevel) {
		return 'account_plan_go_to_upgrade';
	}
	return 'account_plan_go_to_renew';
};

export const getSubscriptionLockReasonTranslationKey = (
	paySystemUserInfo?: UserResponseDTO,
	requiredPlanLevel?: number | null,
) => {
	if (hasPaidPlan(paySystemUserInfo) && !hasActivePaidPlan(paySystemUserInfo)) {
		return 'setting_subscription_locked_reason_expired';
	}
	const userPlanLevel = getUserPlanLevel(paySystemUserInfo);
	const normalizedRequiredPlanLevel = normalizePlanLevel(requiredPlanLevel);
	if (userPlanLevel === AccessPlanLevel.FREE) {
		return 'setting_subscription_locked_reason_subscription_required';
	}
	if (normalizedRequiredPlanLevel > userPlanLevel) {
		return 'setting_subscription_locked_reason_upgrade_required';
	}
	return 'setting_subscription_locked_reason_renew_required';
};
