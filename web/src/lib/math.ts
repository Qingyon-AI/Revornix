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

const INLINE_MATH_COMMAND_RE = /\\[a-zA-Z]+/;
const INLINE_MATH_OPERATOR_RE = /[_^=+\-*/<>]|\\[,!;:]|[{}]/;
const INLINE_MATH_ALPHA_NUM_RE = /(?:\d+[a-zA-Z]|[a-zA-Z]+\d+)/;
const INLINE_MATH_SINGLE_VAR_RE = /^[a-zA-Z]$/;

const looksLikeInlineMath = (formula: string) => {
	const trimmed = formula.trim();
	if (!trimmed || trimmed !== formula) {
		return false;
	}
	if (INLINE_MATH_COMMAND_RE.test(trimmed)) {
		return true;
	}
	if (INLINE_MATH_OPERATOR_RE.test(trimmed)) {
		return true;
	}
	if (INLINE_MATH_ALPHA_NUM_RE.test(trimmed)) {
		return true;
	}
	if (INLINE_MATH_SINGLE_VAR_RE.test(trimmed)) {
		return true;
	}
	return false;
};

const extractParenInlineMath = (src: string) => {
	if (!src.startsWith('\\(')) {
		return null;
	}

	let index = 2;
	let escaped = false;
	let formula = '';

	while (index < src.length) {
		const char = src[index];
		const next = src[index + 1];

		if (!escaped && char === '\\' && next === ')') {
			if (!formula.trim()) {
				return null;
			}
			return {
				raw: src.slice(0, index + 2),
				formula,
			};
		}

		if (!escaped && char === '\\') {
			escaped = true;
			formula += char;
			index += 1;
			continue;
		}

		escaped = false;
		formula += char;
		index += 1;
	}

	return null;
};

export const extractInlineMath = (src: string) => {
	if (src.startsWith('\\(')) {
		return extractParenInlineMath(src);
	}

	if (!src.startsWith('$') || src.startsWith('$$')) {
		return null;
	}
	if (src.length > 1 && /\s/.test(src[1])) {
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
			if (/\s/.test(formula[formula.length - 1] ?? '')) {
				return null;
			}
			const nextChar = src[index + 1] ?? '';
			if (/\d/.test(nextChar)) {
				return null;
			}
			if (!looksLikeInlineMath(formula)) {
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
	if (src.startsWith('\\[')) {
		const bracketMatch = src.match(/^\\\[\r?\n([\s\S]*?)\r?\n\\\](?:\r?\n|$)/);
		if (!bracketMatch) {
			return null;
		}

		return {
			raw: bracketMatch[0],
			formula: bracketMatch[1].trim(),
		};
	}

	const match = src.match(/^\$\$\r?\n([\s\S]*?)\r?\n\$\$(?:\r?\n|$)/);
	if (!match) {
		return null;
	}

	return {
		raw: match[0],
		formula: match[1].trim(),
	};
};

export const findInlineMathStart = (src: string) => {
	const dollarIndex = src.indexOf('$');
	const parenIndex = src.indexOf('\\(');

	if (dollarIndex === -1) {
		return parenIndex;
	}
	if (parenIndex === -1) {
		return dollarIndex;
	}
	return Math.min(dollarIndex, parenIndex);
};

export const findBlockMathStart = (src: string) => {
	const dollarIndex = src.indexOf('$$');
	const bracketIndex = src.indexOf('\\[');

	if (dollarIndex === -1) {
		return bracketIndex;
	}
	if (bracketIndex === -1) {
		return dollarIndex;
	}
	return Math.min(dollarIndex, bracketIndex);
};
