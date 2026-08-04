import { describe, expect, it } from 'vitest';

import {
	removeFromSelection,
	toggleAllVisibleIn,
	toggleInSelection,
} from './use-multi-select';

// 列表是无限滚动的，所以"全选"的语义比看上去微妙：它只能作用于**已经加载**的那些。
// 判断错了不会报错，只会让用户删掉他没看见过的东西，或者在翻页后丢掉已经勾好的。
// 这几个 updater 是那层语义的全部所在。

describe('toggleAllVisibleIn', () => {
	it('全选当前可见项', () => {
		expect(toggleAllVisibleIn([], [1, 2, 3]).sort()).toEqual([1, 2, 3]);
	});

	it('已全选时再点即取消', () => {
		expect(toggleAllVisibleIn([1, 2, 3], [1, 2, 3])).toEqual([]);
	});

	it('部分选中时补齐为全选', () => {
		expect(toggleAllVisibleIn([2], [1, 2, 3]).sort()).toEqual([1, 2, 3]);
	});

	it('翻页后取消全选，只清可见的那批', () => {
		// 第一页选了 1~3，滚到第二页看到 4~6 并全选，此时再点一次取消：
		// 只能取消 4~6，1~3 是用户在上一页明确勾过的
		expect(toggleAllVisibleIn([1, 2, 3, 4, 5, 6], [4, 5, 6]).sort()).toEqual([
			1, 2, 3,
		]);
	});

	it('翻页后全选，累加而不丢弃旧的', () => {
		expect(toggleAllVisibleIn([1, 2], [4, 5, 6]).sort()).toEqual([1, 2, 4, 5, 6]);
	});

	it('可见为空时不清空已选', () => {
		// 搜索过滤到零结果时点全选，不该把之前选中的一并抹掉
		expect(toggleAllVisibleIn([1, 2], []).sort()).toEqual([1, 2]);
	});

	it('不产生重复项', () => {
		const out = toggleAllVisibleIn([1, 2], [2, 3]);
		expect(out.length).toBe(new Set(out).size);
	});
});

describe('toggleInSelection', () => {
	it('未选中则加入', () => {
		expect(toggleInSelection([1], 2).sort()).toEqual([1, 2]);
	});

	it('已选中则移除', () => {
		expect(toggleInSelection([1, 2], 1)).toEqual([2]);
	});

	it('对空集合可用', () => {
		expect(toggleInSelection([], 7)).toEqual([7]);
	});
});

describe('removeFromSelection', () => {
	it('批量操作成功后摘掉已处理的项', () => {
		expect(removeFromSelection([1, 2, 3, 9], [1, 3]).sort()).toEqual([2, 9]);
	});

	it('对不存在的 id 无副作用', () => {
		expect(removeFromSelection([2, 9], [7]).sort()).toEqual([2, 9]);
	});

	it('部分成功时只摘掉真正处理掉的', () => {
		// 批量删除若只有一部分成功，剩下的必须留在选中集合里让用户重试
		expect(removeFromSelection([1, 2, 3], [1]).sort()).toEqual([2, 3]);
	});
});
