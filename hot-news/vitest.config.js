import { defineConfig } from 'vitest/config';
// 只跑纯逻辑：数字/时间归一化与 RSS 解析。抓取类逻辑要打网络，属于另一层。
export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'node',
    },
});
