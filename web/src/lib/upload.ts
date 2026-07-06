const MB = 1024 * 1024;

// Document (`files/` prefix) upload size caps are tier-based and enforced by the
// API. The frontend does not hardcode the per-tier values — it reads the current
// user's limit at runtime via `useDocumentUploadLimits` so there is no drift with
// the backend config. Images/attachments keep a fixed client cap.
export const IMAGE_MAX_UPLOAD_BYTES = 10 * MB;

// The API answers over-limit uploads (both direct and presign-time) with HTTP
// 413, so a failed upload can be recognised as "too large" regardless of which
// storage backend rejected it.
export const UPLOAD_TOO_LARGE_CODE = 413;

export const isUploadTooLargeError = (error: unknown): boolean =>
	typeof error === 'object' &&
	error !== null &&
	(error as { code?: number }).code === UPLOAD_TOO_LARGE_CODE;

export const getUploadErrorMessage = (error: unknown): string | undefined => {
	if (error instanceof Error) return error.message;
	if (typeof error === 'object' && error !== null) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === 'string') return message;
	}
	return undefined;
};

export const formatUploadSize = (bytes: number) => {
	const mb = bytes / 1024 / 1024;
	return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(1)}MB`;
};

export const formatHumanFileSize = (bytes: number) => {
	if (!Number.isFinite(bytes) || bytes < 0) return '—';
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
	const mb = kb / 1024;
	if (mb < 1024) return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
	const gb = mb / 1024;
	return `${gb.toFixed(gb < 10 ? 2 : 1)} GB`;
};
