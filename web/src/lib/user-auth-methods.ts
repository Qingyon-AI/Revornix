import type { PrivateUserInfo } from '@/generated';

export const countUserLoginMethods = (user?: PrivateUserInfo) => {
	if (!user) return 0;
	return [
		Boolean(user.email_info),
		Boolean(user.phone_info),
		Boolean(user.github_info),
		Boolean(user.google_info),
		(user.wechat_infos?.length ?? 0) > 0,
	].filter(Boolean).length;
};

export const isLastLoginMethod = (user?: PrivateUserInfo) =>
	countUserLoginMethods(user) <= 1;
