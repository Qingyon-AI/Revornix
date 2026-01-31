import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { PriceItem, PriceItemCurrencyCodeEnum } from "@/generated-pay"

export const diffValues = <T extends Record<string, any>>(
  current: T,
  initial: Partial<T>
): Partial<T> => {
  const diff: Partial<T> = {};

  Object.keys(current).forEach((key) => {
    const k = key as keyof T;

    if (Array.isArray(current[k])) {
      if (
        JSON.stringify(current[k]) !==
        JSON.stringify(initial[k])
      ) {
        diff[k] = current[k];
      }
      return;
    }

    if (current[k] !== initial[k]) {
      diff[k] = current[k];
    }
  });

  return diff;
}

export function getPrice(prices: PriceItem[], currency_code: PriceItemCurrencyCodeEnum) {
  return prices.find(p => p.currency_code === currency_code)
}

export function isAllowedDeployHost(host?: string) {
  if (!host) return false

  const envHosts = process.env.NEXT_PUBLIC_DEPLOY_HOSTS
  if (!envHosts) return false

  const hostList = envHosts
    .split(',')
    .map(h => h.trim())
    .filter(Boolean)

  return hostList.some(h => host.includes(h))
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const transformMarkdownToHtml = async (markdown: string) => {
  const file = await unified()
    .use(remarkParse) // Convert into markdown AST
    .use(remarkRehype) // Transform to HTML AST
    .use(rehypeSanitize) // Sanitize HTML input
    .use(rehypeStringify) // Convert AST into serialized HTML
    .process(markdown)
  return String(file)
}

export const getIsServer = () => {
  const isServer = typeof window === 'undefined';
  return isServer
}

export const replaceImagePaths = (content: string, owner_id: number) => {
  return content.replace(/!\[\]\((images\/[^\)]+)\)/g, (match, path) => {
    return `![](${process.env.NEXT_PUBLIC_API_PREFIX}/file-system/url/resolve?path=${path}&owner_id=${owner_id})`;
  });
}

export const replacePath = (path: string, owner_id: number) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${process.env.NEXT_PUBLIC_API_PREFIX}/file-system/url/resolve?path=${path}&owner_id=${owner_id}`;
}

export const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}