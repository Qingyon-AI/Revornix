export type RouteItem = {
	title: string;
	title_en?: string;
	path: string;
	unclickable?: boolean;
	children?: RouteItem[];
};

const routers: RouteItem[] = [
	{
		title: '管理面板',
		title_en: 'Dashboard',
		path: '/dashboard',
	},
	{
		title: '设置',
		title_en: 'Settings',
		path: '/setting',
		children: [
			{
				title: '通知',
				title_en: 'Notification',
				path: '/notification',
				children: [
					{
						title: '通知源管理',
						title_en: 'Source Manage',
						path: '/source-manage',
					},
					{
						title: '通知目标管理',
						title_en: 'Target Manage',
						path: '/target-manage',
					},
					{
						title: '通知任务管理',
						title_en: 'Task Manage',
						path: '/task-manage',
					},
				],
			},
			{
				title: '面板设计',
				title_en: 'Panel Design',
				path: '/dashboard',
			},
			{
				title: '模型配置',
				title_en: 'Model Config',
				path: '/model',
			},
			{
				title: 'MCP配置',
				title_en: 'MCP Config',
				path: '/mcp',
			},
			{
				title: '引擎配置',
				title_en: 'Engince Config',
				path: '/engine',
			},
		],
	},
	{
		title: '热搜集合',
		title_en: 'Hot Search',
		path: '/hot-search',
	},
	{
		title: 'Revornix AI',
		title_en: 'Revornix AI',
		path: '/revornix-ai',
	},
	{
		title: '文档',
		title_en: 'Document',
		path: '/document',
		unclickable: true,
		children: [
			{ title: '未读文档', title_en: 'Unread Document', path: '/unread' },
			{ title: '最近阅读', title_en: 'Recently Read', path: '/recent' },
			{ title: '星标文档', title_en: 'Starred Document', path: '/star' },
			{ title: '文档详情', title_en: 'Document Detail', path: '/detail' },
			{ title: '新建文档', title_en: 'Create Document', path: '/create' },
			{ title: '我的文档', title_en: 'My Document', path: '/mine' },
		],
	},
	{
		title: '专栏',
		title_en: 'Section',
		path: '/section',
		unclickable: true,
		children: [
			{
				title: '专栏详情',
				title_en: 'Section Detail',
				path: '/detail',
			},
			{
				title: '新建专栏',
				title_en: 'Create Section',
				path: '/create',
			},
			{
				title: '今日专栏',
				title_en: 'Today Section',
				path: '/today',
			},
			{
				title: '我的专栏',
				title_en: 'My Section',
				path: '/mine',
			},
			{
				title: '社区专栏',
				title_en: 'Community Section',
				path: '/community',
			},
			{
				title: '订阅专栏',
				title_en: 'Subscribed Section',
				path: '/subscribed',
			},
		],
	},
	{
		title: '专栏',
		title_en: 'Section',
		path: '/sections',
		unclickable: true,
		children: [
			{
				title: '专栏详情',
				title_en: 'Section Detail',
				path: '/detail',
			},
		],
	},
	{
		title: '用户',
		title_en: 'User',
		path: '/user',
		unclickable: true,
		children: [
			{
				title: '详情',
				title_en: 'Detail',
				path: '/detail',
			},
		],
	},
	{
		title: '每日文档总结',
		title_en: 'Daily Summary',
		path: '/day',
	},
	{
		title: '账号',
		title_en: 'Account',
		path: '/account',
		unclickable: true,
		children: [
			{
				title: 'APIKey管理',
				title_en: 'APIKey Management',
				path: '/apikey',
			},
			{
				title: '通知',
				title_en: 'Notification',
				path: '/notifications',
			},
		],
	},
];

export default routers;

// 根据全路径查找title的辅助函数
export const findRouteByPath = (
	routes: RouteItem[],
	fullPath: string,
	parentRoute = ''
): RouteItem | null => {
	for (const route of routes) {
		// 拼接父路径和当前路径
		const currentFullPath = `${parentRoute}${route.path}`;
		if (currentFullPath === fullPath) {
			return route;
		}
		// 如果有子节点，递归查找
		const childrenRoute = route?.children;
		if (childrenRoute) {
			const route = findRouteByPath(childrenRoute, fullPath, currentFullPath);
			if (route) return route;
		}
	}
	return null;
};
