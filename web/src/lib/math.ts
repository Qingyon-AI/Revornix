export const renderKatexFormula = async () => {};

export const decodeMathFormula = (value: string | null) => {
	if (!value) {
		return '';
	}

	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

export const encodeMathFormula = (value: string) => encodeURIComponent(value);

export const extractInlineMath = (src: string) => {
	if (!src.startsWith('$') || src.startsWith('$$')) {
		return null;
	}

	let index = 1;
	let escaped = false;
	let formula = '';

	while (index < src.length) {
		const char = src[index];

		if (!escaped && char === '\\') {
			escaped = true;
			formula += char;
			index += 1;
			continue;
		}

		if (!escaped && char === '$') {
			if (!formula.trim()) {
				return null;
			}

			return {
				raw: src.slice(0, index + 1),
				formula,
			};
		}

		escaped = false;
		formula += char;
		index += 1;
	}

	return null;
};

export const extractBlockMath = (src: string) => {
	const match = src.match(/^\$\$([\s\S]*?)\$\$(?:\n|$)/);
	if (!match) {
		return null;
	}

	return {
		raw: match[0],
		formula: match[1].trim(),
	};
};
