import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface DesktopConfig {
  selectedOrigin: string | null;
}

const FILE = 'config.json';

export function readConfig(userDataDir: string): DesktopConfig {
  try {
    const raw = readFileSync(join(userDataDir, FILE), 'utf8');
    const parsed = JSON.parse(raw) as Partial<DesktopConfig>;
    const origin = typeof parsed.selectedOrigin === 'string' ? parsed.selectedOrigin : null;
    return { selectedOrigin: origin };
  } catch {
    return { selectedOrigin: null };
  }
}

export function writeConfig(userDataDir: string, config: DesktopConfig): void {
  mkdirSync(userDataDir, { recursive: true });
  writeFileSync(join(userDataDir, FILE), JSON.stringify(config, null, 2), 'utf8');
}
