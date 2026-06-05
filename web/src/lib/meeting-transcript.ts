export type MeetingTranscriptEntry = {
	speaker: string;
	rawSpeaker: string;
	displaySpeaker: string;
	timestamp: string;
	startSeconds: number;
	text: string;
};

export type MeetingSpeakerOption = {
	rawSpeaker: string;
	displaySpeaker: string;
	count: number;
};

export type MeetingInsights = {
	overview: string[];
	actionItems: MeetingTranscriptEntry[];
	decisions: MeetingTranscriptEntry[];
};

export const normalizeSpeakerMap = (value: unknown): Record<string, string> => {
	if (!value) return {};
	if (typeof value === 'string') {
		try {
			return normalizeSpeakerMap(JSON.parse(value));
		} catch {
			return {};
		}
	}
	if (typeof value !== 'object') return {};
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.filter(
				(entry): entry is [string, string] =>
					typeof entry[1] === 'string',
			)
			.map(([key, mapValue]) => [key, mapValue.trim() || key]),
	);
};

const resolveRawSpeaker = (
	speaker: string,
	speakerMap: Record<string, string>,
) => {
	const mappedEntry = Object.entries(speakerMap).find(
		([, displaySpeaker]) => displaySpeaker === speaker,
	);
	return mappedEntry?.[0] ?? speaker;
};

export const parseMeetingTimestamp = (timestamp: string) => {
	const parts = timestamp.split(':').map(Number);
	if (parts.length === 2) {
		const [minutes, seconds] = parts;
		return minutes * 60 + seconds;
	}
	if (parts.length === 3) {
		const [hours, minutes, seconds] = parts;
		return hours * 3600 + minutes * 60 + seconds;
	}
	return 0;
};

export const parseMeetingTranscript = (
	markdown: string,
	speakerMap: Record<string, string>,
): MeetingTranscriptEntry[] => {
	const entries: MeetingTranscriptEntry[] = [];
	const timestampPattern = '(?:\\d{2}:)?\\d{2}:\\d{2}(?:\\.\\d{1,3})?';
	const segmentPattern =
		new RegExp(
			`^\\*\\*(.+?)\\*\\* \`(${timestampPattern})\`\\s*\\n+([\\s\\S]*?)(?=\\n+\\*\\*.+?\\*\\* \`${timestampPattern}\`\\s*\\n+|\\s*$)`,
			'gm',
		);
	for (const match of markdown.matchAll(segmentPattern)) {
		const speaker = match[1]?.trim();
		const timestamp = match[2]?.trim();
		const text = match[3]?.trim();
		if (!speaker || !timestamp || !text) continue;
		const rawSpeaker = resolveRawSpeaker(speaker, speakerMap);
		entries.push({
			speaker,
			rawSpeaker,
			displaySpeaker: speakerMap[rawSpeaker] ?? speaker,
			timestamp,
			startSeconds: parseMeetingTimestamp(timestamp),
			text,
		});
	}
	return entries;
};

export const formatMeetingDuration = (seconds: number) => {
	const safeSeconds = Math.max(0, Math.floor(seconds));
	const minutes = Math.floor(safeSeconds / 60);
	const remainingSeconds = safeSeconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const buildMeetingSpeakers = (
	entries: MeetingTranscriptEntry[],
): MeetingSpeakerOption[] => {
	const speakerMap = new Map<string, MeetingSpeakerOption>();
	for (const entry of entries) {
		const current = speakerMap.get(entry.rawSpeaker);
		if (current) {
			current.count += 1;
			current.displaySpeaker = entry.displaySpeaker;
		} else {
			speakerMap.set(entry.rawSpeaker, {
				rawSpeaker: entry.rawSpeaker,
				displaySpeaker: entry.displaySpeaker,
				count: 1,
			});
		}
	}
	return Array.from(speakerMap.values());
};

export const createMeetingInsights = (
	entries: MeetingTranscriptEntry[],
): MeetingInsights => {
	if (entries.length === 0) {
		return {
			overview: [],
			actionItems: [],
			decisions: [],
		};
	}

	const speakerCount = new Set(entries.map((entry) => entry.rawSpeaker)).size;
	const duration = formatMeetingDuration(entries.at(-1)?.startSeconds ?? 0);
	const meaningfulEntries = entries.filter((entry) => entry.text.length >= 6);
	const actionPattern =
		/(待办|行动|负责|需要|请|安排|跟进|下次|截止|deadline|action|todo|follow up|assign|will|need to)/i;
	const decisionPattern =
		/(决定|确定|结论|同意|通过|确认|定下来|决议|approved|decided|decision|agreed)/i;

	return {
		overview: [
			`共 ${entries.length} 段，${speakerCount} 位说话人，记录到 ${duration}`,
			...meaningfulEntries.slice(0, 2).map((entry) => entry.text),
		],
		actionItems: entries
			.filter((entry) => actionPattern.test(entry.text))
			.slice(0, 5),
		decisions: entries
			.filter((entry) => decisionPattern.test(entry.text))
			.slice(0, 5),
	};
};
