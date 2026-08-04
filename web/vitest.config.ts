import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// 只跑纯逻辑的单元测试：lib/ 与 hooks/ 下不碰 DOM、不发请求的那部分。
// 组件渲染测试需要 jsdom 与 testing-library，是另一层投入，这里刻意不铺开 ——
// 先把「判断错了会静默出错」的逻辑钉住。
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node',
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
});
