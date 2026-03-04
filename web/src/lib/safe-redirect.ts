export const getSafeRedirectPage = (rawRedirectPage: string | null) => {
	if (!rawRedirectPage) {
		return '/dashboard';
	}

	const redirectPage = rawRedirectPage.trim();
	if (!redirectPage || !redirectPage.startsWith('/') || redirectPage.startsWith('//')) {
		return '/dashboard';
	}

	const pathname = redirectPage.split('#')[0].split('?')[0] || '/';
	const normalizedPathname =
		pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;

	if (
		normalizedPathname === '/' ||
		normalizedPathname === '/login' ||
		normalizedPathname === '/register'
	) {
		return '/dashboard';
	}

	return redirectPage;
};
