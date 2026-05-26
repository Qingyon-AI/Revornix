const base64UrlToArrayBuffer = (value: string): ArrayBuffer => {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalized.padEnd(
		normalized.length + ((4 - (normalized.length % 4)) % 4),
		'=',
	);
	const binary = window.atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
};

const arrayBufferToBase64Url = (value: ArrayBuffer | null | undefined): string | null => {
	if (!value) return null;
	const bytes = new Uint8Array(value);
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

const prepareCredentialDescriptor = (item: any) => ({
	...item,
	id: base64UrlToArrayBuffer(item.id),
});

export const createPasskeyCredential = async (rawOptions: Record<string, any>) => {
	if (!window.PublicKeyCredential) {
		throw new Error('Passkeys are not supported by this browser');
	}
	const publicKey = {
		...rawOptions,
		challenge: base64UrlToArrayBuffer(rawOptions.challenge),
		user: {
			...rawOptions.user,
			id: base64UrlToArrayBuffer(rawOptions.user.id),
		},
		excludeCredentials: rawOptions.excludeCredentials?.map(prepareCredentialDescriptor),
	} as PublicKeyCredentialCreationOptions;
	const credential = await navigator.credentials.create({ publicKey });
	if (!credential) {
		throw new Error('Passkey registration was cancelled');
	}
	return serializePublicKeyCredential(credential as PublicKeyCredential);
};

export const getPasskeyCredential = async (rawOptions: Record<string, any>) => {
	if (!window.PublicKeyCredential) {
		throw new Error('Passkeys are not supported by this browser');
	}
	const publicKey: PublicKeyCredentialRequestOptions = {
		...rawOptions,
		challenge: base64UrlToArrayBuffer(rawOptions.challenge),
		allowCredentials: rawOptions.allowCredentials?.map(prepareCredentialDescriptor),
	};
	const credential = await navigator.credentials.get({ publicKey });
	if (!credential) {
		throw new Error('Passkey authentication was cancelled');
	}
	return serializePublicKeyCredential(credential as PublicKeyCredential);
};

export const serializePublicKeyCredential = (credential: PublicKeyCredential) => {
	const response = credential.response as AuthenticatorAttestationResponse &
		AuthenticatorAssertionResponse;

	return {
		id: credential.id,
		rawId: arrayBufferToBase64Url(credential.rawId),
		type: credential.type,
		authenticatorAttachment: credential.authenticatorAttachment,
		clientExtensionResults: credential.getClientExtensionResults(),
		response: {
			clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
			attestationObject:
				'attestationObject' in response
					? arrayBufferToBase64Url(response.attestationObject)
					: undefined,
			authenticatorData:
				'authenticatorData' in response
					? arrayBufferToBase64Url(response.authenticatorData)
					: undefined,
			signature:
				'signature' in response
					? arrayBufferToBase64Url(response.signature)
					: undefined,
			userHandle:
				'userHandle' in response
					? arrayBufferToBase64Url(response.userHandle)
					: undefined,
			transports:
				'getTransports' in response ? response.getTransports() : undefined,
		},
	};
};
