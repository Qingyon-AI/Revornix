'use client';

import { useEffect, useState } from 'react';

import {
	CardViewMode,
	DEFAULT_CARD_VIEW_MODE,
} from '@/lib/card-view-mode';

const isCardViewMode = (value: string | null): value is CardViewMode => {
	return value === 'grid' || value === 'list';
};

export const useCardViewMode = (storageKey: string) => {
	const [viewMode, setViewMode] = useState<CardViewMode>(DEFAULT_CARD_VIEW_MODE);

	useEffect(() => {
		const storedMode = window.localStorage.getItem(storageKey);
		if (isCardViewMode(storedMode)) {
			setViewMode(storedMode);
		}
	}, [storageKey]);

	useEffect(() => {
		window.localStorage.setItem(storageKey, viewMode);
	}, [storageKey, viewMode]);

	return {
		viewMode,
		setViewMode,
	};
};
