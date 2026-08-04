'use client';

import { useCallback, useMemo, useState } from 'react';

/**
 * 列表页的多选状态。
 *
 * 列表是无限滚动的，所以「全选」只作用于**当前已加载**的那些 —— 选中集合按 id 存，
 * 翻页不会把已选的项弄丢，但也不会替用户勾上他还没看到的东西。
 *
 * 下面三个纯函数是选中集合的全部变更规则。提出来是为了能被直接测试：这层语义
 * 比看上去微妙，而写错了不会报错，只会让用户删掉他没看见过的东西。
 */

export const toggleInSelection = (selected: number[], id: number): number[] =>
	selected.includes(id)
		? selected.filter((item) => item !== id)
		: [...selected, id];

export const toggleAllVisibleIn = (
	selected: number[],
	visibleIds: number[],
): number[] => {
	const visible = new Set(visibleIds);
	const everySelected =
		visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
	if (everySelected) {
		// 只取消当前可见的，别动用户在别的分页里选好的。
		return selected.filter((id) => !visible.has(id));
	}
	return Array.from(new Set([...selected, ...visibleIds]));
};

export const removeFromSelection = (
	selected: number[],
	ids: number[],
): number[] => {
	const removed = new Set(ids);
	return selected.filter((id) => !removed.has(id));
};

export const useMultiSelect = (visibleIds: number[]) => {
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	// 选择模式是显式开关：没点「选择」之前，列表里不该出现任何勾选框。
	const [active, setActive] = useState(false);

	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

	const isSelected = useCallback(
		(id: number) => selectedSet.has(id),
		[selectedSet],
	);

	const toggle = useCallback((id: number) => {
		setSelectedIds((prev) => toggleInSelection(prev, id));
	}, []);

	const clear = useCallback(() => setSelectedIds([]), []);

	/** 退出选择模式。顺手清空 —— 留着上次的勾选再进来会很意外。 */
	const exit = useCallback(() => {
		setActive(false);
		setSelectedIds([]);
	}, []);

	const toggleActive = useCallback(() => {
		setActive((prev) => {
			if (prev) setSelectedIds([]);
			return !prev;
		});
	}, []);

	const allVisibleSelected =
		visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
	const someVisibleSelected =
		!allVisibleSelected && visibleIds.some((id) => selectedSet.has(id));

	const toggleAllVisible = useCallback(() => {
		setSelectedIds((prev) => toggleAllVisibleIn(prev, visibleIds));
	}, [visibleIds]);

	/** 批量操作成功后调用：把处理掉的项从选中集合里摘出去。 */
	const removeIds = useCallback((ids: number[]) => {
		setSelectedIds((prev) => removeFromSelection(prev, ids));
	}, []);

	return {
		active,
		exit,
		toggleActive,
		selectedIds,
		selectedCount: selectedIds.length,
		isSelected,
		toggle,
		clear,
		removeIds,
		allVisibleSelected,
		someVisibleSelected,
		toggleAllVisible,
	};
};

export type MultiSelect = ReturnType<typeof useMultiSelect>;
