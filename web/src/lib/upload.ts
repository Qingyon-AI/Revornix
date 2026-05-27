export const FILE_DOCUMENT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const IMAGE_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
// Inline attachments inside the markdown editor share the API-side
// `files/` prefix size cap (currently 10MB).
export const FILE_ATTACHMENT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

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
