export interface HotItem {
	id: string;
	title: string;
	timestamp: number;
	hot: number;
	url: string;
	mobileUrl: string;
}

export interface Website {
	code: number;
	name: string;
	title: string;
	type: string;
	link: string;
	total: number;
	fromCache: boolean;
	updateTime: string;
	data: HotItem[];
}
