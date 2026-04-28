import { v4 as uuidv4 } from 'uuid';

export const generateUUID = (): string => {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return uuidv4();
};
