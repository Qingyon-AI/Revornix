import type { AuthResponse } from '@/service/user';

export const isMfaRequired = (response: AuthResponse | null | undefined) =>
	Boolean(response?.mfa_required && response.challenge_id);

export const hasAuthTokens = (
	response: AuthResponse | null | undefined,
): response is AuthResponse & {
	access_token: string;
	refresh_token: string;
	expires_in: number;
} =>
	Boolean(response?.access_token && response.refresh_token && response.expires_in);

export const buildMfaLoginPath = (
	challengeId: string,
	redirectTo: string,
	methods?: string[] | null,
) => {
	const searchParams = new URLSearchParams({
		challenge_id: challengeId,
		redirect_to: redirectTo,
	});
	if (methods?.length) {
		searchParams.set('methods', methods.join(','));
	}
	return `/login/mfa?${searchParams.toString()}`;
};
