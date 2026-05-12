import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'Revornix',
		short_name: 'Revornix',
		description:
			'AI-native information workspace for documents, knowledge graphs, sections, and public knowledge sharing.',
		start_url: '/community',
		scope: '/',
		display: 'standalone',
		background_color: '#ffffff',
		theme_color: '#0f172a',
		icons: [
			{
				src: '/images/cover.jpg',
				sizes: '1200x630',
				type: 'image/jpeg',
			},
		],
	};
}
