'use client';

import { Fragment, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface HighlightedTextProps {
	text: string;
	query: string;
	className?: string;
	highlightClassName?: string;
}

const escapeRegex = (input: string) =>
	input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tokenize = (query: string) => {
	const trimmed = query.trim();
	if (!trimmed) return [] as string[];
	const tokens = trimmed
		.split(/\s+/)
		.map((tok) => tok.trim())
		.filter((tok) => tok.length > 0);
	// Deduplicate while preserving order; longer tokens first so the regex
	// alternation matches greedy multi-char hits before sub-strings.
	const seen = new Set<string>();
	const unique: string[] = [];
	for (const tok of tokens) {
		const lower = tok.toLowerCase();
		if (seen.has(lower)) continue;
		seen.add(lower);
		unique.push(tok);
	}
	unique.sort((a, b) => b.length - a.length);
	return unique;
};

/**
 * Pull a window of `text` around the first occurrence of any query token,
 * so a single-line truncated container still shows the matched span. When no
 * token matches the text (e.g. semantic-only hits in vector mode), falls back
 * to a leading slice.
 */
export const buildSnippet = (text: string, query: string, max = 160): string => {
	if (!text) return '';
	const cleaned = text.replace(/\s+/g, ' ').trim();
	if (cleaned.length <= max) return cleaned;
	const tokens = tokenize(query);
	if (tokens.length === 0) return cleaned.slice(0, max).trimEnd() + '…';
	const lower = cleaned.toLowerCase();
	let firstHit = -1;
	for (const tok of tokens) {
		const idx = lower.indexOf(tok.toLowerCase());
		if (idx >= 0 && (firstHit === -1 || idx < firstHit)) firstHit = idx;
	}
	if (firstHit < 0) return cleaned.slice(0, max).trimEnd() + '…';
	const halfWindow = Math.floor(max / 2);
	const start = Math.max(0, firstHit - halfWindow);
	const end = Math.min(cleaned.length, start + max);
	const prefix = start > 0 ? '…' : '';
	const suffix = end < cleaned.length ? '…' : '';
	return prefix + cleaned.slice(start, end).trim() + suffix;
};

export const HighlightedText = ({
	text,
	query,
	className,
	highlightClassName,
}: HighlightedTextProps) => {
	const tokens = useMemo(() => tokenize(query), [query]);

	const segments = useMemo(() => {
		if (!text) return [] as Array<{ text: string; match: boolean }>;
		if (tokens.length === 0) return [{ text, match: false }];
		const pattern = new RegExp(`(${tokens.map(escapeRegex).join('|')})`, 'gi');
		const tokenSet = new Set(tokens.map((t) => t.toLowerCase()));
		// String.split with a capture-grouped regex returns alternating
		// non-match / match segments. We classify each segment by checking the
		// lowercased value against the original token set.
		return text
			.split(pattern)
			.filter((part) => part.length > 0)
			.map((part) => ({
				text: part,
				match: tokenSet.has(part.toLowerCase()),
			}));
	}, [text, tokens]);

	if (!text) return null;

	return (
		<span className={className}>
			{segments.map((segment, index) => (
				<Fragment key={index}>
					{segment.match ? (
						<mark
							className={cn(
								'bg-transparent font-semibold text-primary',
								highlightClassName,
							)}>
							{segment.text}
						</mark>
					) : (
						segment.text
					)}
				</Fragment>
			))}
		</span>
	);
};

export default HighlightedText;
