export const getSafeRedirectPage = (rawRedirectPage: string | null) => {
	if (!rawRedirectPage) {
		return '/dashboard';
	}

	const redirectPage = rawRedirectPage.trim();
	if (!redirectPage.startsWith('/') || redirectPage.startsWith('//')) {
		return '/dashboard';
	}
	if (
		redirectPage === '/login' ||
		redirectPage === '/login/' ||
		redirectPage === '/register' ||
		redirectPage === '/register/'
	) {
		return '/dashboard';
	}

	return redirectPage;
};
