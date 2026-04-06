'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const ICP = () => {
	const [showICP, setShowICP] = useState(false);
	const [icp, setICP] = useState<string | null>(null);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const hostname = window.location.hostname;
		if (hostname === 'revornix.cn' || hostname.endsWith('.revornix.cn')) {
			setICP('浙ICP备2024137385号-6');
			setShowICP(true);
		} else if (
			hostname === 'qingyon.link' ||
			hostname.endsWith('.qingyon.link')
		) {
			setICP('浙ICP备2024137385号-5');
			setShowICP(true);
		}
	}, []);
	return <>{showICP && <Link href='https://beian.miit.gov.cn/'>{icp}</Link>}</>;
};

export default ICP;
