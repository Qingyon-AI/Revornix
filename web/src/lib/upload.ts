export const FILE_DOCUMENT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const formatUploadSize = (bytes: number) => {
	const mb = bytes / 1024 / 1024;
	return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(1)}MB`;
};
