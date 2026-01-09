import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  output: "standalone",
  headers: async () => {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "content-type", value: "application/json" }]
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
    UNION_PAY_API_PREFIX: process.env.UNION_PAY_API_PREFIX,
    DEPLOY_HOSTS: process.env.DEPLOY_HOSTS,
  }
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);