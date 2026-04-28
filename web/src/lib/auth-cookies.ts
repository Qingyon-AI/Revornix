import Cookies from 'js-cookie';

const ACCESS_TOKEN_EXPIRES_DAYS = 7;
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

const isHttps = () =>
	typeof window !== 'undefined' && window.location.protocol === 'https:';

const baseOptions = (): Cookies.CookieAttributes => ({
	path: '/',
	sameSite: 'lax',
	secure: isHttps(),
});

export const setAuthCookies = (tokens: {
	access_token: string;
	refresh_token: string;
}) => {
	Cookies.set('access_token', tokens.access_token, {
		...baseOptions(),
		expires: ACCESS_TOKEN_EXPIRES_DAYS,
	});
	Cookies.set('refresh_token', tokens.refresh_token, {
		...baseOptions(),
		expires: REFRESH_TOKEN_EXPIRES_DAYS,
	});
};

export const clearAuthCookies = () => {
	Cookies.remove('access_token', { path: '/' });
	Cookies.remove('refresh_token', { path: '/' });
};
