import { Menu, MenuItemConstructorOptions } from 'electron';
import { ServerOption } from './servers';

export function buildAppMenu(opts: {
  servers: ServerOption[];
  currentOrigin: string | null;
  onSelect: (origin: string) => void;
  onReset: () => void;
}): Menu {
  const serverItems: MenuItemConstructorOptions[] = opts.servers.map((s) => ({
    label: s.label,
    type: 'radio',
    checked: s.origin === opts.currentOrigin,
    click: () => opts.onSelect(s.origin),
  }));

  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    {
      label: 'Server',
      submenu: [
        ...serverItems,
        { type: 'separator' },
        { label: 'Re-select server…', click: () => opts.onReset() },
      ],
    },
    { role: 'windowMenu' },
  ];

  return Menu.buildFromTemplate(template);
}
