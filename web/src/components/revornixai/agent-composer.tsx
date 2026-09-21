'use client';

/**
 * 智能体聊天的输入框。
 *
 * **为什么不是 textarea。** 因为 `@` 引用是**一个对象**,不是一串字。用 textarea 的话只能把
 * 它拼成正文里的一段标记(`[引用 id=12 标题=周报]`)再用正则拆回来 —— 而标记是文本,文本是
 * 可以被用户删掉半个的:退格一下就剩 `[引用 id=12 标题=周报`,从此它既不是引用也不是人话。
 * 原子节点没有"半个"的状态,文档以 JSON 存下来,id 全程不进正文。
 *
 * 分工:`@` 什么时候触发、按键路由给谁,归 ProseMirror 插件(它懂输入法);菜单长什么样归
 * React —— 见 `ui/ref-suggestion` 与 `ui/suggestion-menu` 里的说明。
 */

import * as React from 'react';
import { EditorContent, type JSONContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useTranslations } from 'next-intl';

import { RefSuggestion } from '@/components/ui/ref-suggestion';
import { useSuggestionMenu } from '@/components/ui/suggestion-menu';
import { ReferenceChip, ReferenceThumb, REFERENCE_NODE } from './reference-chip';
import {
	REFERENCE_MENU_LIMIT,
	REFERENCE_META,
	searchReferences,
	type AgentReference,
	type ReferenceKind,
} from './references';
import { cn } from '@/lib/utils';

export const emptyDocument: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

/** 从文档里收出所有引用,按出现顺序去重。 */
export function collectReferences(document: JSONContent | undefined): AgentReference[] {
	const out: AgentReference[] = [];
	const seen = new Set<string>();
	const walk = (node: JSONContent | undefined) => {
		if (!node) return;
		if (node.type === REFERENCE_NODE) {
			const attrs = (node.attrs ?? {}) as { kind?: string; refId?: number; name?: string };
			const key = `${attrs.kind}:${attrs.refId}`;
			if (attrs.refId && !seen.has(key)) {
				seen.add(key);
				out.push({
					kind: (attrs.kind ?? 'document') as ReferenceKind,
					id: Number(attrs.refId),
					name: attrs.name ?? '',
				});
			}
		}
		for (const child of node.content ?? []) walk(child);
	};
	walk(document);
	return out;
}

/**
 * 文档 → 发给模型的那句话。引用序列化成 `@标题`(和 ReferenceChip 的 renderText 同一约定)。
 *
 * **不借编辑器实例来做这件事**:发送时手上只有 state 里的文档,而编辑器可能还没建、或者
 * 已经被清空。一个纯函数在哪儿都能调,也测得动。
 */
export function documentText(document: JSONContent | undefined): string {
	const parts: string[] = [];
	const walk = (node: JSONContent | undefined) => {
		if (!node) return;
		if (node.type === REFERENCE_NODE) {
			parts.push(`@${String((node.attrs as { name?: string } | undefined)?.name ?? '')}`);
			return;
		}
		if (node.type === 'text') {
			parts.push(node.text ?? '');
			return;
		}
		if (node.type === 'hardBreak') {
			parts.push('\n');
			return;
		}
		for (const child of node.content ?? []) walk(child);
		// 段落之间是换行 —— 用户敲的空行是他排的版,拼成一坨会把它抹掉。
		if (node.type === 'paragraph') parts.push('\n');
	};
	walk(document);
	return parts.join('').replace(/\n+$/, '');
}

/**
 * 这一下回车是不是「把消息发出去」。
 *
 * **菜单开着时不是** —— 那时回车归菜单(选中高亮的那一条)。这件事必须显式判断:
 * ProseMirror 解 `handleKeyDown` 时**先问视图自己的 props、再问各个插件**,也就是说编辑器上
 * 挂的这个函数排在 suggestion 插件前面。不让路的话,`@` 菜单里按回车永远是发送而不是选中:
 * 菜单看着能用、上下键也走得动,就是选不中。
 *
 * Shift+回车换行;输入法组字中的回车是选词,两者都不发送。
 */
export function sendsOnEnter(
	event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'isComposing'>,
	menuOpen: boolean,
): boolean {
	if (menuOpen) return false;
	return event.key === 'Enter' && !event.shiftKey && !event.isComposing;
}

const AgentComposer = ({
	value,
	onChange,
	onSubmit,
	onPaste,
	placeholder,
	className,
	search = searchReferences,
}: {
	value: JSONContent;
	onChange: (next: JSONContent) => void;
	/** 回车发送(Shift+回车换行)。**不带参数** —— 要发的那一份就是 `value`(受控文档),
	 *  调用方手上已经有它,而且它还要跟图片拼在一起才成一条消息。 */
	onSubmit: () => void;
	onPaste?: (event: React.ClipboardEvent) => boolean;
	placeholder?: string;
	className?: string;
	/** 候选从哪儿来。**留这个口子是为了测得动** —— 菜单的排版和键盘行为不该为了验证一次
	 *  就得起一个后端。 */
	search?: (query: string) => Promise<AgentReference[]>;
}) => {
	const t = useTranslations();
	//: 插件的回调在创建时一次性装好,拿不到后续渲染的闭包 —— 用 ref 兜住当前值。
	const submitRef = React.useRef(onSubmit);
	submitRef.current = onSubmit;
	const searchRef = React.useRef(search);
	searchRef.current = search;
	const pasteRef = React.useRef(onPaste);
	pasteRef.current = onPaste;
	//: handleKeyDown 同理:闭包住的是创建那一刻的状态,用 ref 读「菜单现在开着没有」。
	const menuOpenRef = React.useRef(false);

	const menu = useSuggestionMenu<AgentReference>({
		emptyHint: () => t('revornix_ai_reference_empty'),
		sameItems: (a, b) =>
			a.length === b.length && a.every((one, at) => one.kind === b[at].kind && one.id === b[at].id),
		view: (items) => items.slice(0, REFERENCE_MENU_LIMIT),
	});
	menuOpenRef.current = Boolean(menu.menu);

	const emitted = React.useRef(JSON.stringify(value));
	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				heading: false,
				bulletList: false,
				orderedList: false,
				listItem: false,
				blockquote: false,
				codeBlock: false,
				horizontalRule: false,
				bold: false,
				italic: false,
				strike: false,
				code: false,
			}),
			Placeholder.configure({ placeholder: placeholder ?? '' }),
			ReferenceChip,
			RefSuggestion.configure({
				suggestion: {
					char: '@',
					//: **`@` 前面是什么都认**。默认要求它跟在空格后面,而中文正文里不打空格 ——
					//: 那条规则等于让这个功能在中文下时灵时不灵。
					allowedPrefixes: null,
					items: ({ query }: { query: string }) => searchRef.current(query),
					command: ({ editor: instance, range, props }: any) => {
						const picked = props as AgentReference;
						//: 换成胶囊之后补一个空格 —— 不补的话光标紧贴原子节点,接着打字会被当成还在挑。
						instance
							.chain()
							.focus()
							.deleteRange(range)
							.insertContent([
								{
									type: REFERENCE_NODE,
									attrs: { kind: picked.kind, refId: picked.id, name: picked.name },
								},
								{ type: 'text', text: ' ' },
							])
							.run();
					},
					render: menu.render,
				},
			}),
		],
		content: value,
		editorProps: {
			attributes: {
				//: Placeholder 扩展只负责挂上 `is-editor-empty` 和 `data-placeholder`,**字是 CSS 画的**。
				//: 不写这一段的话占位文案一个字都不出现,而编辑器本身完全正常 —— 看起来像是
				//: placeholder 没传进来。(同一段写法见 markdown/tiptap-editor。)
				class: cn(
					'max-h-[200px] min-h-9 w-full overflow-y-auto border-0 bg-transparent px-1 pb-1.5 pt-0.5 text-sm leading-relaxed text-foreground outline-none',
					'[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
					className,
				),
			},
			handlePaste: (_view, event) =>
				pasteRef.current ? pasteRef.current(event as unknown as React.ClipboardEvent) : false,
			handleKeyDown: (_view, event) => {
				if (!sendsOnEnter(event, menuOpenRef.current)) return false;
				event.preventDefault();
				submitRef.current();
				return true;
			},
		},
		onUpdate: ({ editor: instance }) => {
			const next = instance.getJSON();
			emitted.current = JSON.stringify(next);
			onChange(next);
		},
	});

	//: 外面改了(发送后清空)才回灌 —— 自己发出去的那一版不跟,否则每敲一个字都会被 prop
	//: 回流重建文档,光标跳到开头。
	React.useEffect(() => {
		const incoming = JSON.stringify(value);
		if (!editor || incoming === emitted.current) return;
		emitted.current = incoming;
		editor.commands.setContent(value, { emitUpdate: false });
	}, [editor, value]);

	return (
		<>
			<EditorContent editor={editor} />
			<menu.Portal className='max-h-[min(320px,60dvh)] w-[320px] max-w-[calc(100vw-16px)]'>
				{(item, index) => (
					<React.Fragment key={`${item.kind}:${item.id}`}>
						{/* 分组标题**由列表自己长出来**,不另存一份结构:上一条和这一条不同类时画一行。
						    候选是按类成段给的(见 searchReferences),所以这一行判据只看「和上一条同不同类」。 */}
						{(index === 0 || (menu.menu?.items ?? [])[index - 1]?.kind !== item.kind) && (
							<div className='px-1.5 pb-0.5 pt-1 text-[11px] font-semibold text-muted-foreground'>
								{t(REFERENCE_META[item.kind].labelKey)}
							</div>
						)}
						<button
							type='button'
							className={cn(
								'flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors',
								index === (menu.menu?.active ?? 0) ? 'bg-accent' : 'hover:bg-accent',
							)}
							//: mousedown 会先让编辑器失焦,失焦又会收起菜单 —— 拦掉,让 click 有机会跑到。
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => menu.choose(item)}>
							<ReferenceThumb kind={item.kind} />
							<span className='min-w-0 flex-1 truncate text-xs text-foreground'>{item.name}</span>
						</button>
					</React.Fragment>
				)}
			</menu.Portal>
		</>
	);
};

export default AgentComposer;
