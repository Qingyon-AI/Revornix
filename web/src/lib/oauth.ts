const normalizePublicBaseUrl = (rawValue?: string | null) => {
	if (!rawValue) {
		return null;
	}

	const trimmedValue = rawValue.trim();
	if (!trimmedValue) {
		return null;
	}

	try {
		const parsedUrl = new URL(trimmedValue);
		const normalizedPathname =
			parsedUrl.pathname === '/'
				? ''
				: parsedUrl.pathname.replace(/\/+$/, '');
		return `${parsedUrl.origin}${normalizedPathname}`;
	} catch (error) {
		console.error('[OAuth] Invalid NEXT_PUBLIC_HOST:', trimmedValue, error);
		return null;
	}
};

const getPublicBaseUrl = () => {
	const configuredBaseUrl = normalizePublicBaseUrl(process.env.NEXT_PUBLIC_HOST);
	if (configuredBaseUrl) {
		return configuredBaseUrl;
	}

	if (typeof window !== 'undefined') {
		return window.location.origin;
	}

	return 'http://localhost:3000';
};

const withLeadingSlash = (path: string) => (path.startsWith('/') ? path : `/${path}`);

export const buildPublicAppUrl = (path: string) => {
	return `${getPublicBaseUrl()}${withLeadingSlash(path)}`;
};

export const buildOAuthCallbackUrl = (
	provider: 'google' | 'github',
	action: 'create' | 'bind'
) => {
	return buildPublicAppUrl(`/integrations/${provider}/oauth2/${action}/callback`);
};

export const buildWechatCallbackUrl = (action: 'create' | 'bind') => {
	return buildPublicAppUrl(`/integrations/wechat/oauth/${action}/callback`);
};
