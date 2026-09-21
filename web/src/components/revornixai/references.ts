/**
 * `@` 引用:聊天里指向**知识库里一个具体对象**,而不是一段字。
 *
 * ## 正文写名字,id 走结构化字段
 *
 * 胶囊序列化成 `@标题` —— 那是给模型读的句子,「把 @周报 里提到的三点合成一段摘要」读起来
 * 就是人话。而 id 单独收进 `references` 随消息一起发:标题会重、会改、会带空格,拿它当标识
 * 迟早出事;把数字 id 塞进正文又会把真正的句子挤没。两件事分开做,各自都对。
 *
 * ## 为什么两类共用一个节点类型
 *
 * 文档和专栏各造一个 tiptap 节点的话,序列化、渲染、收集 id 每一处都要写两遍 switch,
 * 而它们的差别只有「图标长什么样」和「去哪儿搜」。所以节点只有一个,`kind` 是它的属性;
 * 以后加笔记、加标签都只动这个文件。
 */
import { BookOpenIcon, FileTextIcon, type LucideIcon } from 'lucide-react';
import { searchAllMyDocument } from '@/service/document';
import { searchMineSection } from '@/service/section';
import type { AgentReference, ReferenceKind } from '@/types/agent';

export type { AgentReference, ReferenceKind };

//: 顺序就是菜单里分组的顺序。类型本身在 types/agent.ts —— 它还要给请求体和 payload 用。
export const REFERENCE_KINDS: readonly ReferenceKind[] = ['document', 'section'];

/** 每一类怎么找、长什么样、点开去哪儿。加一类就在这里加一行,别处不用改。 */
export const REFERENCE_META: Record<
	ReferenceKind,
	{ icon: LucideIcon; labelKey: string; href: (id: number) => string }
> = {
	//: 分组标题用**侧边栏那套名字** —— 用户在导航里认得的就是这两个词,菜单里换一套说法
	//: 只会让他去想「文档和资料是不是两个东西」。
	document: {
		icon: FileTextIcon,
		labelKey: 'sidebar_document',
		href: (id) => `/document/detail/${id}`,
	},
	section: {
		icon: BookOpenIcon,
		labelKey: 'sidebar_section',
		href: (id) => `/section/detail/${id}`,
	},
};

/**
 * 菜单里一次摆几条。**配额按它均分给各类,菜单也按它截断 —— 所以只能有一个数。**
 *
 * 两个数各自看都合理、凑一起才出事:候选按「limit 的两倍」去取、菜单再截到 limit,
 * 文档通常一家就有十几条,于是它占满整屏,专栏一条都露不出来 —— 封顶写了,却封在
 * 屏幕装不下的地方。
 */
export const REFERENCE_MENU_LIMIT = 10;

/**
 * 一次候选查询。两类并发问,慢的那一类不拖住另一类;任何一类挂掉只丢它自己 ——
 * 菜单是辅助,不该因为一个接口抖了就整块消失。
 */
export async function searchReferences(query: string): Promise<AgentReference[]> {
	const keyword = query.trim();
	const perKind = Math.max(3, Math.floor(REFERENCE_MENU_LIMIT / REFERENCE_KINDS.length));
	const [documents, sections] = await Promise.all([
		searchAllMyDocument({ keyword: keyword || null, limit: perKind })
			.then((res) => res.elements ?? [])
			.catch(() => []),
		searchMineSection({ keyword: keyword || null, limit: perKind })
			.then((res) => res.elements ?? [])
			.catch(() => []),
	]);
	//: **按类成段**,不轮转:菜单是分组显示的(每组一个标题),轮转会把同一类拆散到各处。
	return [
		...documents.map(
			(one): AgentReference => ({
				kind: 'document',
				id: one.id,
				name: one.title || `#${one.id}`,
			}),
		),
		...sections.map(
			(one): AgentReference => ({
				kind: 'section',
				id: one.id,
				name: one.title || `#${one.id}`,
			}),
		),
	];
}
