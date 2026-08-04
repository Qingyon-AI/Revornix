'use client';

import { useCallback, useMemo, useState } from 'react';

/**
 * 列表页的多选状态。
 *
 * 列表是无限滚动的，所以「全选」只作用于**当前已加载**的那些 —— 选中集合按 id 存，
 * 翻页不会把已选的项弄丢，但也不会替用户勾上他还没看到的东西。
 */
export const useMultiSelect = (visibleIds: number[]) => {
	const [selectedIds, setSelectedIds] = useState<number[]>([]);

	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

	const isSelected = useCallback(
		(id: number) => selectedSet.has(id),
		[selectedSet],
	);

	const toggle = useCallback((id: number) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
		);
	}, []);

	const clear = useCallback(() => setSelectedIds([]), []);

	const allVisibleSelected =
		visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
	const someVisibleSelected =
		!allVisibleSelected && visibleIds.some((id) => selectedSet.has(id));

	const toggleAllVisible = useCallback(() => {
		setSelectedIds((prev) => {
			const visible = new Set(visibleIds);
			const everySelected =
				visibleIds.length > 0 && visibleIds.every((id) => prev.includes(id));
			if (everySelected) {
				// 只取消当前可见的，别动用户在别的分页里选好的。
				return prev.filter((id) => !visible.has(id));
			}
			return Array.from(new Set([...prev, ...visibleIds]));
		});
	}, [visibleIds]);

	/** 批量操作成功后调用：把处理掉的项从选中集合里摘出去。 */
	const removeIds = useCallback((ids: number[]) => {
		const removed = new Set(ids);
		setSelectedIds((prev) => prev.filter((id) => !removed.has(id)));
	}, []);

	return {
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
