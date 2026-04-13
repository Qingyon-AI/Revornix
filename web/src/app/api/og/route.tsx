import { ImageResponse } from 'next/og';

import { getDefaultOgImage } from '@/lib/seo-metadata';

export const runtime = 'edge';

const clampText = (value: string, maxLength: number) => {
	const normalized = value.replace(/\s+/g, ' ').trim();
	if (normalized.length <= maxLength) {
		return normalized;
	}
	return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

const themeStyles = {
	default: {
		accent: '#f3f4f6',
		chip: 'rgba(255,255,255,0.10)',
		border: 'rgba(255,255,255,0.14)',
	},
	community: {
		accent: '#93c5fd',
		chip: 'rgba(147,197,253,0.14)',
		border: 'rgba(147,197,253,0.22)',
	},
	document: {
		accent: '#fcd34d',
		chip: 'rgba(252,211,77,0.14)',
		border: 'rgba(252,211,77,0.22)',
	},
	section: {
		accent: '#86efac',
		chip: 'rgba(134,239,172,0.14)',
		border: 'rgba(134,239,172,0.22)',
	},
	user: {
		accent: '#c4b5fd',
		chip: 'rgba(196,181,253,0.14)',
		border: 'rgba(196,181,253,0.22)',
	},
} as const;

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const title = clampText(
		searchParams.get('title') || 'Revornix',
		100,
	);
	const description = clampText(
		searchParams.get('description') || 'An Information Management Tool for the AI Era',
		180,
	);
	const eyebrow = clampText(searchParams.get('eyebrow') || 'Revornix', 42);
	const themeKey =
		(searchParams.get('theme') as keyof typeof themeStyles | null) || 'default';
	const theme = themeStyles[themeKey] || themeStyles.default;
	const fallbackImage = getDefaultOgImage();

	return new ImageResponse(
		(
			<div
				style={{
					position: 'relative',
					display: 'flex',
					width: '100%',
					height: '100%',
					overflow: 'hidden',
					background: '#050505',
					color: '#f7f7f7',
					fontFamily:
						'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
				}}>
				<img
					src={fallbackImage}
					alt=''
					style={{
						position: 'absolute',
						inset: 0,
						width: '100%',
						height: '100%',
						objectFit: 'cover',
						filter: 'blur(2px)',
						opacity: 0.14,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						background:
							'radial-gradient(circle at top left, rgba(255,255,255,0.10), transparent 28%), linear-gradient(135deg, rgba(12,12,12,0.78), rgba(8,8,8,0.96))',
					}}
				/>
				<div
					style={{
						position: 'absolute',
						top: -140,
						right: -90,
						width: 420,
						height: 420,
						borderRadius: 9999,
						background: theme.chip,
						filter: 'blur(12px)',
					}}
				/>
				<div
					style={{
						position: 'absolute',
						left: -120,
						bottom: -180,
						width: 420,
						height: 420,
						borderRadius: 9999,
						background: theme.chip,
						filter: 'blur(18px)',
					}}
				/>

				<div
					style={{
						position: 'relative',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'space-between',
						width: '100%',
						padding: '54px 58px',
					}}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
						}}>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 16,
								padding: '12px 18px',
								borderRadius: 9999,
								background: theme.chip,
								border: `1px solid ${theme.border}`,
								fontSize: 24,
								letterSpacing: '0.18em',
								textTransform: 'uppercase',
								color: theme.accent,
							}}>
							<div
								style={{
									width: 10,
									height: 10,
									borderRadius: 9999,
									background: theme.accent,
								}}
							/>
							{eyebrow}
						</div>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 14,
								color: 'rgba(255,255,255,0.82)',
								fontSize: 26,
							}}>
							<div
								style={{
									width: 42,
									height: 42,
									borderRadius: 12,
									border: '1px solid rgba(255,255,255,0.14)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}>
								R
							</div>
							Revornix
						</div>
					</div>

					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 24,
							maxWidth: 930,
						}}>
						<div
							style={{
								fontSize: 72,
								lineHeight: 1.04,
								fontWeight: 700,
								letterSpacing: '-0.045em',
								textWrap: 'balance',
							}}>
							{title}
						</div>
						<div
							style={{
								fontSize: 30,
								lineHeight: 1.5,
								color: 'rgba(255,255,255,0.72)',
								textWrap: 'balance',
							}}>
							{description}
						</div>
					</div>

					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
						}}>
						<div
							style={{
								display: 'flex',
								gap: 16,
								fontSize: 24,
								color: 'rgba(255,255,255,0.78)',
							}}>
							<div
								style={{
									padding: '10px 16px',
									borderRadius: 9999,
									border: '1px solid rgba(255,255,255,0.12)',
									background: 'rgba(255,255,255,0.04)',
								}}>
								Public Link Preview
							</div>
							<div
								style={{
									padding: '10px 16px',
									borderRadius: 9999,
									border: '1px solid rgba(255,255,255,0.12)',
									background: 'rgba(255,255,255,0.04)',
								}}>
								1200 × 630
							</div>
						</div>
						<div
							style={{
								fontSize: 24,
								color: 'rgba(255,255,255,0.56)',
							}}>
							app.revornix.com
						</div>
					</div>
				</div>
			</div>
		),
		{
			width: 1200,
			height: 630,
		},
	);
}
