import type { MetaRecord } from 'nextra';

const meta: MetaRecord = {
	index: {
		type: 'page',
		title: 'Home',
		theme: {
			copyPage: false,
			timestamp: false,
			layout: 'full',
			toc: false,
		},
	},
	start: {
		type: 'page',
		title: 'Start Free',
		href: 'https://app.revornix.com',
	},
	pricing: {
		type: 'page',
		title: 'Pricing',
		theme: {
			layout: 'full',
			toc: false,
			copyPage: false,
			timestamp: false,
		},
	},
	docs: {
		type: 'page',
		title: 'Documentation',
	},
	blogs: {
		type: 'page',
		title: 'Blog',
		theme: {
			copyPage: false,
			breadcrumb: false,
			sidebar: false,
			timestamp: false,
			layout: 'full',
			toc: false,
			pagination: false,
			typesetting: 'article'
		},
	},
	roadmap: {
		type: 'page',
		href: 'https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3',
		title: 'Roadmap',
	}
};

export default meta;
