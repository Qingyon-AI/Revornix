// ESLint 9 的 flat config。仓库里一直有 `lint` 脚本和装好的 eslint 9 +
// @eslint/js + typescript-eslint + globals，唯独缺这个文件，所以 `pnpm lint`
// 一直是直接报错退出的。这里就用那套已经装好的依赖，不额外引入。
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		// 构建产物、日志和静态资源不该被检查。
		ignores: ['dist/**', 'logs/**', 'public/**', 'node_modules/**'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			globals: globals.node,
			parserOptions: {
				// 服务端 JSX 走 hono/jsx，与 tsconfig 的 jsxImportSource 保持一致。
				ecmaFeatures: { jsx: true },
			},
		},
		rules: {
			// 以 _ 开头的形参/变量是「有意不用」的约定（catch 的错误对象、占位参数）。
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
		},
	},
);
