import { replacePath } from '@/lib/utils';

type SectionCoverSource = {
	cover?: string | null;
	creator?: {
		id?: number;
	} | null;
	is_day_section?: boolean | null;
	day_section_date?: string | null;
	title?: string | null;
};

const svgToDataUri = (svg: string) => {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const extractDateLabel = ({
	dateValue,
	title,
}: {
	dateValue?: string | null;
	title?: string | null;
}) => {
	if (dateValue) {
		return dateValue;
	}

	const titleMatch = title?.match(/\b(\d{4}-\d{2}-\d{2})\b/);
	if (titleMatch?.[1]) {
		return titleMatch[1];
	}

	return null;
};

const escapeXml = (value: string) => {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
};

const buildDaySectionCoverSvg = ({
	dateLabel,
	title,
}: {
	dateLabel?: string | null;
	title: string;
}) => {
	const safeTitle = escapeXml(title || 'Daily Section');
	const [year = '----', month = '--', day = '--'] = (dateLabel || '').split('-');
	const compactDateLabel = dateLabel ? `${year}.${month}.${day}` : 'Daily Section';

	return `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" fill="none">
  <rect width="1600" height="900" rx="48" fill="#F5EFE2"/>
  <rect width="1600" height="900" rx="48" fill="url(#bg)"/>
  <circle cx="1210" cy="224" r="214" fill="url(#orb)" fill-opacity="0.88"/>
  <circle cx="1210" cy="224" r="162" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>
  <circle cx="1210" cy="224" r="108" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
  <circle cx="1210" cy="224" r="54" fill="#FFF8E8" fill-opacity="0.95"/>
  <path d="M210 706C382 566 580 492 788 492C996 492 1193 566 1366 706" stroke="#21443C" stroke-opacity="0.18" stroke-width="4" stroke-linecap="round"/>
  <path d="M210 760C382 620 580 546 788 546C996 546 1193 620 1366 760" stroke="#21443C" stroke-opacity="0.12" stroke-width="4" stroke-linecap="round"/>
  <circle cx="788" cy="492" r="9" fill="#21443C"/>
  <circle cx="1028" cy="544" r="7" fill="#21443C" fill-opacity="0.45"/>
  <circle cx="568" cy="544" r="7" fill="#21443C" fill-opacity="0.45"/>
  <text x="108" y="566" fill="#21443C" font-family="Georgia, serif" font-size="88" font-weight="700">${safeTitle}</text>
  <text x="112" y="654" fill="#21443C" fill-opacity="0.78" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="34" letter-spacing="0.24em">${compactDateLabel}</text>
  <text x="110" y="772" fill="#21443C" fill-opacity="0.58" font-family="Georgia, serif" font-size="22">A date-shaped cover generated for the daily section timeline.</text>
  <defs>
    <linearGradient id="bg" x1="118" y1="86" x2="1452" y2="856" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E6F4EA"/>
      <stop offset="0.44" stop-color="#DDEEE8"/>
      <stop offset="1" stop-color="#F8E7CF"/>
    </linearGradient>
    <radialGradient id="orb" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1210 224) rotate(90) scale(214)">
      <stop stop-color="#FFF9EE"/>
      <stop offset="0.58" stop-color="#F7D9A6"/>
      <stop offset="1" stop-color="#E5A85B"/>
    </radialGradient>
  </defs>
</svg>`.trim();
};

export const getSectionCoverSrc = (section?: SectionCoverSource | null) => {
	if (!section) {
		return null;
	}
	if (section.cover && section.creator?.id !== undefined) {
		return replacePath(section.cover, section.creator.id);
	}
	if (!section.is_day_section) {
		return null;
	}

	const dateLabel = extractDateLabel({
		dateValue: section.day_section_date,
		title: section.title,
	});
	const svg = buildDaySectionCoverSvg({
		dateLabel,
		title: section.title || 'Daily Section',
	});
	return svgToDataUri(svg);
};
