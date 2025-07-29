import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

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

export const replaceImagePaths = (content: string, urlPrefix: string) => {
  return content.replace(/!\[\]\((images\/[^\)]+)\)/g, (match, path) => {
    return `![](${urlPrefix}/${path})`;
  });
}

export const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}