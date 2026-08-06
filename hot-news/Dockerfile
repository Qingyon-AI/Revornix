FROM node:24-alpine AS base

ENV NODE_ENV=docker

# 清理缓存
RUN rm -rf /var/cache/apk/*

# 构建阶段
FROM base AS builder

# corepack 而不是 `npm install -g pnpm`：corepack 是 Node 自带的，它读
# package.json 里的 packageManager 字段，装的就是**声明的那个版本**。
# 全局 npm 装则永远拉最新版 —— 镜像里跑的 pnpm 会随构建日期漂移，
# 与本地和 CI 用的不是同一个。web/Dockerfile 一直是这么做的。
RUN corepack enable
WORKDIR /app

# 只 COPY package.json，不用 package*json ——后者会把 package-lock.json 一并带进来。
# pnpm-workspace.yaml 不能漏：allowBuilds 写在里面，少了它 pnpm 会拒绝跑 esbuild
# 的 install script（ERR_PNPM_IGNORED_BUILDS），而 tsx 依赖那个二进制。
COPY package.json tsconfig.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY src ./src
COPY public ./public

# --frozen-lockfile：锁文件与 package.json 对不上时**报错**，而不是就地改写锁文件。
# 不加的话镜像可能装出一套与仓库里记录的不同的依赖，而且没人会知道。
RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm prune --production

# 运行阶段
FROM base AS runner

# 创建用户和组
RUN addgroup --system --gid 114514 nodejs
RUN adduser --system --uid 114514 hono

# 创建日志目录
RUN mkdir -p /app/logs && chown -R hono:nodejs /app/logs
RUN ln -s /app/logs /logs

# 复制文件
COPY --from=builder --chown=hono:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=hono:nodejs /app/dist /app/dist
COPY --from=builder /app/public /app/publics
COPY --from=builder /app/package.json /app/package.json

# 切换用户
USER hono

# 暴露端口
EXPOSE 6688

# 运行
CMD ["node", "/app/dist/index.js"]