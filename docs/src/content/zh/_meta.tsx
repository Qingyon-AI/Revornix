import type { MetaRecord } from 'nextra';

const meta: MetaRecord = {
	index: {
		type: 'page',
		title: '首页',
		theme: {
			copyPage: false,
			timestamp: false,
			layout: 'full',
			toc: false,
		},
	},
	start: {
		type: 'page',
		title: '开始使用',
		href: 'https://app.revornix.com',
	},
	pricing: {
		type: 'page',
		title: '定价',
		theme: {
			layout: 'full',
			toc: false,
			copyPage: false,
			timestamp: false,
		},
	},
	docs: {
		type: 'page',
		title: '文档',
	},
	blogs: {
		type: 'page',
		title: '博客',
		theme: {
			copyPage: false,
			breadcrumb: false,
			sidebar: false,
			timestamp: false,
			layout: 'full',
			toc: false,
			pagination: false,
			typesetting: 'article',
		},
	},
	roadmap: {
		type: 'page',
		href: 'https://huaqinda.notion.site/RoadMap-224bbdbfa03380fabd7beda0b0337ea3',
		title: '项目规划',
	},
};

export default meta;
