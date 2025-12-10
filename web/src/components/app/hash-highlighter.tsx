'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function HashHighlighter() {
	const pathname = usePathname();

	useEffect(() => {
		const highlightElementByHash = () => {
			const hash = window.location.hash;
			if (!hash) return;

			const el = document.getElementById(hash.substring(1));
			if (!el) return;

			el.classList.add('global-highlight');
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });

			const timer = setTimeout(() => {
				el.classList.remove('global-highlight');
			}, 2000);

			return () => clearTimeout(timer);
		};

		const delayTimer = setTimeout(highlightElementByHash, 100);
		return () => clearTimeout(delayTimer);
	}, [pathname]);

	return null;
}
