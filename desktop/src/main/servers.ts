export interface ServerOption {
  id: string;
  label: string;
  origin: string;
}

export const BUILTIN_SERVERS: ServerOption[] = [
  { id: 'com', label: 'app.revornix.com (International)', origin: 'https://app.revornix.com' },
  { id: 'cn', label: 'app.revornix.cn (China Mirror)', origin: 'https://app.revornix.cn' },
];

export const OAUTH_HOSTS: string[] = ['accounts.google.com', 'github.com', 'open.weixin.qq.com'];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export function normalizeServerUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol === 'https:') {
    return `${url.protocol}//${url.host}`;
  }
  if (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)) {
    return `${url.protocol}//${url.host}`;
  }
  return null;
}

export function isInternalNavigation(targetUrl: string, currentOrigin: string): boolean {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    return false;
  }
  if (`${url.protocol}//${url.host}` === currentOrigin) {
    return true;
  }
  return OAUTH_HOSTS.includes(url.hostname);
}
