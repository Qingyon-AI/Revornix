import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // standalone 只给**自建部署**用：线上 systemd 跑的是
  // `node .next/standalone/server.js`，Dockerfile 里也是它。
  //
  // Vercel 上必须关掉。它有自己的 Build Output API，不需要 standalone，两者一起
  // 用会让构建在收尾阶段挂掉：
  //   ENOENT: no such file or directory, open '.next/next-server.js.nft.json'
  // 那个文件是 standalone 的 node-file-trace 产物 —— 本地构建能生成，Vercel 的
  // 流程里不会，而它又去读，于是报一个看不出和 output 有关的错。
  //
  // VERCEL 是 Vercel 构建环境自带的变量，不需要自己配。
  output: process.env.VERCEL ? undefined : "standalone",
  // Surface every SSR `fetch` (URL, cache state, duration) in the dev / prod
  // server log so the SEO fetch chain is visible without DevTools.
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },
  rewrites: async () => {
    return [
      {
        source: "/sitemap.xml",
        destination: "/sitemaps",
      },
      {
        source: "/sitemap/:id.xml",
        destination: "/sitemap/:id",
      },
    ];
  },
  headers: async () => {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "content-type", value: "application/json" }]
      },
      {
        source: "/favicon.ico",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }]
      },
      {
        source: "/login",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }]
      },
      {
        source: "/register",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }]
      }
    ]
  },
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.uniapi.top",
      },
      {
        protocol: "https",
        hostname: "oss.kinda.info",
      }
    ],
  },
  env: {
    NEXT_PUBLIC_API_PREFIX: process.env.NEXT_PUBLIC_API_PREFIX,
    NEXT_PUBLIC_NOTIFICATION_WS_API_PREFIX: process.env.NEXT_PUBLIC_NOTIFICATION_WS_API_PREFIX,
    NEXT_PUBLIC_HOT_NEWS_API_PREFIX: process.env.NEXT_PUBLIC_HOT_NEWS_API_PREFIX,
    NEXT_PUBLIC_WECHAT_APP_ID: process.env.NEXT_PUBLIC_WECHAT_APP_ID,
    NEXT_PUBLIC_ALLOW_THIRD_PARTY_AUTH: process.env.NEXT_PUBLIC_ALLOW_THIRD_PARTY_AUTH,
    NEXT_PUBLIC_HOST: process.env.NEXT_PUBLIC_HOST,
    NEXT_PUBLIC_DEPLOY_HOSTS: process.env.NEXT_PUBLIC_DEPLOY_HOSTS,
    UNION_PAY_API_PREFIX: process.env.UNION_PAY_API_PREFIX,
  }
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
