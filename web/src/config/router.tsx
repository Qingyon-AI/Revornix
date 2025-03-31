export type RouteItem = {
	title: string;
	path: string;
	unclickable?: boolean;
	children?: RouteItem[];
};

const routers: RouteItem[] = [
	{
		title: '管理面板',
		path: '/dashboard',
	},
	{
		title: '设置',
		path: '/setting',
		children: [
			{
				title: '面板设计',
				path: '/dashboard',
			},
		],
	},
	{
		title: '热搜集合',
		path: '/hot-search',
	},
	{
		title: 'Revornix AI',
		path: '/revornix-ai',
	},
	{
		title: '文档',
		path: '/document',
		unclickable: true,
		children: [
			{ title: '未读文档', path: '/unread' },
			{ title: '最近阅读', path: '/recent' },
			{ title: '星标文档', path: '/star' },
			{ title: '文档详情', path: '/detail' },
			{ title: '新建文档', path: '/create' },
			{ title: '我的文档', path: '/mine' },
		],
	},
	{
		title: '专栏',
		path: '/section',
		unclickable: true,
		children: [
			{
				title: '专栏详情',
				path: '/detail',
			},
			{
				title: '新建专栏',
				path: '/create',
			},
			{
				title: '今日专栏',
				path: '/today',
			},
			{
				title: '我的专栏',
				path: '/mine',
			},
			{
				title: '社区专栏',
				path: '/community',
			},
			{
				title: '订阅专栏',
				path: '/subscribed',
			},
		],
	},
	{
		title: '专栏',
		path: '/sections',
		unclickable: true,
		children: [
			{
				title: '专栏详情',
				path: '/detail',
			},
		],
	},
	{
		title: '用户',
		path: '/user',
		unclickable: true,
		children: [
			{
				title: '详情',
				path: '/detail',
			},
		],
	},
	{
		title: '每日文档总结',
		path: '/day',
	},
	{
		title: '账号',
		path: '/account',
		unclickable: true,
		children: [
			{
				title: 'APIKey管理',
				path: '/apikey',
			},
			{
				title: '通知',
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
