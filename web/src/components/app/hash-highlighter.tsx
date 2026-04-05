'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function HashHighlighter() {
	const pathname = usePathname();

	useEffect(() => {
		let cleanupTimer: number | null = null;

		const highlightElementByHash = () => {
			const hash = window.location.hash;
			if (!hash) return;

			const el = document.getElementById(hash.substring(1));
			if (!el) return;

			el.classList.remove('global-highlight');
			void el.getBoundingClientRect();
			el.classList.add('global-highlight');
			el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

			if (cleanupTimer) {
				window.clearTimeout(cleanupTimer);
			}
			cleanupTimer = window.setTimeout(() => {
				el.classList.remove('global-highlight');
			}, 2000);
		};

		const delayTimer = setTimeout(highlightElementByHash, 100);
		window.addEventListener('hashchange', highlightElementByHash);
		return () => {
			clearTimeout(delayTimer);
			window.removeEventListener('hashchange', highlightElementByHash);
			if (cleanupTimer) {
				window.clearTimeout(cleanupTimer);
			}
		};
	}, [pathname]);

	return null;
}
