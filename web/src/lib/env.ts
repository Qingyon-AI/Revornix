const TRUTHY_ENV_VALUES = new Set(['1', 'true', 'yes', 'on', 'y']);

export function isEnvEnabled(value?: string | null) {
	return TRUTHY_ENV_VALUES.has((value ?? '').trim().toLowerCase());
}
