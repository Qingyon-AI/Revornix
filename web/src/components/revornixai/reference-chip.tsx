'use client';

/**
 * 正文里的引用胶囊 —— 文档与专栏**共用这一个节点**,`kind` 是它的属性。
 *
 * `atom: true` 是关键:没有它光标能走进标签内部,退格会咬掉半截标题,留下一个说不清指向谁的
 * 残骸。原子节点要么整个在,要么整个不在。
 *
 * `renderText` 序列化成 **`@标题`**:`editor.getText()` 拿到的就是发给模型的那句话 ——
 * 「把 @周报 里的三点合成一段摘要」读起来是人话。id 不进正文,它另收进 references
 * (标题会重、会改、会带空格,拿它当标识迟早出事;数字 id 塞进句子会把句子挤没)。
 */
import * as React from 'react';
import Link from 'next/link';
import {
	Node,
	NodeViewWrapper,
	ReactNodeViewRenderer,
	mergeAttributes,
} from '@tiptap/react';

import { REFERENCE_META, type AgentReference, type ReferenceKind } from './references';
import { cn } from '@/lib/utils';

export const REFERENCE_NODE = 'agentRef';

/** 编辑器里的那颗胶囊。 */
function EditorChip({ node }: { node: { attrs: Record<string, unknown> } }) {
	const kind = String(node.attrs.kind ?? 'document') as ReferenceKind;
	const id = Number(node.attrs.refId ?? 0);
	const name = String(node.attrs.name ?? '');
	return (
		<NodeViewWrapper as='span' data-agent-ref=''>
			<ReferenceBadge kind={kind} id={id} name={name} />
		</NodeViewWrapper>
	);
}

export const ReferenceChip = Node.create({
	name: REFERENCE_NODE,
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,
	addAttributes: () => ({
		kind: { default: 'document' },
		refId: { default: 0 },
		name: { default: '' },
	}),
	parseHTML: () => [{ tag: 'span[data-agent-ref]' }],
	renderHTML: ({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) => [
		'span',
		mergeAttributes(HTMLAttributes, { 'data-agent-ref': '' }),
	],
	renderText: ({ node }: { node: { attrs: Record<string, unknown> } }) =>
		`@${String(node.attrs.name ?? '')}`,
	addNodeView: () => ReactNodeViewRenderer(EditorChip),
});

/**
 * 胶囊本身。**输入框里、用户气泡里、回答的来源里用的都是这一个** —— 三处各画一份的话,
 * 同一个引用在刚放进去时和发出去之后长得不一样,而用户前一秒才亲手把它放进去。
 *
 * 底色不用调色板里的具名面色(如 `bg-muted`):这颗胶囊会落在用户气泡上,而气泡自己就是
 * `bg-muted` —— 两者一模一样时胶囊在气泡里完全消失,只剩一行灰字贴着正文。改成「在当前底色上
 * 再压一层前景色」:无论压在哪张面上、在哪个主题下,它都比背后的面深/浅一档。
 */
export function ReferenceBadge({
	kind,
	id,
	name,
	className,
	/** 是否可点开。编辑器里的胶囊不可点 —— 点它应该是选中这个节点,而不是把人带离正在写的句子。 */
	linkable = false,
}: {
	kind: ReferenceKind;
	id: number;
	name: string;
	className?: string;
	linkable?: boolean;
}) {
	const meta = REFERENCE_META[kind] ?? REFERENCE_META.document;
	const Icon = meta.icon;
	const body = (
		<>
			<Icon className='size-3 shrink-0 text-muted-foreground' aria-hidden />
			<span className='truncate'>{name}</span>
		</>
	);
	const shell = cn(
		'inline-flex max-w-[220px] items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--foreground)_18%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_9%,transparent)] px-1.5 py-0.5 align-baseline text-xs text-foreground',
		linkable &&
			'transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_16%,transparent)]',
		className,
	);
	if (!linkable) {
		return (
			<span data-agent-ref-kind={kind} data-agent-ref-id={id} title={name} className={shell}>
				{body}
			</span>
		);
	}
	return (
		<Link
			href={meta.href(id)}
			data-agent-ref-kind={kind}
			data-agent-ref-id={id}
			title={name}
			className={shell}>
			{body}
		</Link>
	);
}

/** 菜单行左边那个方块。文档和专栏都是用标题认的,所以给图标而不是缩略图。 */
export function ReferenceThumb({ kind }: { kind: ReferenceKind }) {
	const Icon = (REFERENCE_META[kind] ?? REFERENCE_META.document).icon;
	return (
		<span className='grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground'>
			<Icon className='size-3.5' aria-hidden />
		</span>
	);
}

/** 一排胶囊 —— 用户气泡里的引用、回答下面的来源,用的都是这一排。 */
export function ReferenceRow({
	references,
	className,
	linkable = true,
}: {
	references: AgentReference[];
	className?: string;
	linkable?: boolean;
}) {
	if (references.length === 0) return null;
	return (
		<div className={cn('flex flex-wrap gap-1.5', className)}>
			{references.map((one) => (
				<ReferenceBadge
					key={`${one.kind}:${one.id}`}
					kind={one.kind}
					id={one.id}
					name={one.name}
					linkable={linkable}
				/>
			))}
		</div>
	);
}
