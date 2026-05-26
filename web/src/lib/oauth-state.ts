/**
 * OAuth `state` parameter helpers — anti-CSRF, plus carrying the post-login
 * redirect target.
 *
 * Why: without a verified state nonce, an attacker who holds their own
 * authorization code from Google/GitHub/WeChat can plant a callback URL into
 * the victim's browser and complete the OAuth dance under the victim's
 * session, either signing the victim into the attacker's identity
 * (login-CSRF) or binding the attacker's third-party account to the
 * victim's Revornix account (bind-CSRF). The `state` parameter is the
 * standard defense and providers will round-trip it verbatim.
 *
 * Encoding: URL-safe base64 of JSON({ r: redirect, n: nonce }). Keeps the
 * format compact, opaque to the provider, and forward-compatible (we can
 * add fields later).
 *
 * Storage of the expected nonce: `sessionStorage` on the initiating tab.
 * Trade-off — multi-tab OAuth (start in tab A, finish in tab B) breaks,
 * but the OAuth round trip almost always stays in the original tab. The
 * alternative (httpOnly cookie via a backend round trip) was rejected to
 * keep the flow purely client-side.
 */

import { getSafeRedirectPage } from './safe-redirect';

const STORAGE_KEY = 'oauth_state_nonce';
const NONCE_BYTES = 16;

const generateNonce = (): string => {
	const buf = new Uint8Array(NONCE_BYTES);
	if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
		window.crypto.getRandomValues(buf);
	} else {
		// SSR fallback — should never actually run on the server because all
		// OAuth init points are 'use client', but be safe.
		for (let i = 0; i < buf.length; i += 1) {
			buf[i] = Math.floor(Math.random() * 256);
		}
	}
	return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
};

const toBase64Url = (raw: string): string => {
	if (typeof window === 'undefined') {
		return Buffer.from(raw, 'utf-8')
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/g, '');
	}
	// Browsers: encode UTF-8 → base64 → url-safe.
	const bytes = new TextEncoder().encode(raw);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return window
		.btoa(binary)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
};

const fromBase64Url = (encoded: string): string => {
	const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
	const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
	if (typeof window === 'undefined') {
		return Buffer.from(padded + padding, 'base64').toString('utf-8');
	}
	const binary = window.atob(padded + padding);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
};

/**
 * Build a fresh state value for an OAuth init URL. Generates and stashes
 * the expected nonce; the callback page MUST use `consumeOAuthState` to
 * verify it before trusting the OAuth `code`.
 */
export const beginOAuthState = (redirectPage: string | null): string => {
	const nonce = generateNonce();
	if (typeof window !== 'undefined') {
		try {
			window.sessionStorage.setItem(STORAGE_KEY, nonce);
		} catch {
			// Storage disabled (e.g. private mode quota) — proceed without
			// nonce binding. We still send it, but consume will fail; users
			// in this state should re-enable storage to sign in via OAuth.
		}
	}
	const payload = JSON.stringify({
		r: getSafeRedirectPage(redirectPage),
		n: nonce,
	});
	return toBase64Url(payload);
};

export type ConsumedOAuthState = {
	redirect: string;
	ok: boolean;
};

/**
 * Verify the `state` parameter from an OAuth callback. Always returns the
 * resolved (safe) redirect target so the page can navigate the user back
 * to a sensible place even on failure. `ok` is true only when the embedded
 * nonce matches the one stashed by `beginOAuthState` on this tab.
 */
export const consumeOAuthState = (rawState: string | null): ConsumedOAuthState => {
	const fallback: ConsumedOAuthState = { redirect: '/dashboard', ok: false };
	if (!rawState) {
		return fallback;
	}

	let payload: { r?: unknown; n?: unknown };
	try {
		payload = JSON.parse(fromBase64Url(rawState));
	} catch {
		// Legacy format (plain url-encoded redirect path) — refuse to treat
		// it as verified, but recover the redirect target so the page can
		// bounce the user somewhere sensible.
		try {
			return {
				redirect: getSafeRedirectPage(decodeURIComponent(rawState)),
				ok: false,
			};
		} catch {
			return fallback;
		}
	}

	const redirect = getSafeRedirectPage(
		typeof payload.r === 'string' ? payload.r : null
	);

	let expected: string | null = null;
	if (typeof window !== 'undefined') {
		try {
			expected = window.sessionStorage.getItem(STORAGE_KEY);
			window.sessionStorage.removeItem(STORAGE_KEY);
		} catch {
			expected = null;
		}
	}

	const received = typeof payload.n === 'string' ? payload.n : null;
	if (!received || !expected || received !== expected) {
		return { redirect, ok: false };
	}
	return { redirect, ok: true };
};
