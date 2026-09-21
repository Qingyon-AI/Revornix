'use client';

/**
 * 跟着光标走的候选菜单 —— tiptap suggestion 插件的**那一半界面**。
 *
 * 插件负责「什么时候出现、匹配到哪个字符、按键怎么走」;这里只负责「长什么样、摆在哪」。
 * 每一条怎么画由调用方给,所以同一份壳能服务不同的候选。
 *
 * 两条不显然的规矩:
 *
 * · **位置交给 floating-ui,不自己算。** 要处理贴到窗口边缘翻面、容器滚动、祖先 transform
 *   换掉 fixed 的基准。输入框钉在对话底部,而对话是能滚的 —— 自己算一次坐标就成了快照。
 * · **菜单 portal 到 body。** 插件给的 clientRect 是屏幕坐标,而输入卡外面可能有任何一层
 *   带 transform 的容器;祖先一旦有 transform,就成了后代 `position: fixed` 的包含块,
 *   把屏幕坐标喂进去菜单会跑偏。
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';

import { cn } from '@/lib/utils';

export interface SuggestionMenuState<T> {
	items: T[];
	active: number;
	/** 没有候选时改成只说一句话。什么都不弹的话,这个键就是**静默无效**。 */
	hint?: string;
}

interface SuggestionRenderProps<T> {
	command: (item: T) => void;
	clientRect?: (() => DOMRect | null) | null;
	items: T[];
}

export interface SuggestionMenu<T> {
	menu: SuggestionMenuState<T> | null;
	/** 交给 `RefSuggestion.configure({ suggestion: { render } })`。 */
	render: () => {
		onStart: (props: SuggestionRenderProps<T>) => void;
		onUpdate: (props: SuggestionRenderProps<T>) => void;
		onKeyDown: (props: { event: KeyboardEvent }) => boolean;
		onExit: () => void;
	};
	/** 确认某一条(点击走这里;回车由 onKeyDown 处理)。 */
	choose: (item: T) => void;
	/** 把菜单画出来 —— 每一条长什么样由调用方给。 */
	Portal: (props: {
		children: (item: T, index: number) => React.ReactNode;
		className?: string;
	}) => React.ReactNode;
}

export function useSuggestionMenu<T>({
	emptyHint,
	sameItems = (a: T[], b: T[]) => a.length === b.length && a.every((one, at) => one === b[at]),
	view,
}: {
	/** 没有任何候选时说的那句话。返回空串 = 什么都不弹。 */
	emptyHint?: () => string;
	/** 两批候选算不算「同一批」—— 同一批时保留用户按下去的高亮位置,不弹回第一条。 */
	sameItems?: (a: T[], b: T[]) => boolean;
	/** 把插件给的候选再过一道(截断/排序)。过完之后 `menu.items` 就是**看得见的那一份**,
	 *  键盘高亮和回车选中都对着它 —— 不然上下键走的是原始列表,选中的和高亮的不是同一条。 */
	view?: (items: T[]) => T[];
} = {}): SuggestionMenu<T> {
	const [menu, setMenu] = React.useState<SuggestionMenuState<T> | null>(null);
	//: 插件给的**是个函数**,每次调用返回当前的光标矩形。存函数而不是存算好的坐标 ——
	//: 存坐标就成了一张快照:对话一滚,光标动了而菜单不知道,于是它钉在原地。
	const clientRectRef = React.useRef<(() => DOMRect | null) | null>(null);
	//: 插件的 onKeyDown 闭包住创建时的 state,用 ref 读当前高亮项。
	const menuRef = React.useRef(menu);
	menuRef.current = menu;
	const commandRef = React.useRef<((item: T) => void) | null>(null);
	const emptyRef = React.useRef(emptyHint);
	emptyRef.current = emptyHint;
	const sameRef = React.useRef(sameItems);
	sameRef.current = sameItems;
	const viewRef = React.useRef(view);
	viewRef.current = view;

	const next = React.useCallback(
		(prev: SuggestionMenuState<T> | null, source: T[]): SuggestionMenuState<T> | null => {
			const items = viewRef.current ? viewRef.current(source) : source;
			if (items.length) {
				const active =
					prev && !prev.hint && sameRef.current(prev.items, items) ? prev.active : 0;
				return { items, active };
			}
			const hint = emptyRef.current?.() ?? '';
			return hint ? { items: [], active: 0, hint } : null;
		},
		[],
	);

	const render = React.useCallback(() => {
		// **onStart 和 onUpdate 用同一条规则。** tiptap 在同一次输入里 onStart 之后紧接着就调
		// onUpdate —— 两边写两份的话,onStart 刚摆上的东西会被 onUpdate 立刻清掉,表现是
		// 「菜单闪一下就没了」,看起来像根本没实现。
		const receive = (props: SuggestionRenderProps<T>) => {
			commandRef.current = props.command;
			clientRectRef.current = props.clientRect ?? null;
			setMenu((prev) => next(prev, props.items));
		};
		return {
			onStart: receive,
			onUpdate: receive,
			// **按键交给插件**:它知道 composition,中文选词时的回车不会被当成「选中候选」。
			onKeyDown: (props: { event: KeyboardEvent }) => {
				const key = props.event.key;
				if (key === 'Escape') {
					setMenu(null);
					return true;
				}
				if (key === 'ArrowDown' || key === 'ArrowUp') {
					setMenu((prev) =>
						prev && prev.items.length
							? {
									...prev,
									active:
										(prev.active + (key === 'ArrowDown' ? 1 : -1) + prev.items.length) %
										prev.items.length,
								}
							: prev,
					);
					return true;
				}
				if (key === 'Enter' || key === 'Tab') {
					const current = menuRef.current;
					if (!current || current.items.length === 0) return false;
					commandRef.current?.(current.items[current.active]);
					return true;
				}
				return false;
			},
			onExit: () => setMenu(null),
		};
	}, [next]);

	const choose = React.useCallback((item: T) => commandRef.current?.(item), []);

	const Portal = React.useCallback(
		({
			children,
			className,
		}: {
			children: (item: T, index: number) => React.ReactNode;
			className?: string;
		}) => (
			<SuggestionPortal menu={menuRef.current} clientRectRef={clientRectRef} className={className}>
				{children}
			</SuggestionPortal>
		),
		[],
	);

	return { menu, render, choose, Portal };
}

/** 把定位的生命周期和菜单本身的身份稳住,不随编辑器的每一次更新重建。 */
function SuggestionPortal<T>({
	menu,
	clientRectRef,
	className,
	children,
}: {
	menu: SuggestionMenuState<T> | null;
	clientRectRef: React.RefObject<(() => DOMRect | null) | null>;
	className?: string;
	children: (item: T, index: number) => React.ReactNode;
}) {
	const menuEl = React.useRef<HTMLDivElement>(null);
	const open = Boolean(menu);

	React.useLayoutEffect(() => {
		const floating = menuEl.current;
		if (!open || !floating) return;
		let active = true;
		let lastRect: DOMRect | null = null;
		let revision = 0;
		floating.style.visibility = 'hidden';
		const readRect = () => {
			const rect = clientRectRef.current?.();
			//: ProseMirror 替换建议区间时会短暂撤掉自己的装饰。**一个缺失/高度为 0 的矩形
			//: 不等于光标跑到了屏幕原点** —— 直接用它,菜单会瞬移到左上角再弹回来。
			if (rect && rect.height > 0 && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) {
				lastRect = rect;
			}
			return lastRect;
		};
		const reference = { getBoundingClientRect: () => readRect() ?? new DOMRect() };
		const stop = autoUpdate(
			reference,
			floating,
			() => {
				if (!readRect()) return;
				const request = ++revision;
				void computePosition(reference, floating, {
					strategy: 'fixed',
					//: 输入框在屏幕下方,菜单默认往**上**开 —— 往下开必然立刻被 flip 翻回来,
					//: 那一下翻转用户是看得见的。
					placement: 'top-start',
					middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
				}).then(({ x, y }) => {
					if (!active || request !== revision) return;
					Object.assign(floating.style, {
						left: `${x}px`,
						top: `${y}px`,
						visibility: 'visible',
					});
				});
			},
			{ animationFrame: true },
		);
		return () => {
			active = false;
			stop();
		};
	}, [open, clientRectRef]);

	if (!menu) return null;
	return createPortal(
		<div
			ref={menuEl}
			data-suggestion-menu=''
			style={{ visibility: 'hidden' }}
			className={cn(
				'fixed left-0 top-0 z-50 overflow-auto rounded-xl border border-border/60 bg-popover p-1.5 text-popover-foreground shadow-lg',
				className ?? 'max-h-60 w-60',
			)}>
			{menu.hint && (
				<div className='px-2 py-1.5 text-xs leading-relaxed text-muted-foreground'>
					{menu.hint}
				</div>
			)}
			{menu.items.map((item, index) => children(item, index))}
		</div>,
		document.body,
	);
}
