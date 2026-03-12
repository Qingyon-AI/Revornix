import type { PrivateUserInfo } from '@/generated';

export type RequiredUserSettingField =
	| 'default_user_file_system'
	| 'default_document_reader_model_id'
	| 'default_revornix_model_id'
	| 'default_website_document_parse_user_engine_id'
	| 'default_file_document_parse_user_engine_id';

export type RequiredUserSettingSpec = {
	field: RequiredUserSettingField;
	href: string;
	labelKey: string;
};

export const REQUIRED_USER_SETTING_SPECS: RequiredUserSettingSpec[] = [
	{
		field: 'default_user_file_system',
		href: '/setting#default_user_file_system_change',
		labelKey: 'init_setting_default_file_system',
	},
	{
		field: 'default_document_reader_model_id',
		href: '/setting#default_document_summary_model_choose',
		labelKey: 'init_setting_document_summary_model',
	},
	{
		field: 'default_revornix_model_id',
		href: '/setting#default_revornix_ai_model_choose',
		labelKey: 'init_setting_revornix_ai_model',
	},
	{
		field: 'default_website_document_parse_user_engine_id',
		href: '/setting#default_website_markdown_parse_user_engine_choose',
		labelKey: 'init_setting_website_convert_engine',
	},
	{
		field: 'default_file_document_parse_user_engine_id',
		href: '/setting#default_file_markdown_parse_user_engine_choose',
		labelKey: 'init_setting_file_convert_engine',
	},
];

export const getRequiredUserSettings = (user?: PrivateUserInfo) => {
	return REQUIRED_USER_SETTING_SPECS.map((setting) => ({
		...setting,
		completed: Boolean(user?.[setting.field]),
	}));
};

export const hasPendingRequiredUserSettings = (user?: PrivateUserInfo) => {
	return getRequiredUserSettings(user).some((setting) => !setting.completed);
};

export const hasCompletedRequiredUserSettings = (user?: PrivateUserInfo) => {
	return getRequiredUserSettings(user).every((setting) => setting.completed);
};
