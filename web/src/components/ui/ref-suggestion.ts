/**
 * `@` 唤起候选菜单 —— **一个 ProseMirror 插件,而不是外挂在 React 上的状态**。
 *
 * 自己用 `editorProps.handleKeyDown` + React state 也能写出来,但那条路有两个具体的坑:
 *
 * - **输入法。** handleKeyDown 不处理 composition —— 中文选词时按回车会被菜单当成
 *   「选中这一条」吃掉,候选词上不了屏。用 tiptap 的理由本就是「IME 难写对」,手写这一段
 *   等于把它最咬人的地方又捡了回来。
 * - **状态放错了层。** 创建时注册的回调看不见后来的菜单,于是要塞一堆 ref 去对抗过期闭包。
 *   需要三个 ref 才能读到自己的状态,说明这份状态本来就该住在编辑器里。
 *
 * 官方 Suggestion 插件把这两件事都归位:查询追踪与按键路由在插件里(它知道 composition),
 * 弹层长什么样仍然归 React。分工是「编辑器管什么时候、管到哪个字符;React 管长什么样」。
 */
import { Extension } from '@tiptap/react';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';

export const RefSuggestion = Extension.create<{
	suggestion: Omit<SuggestionOptions, 'editor'>;
}>({
	name: 'refSuggestion',
	addOptions() {
		return { suggestion: { char: '@' } as Omit<SuggestionOptions, 'editor'> };
	},
	addProseMirrorPlugins() {
		return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
	},
});
