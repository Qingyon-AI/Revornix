'use client';

import { useEffect, useState } from 'react';

import {
	CardViewMode,
	DEFAULT_CARD_VIEW_MODE,
} from '@/lib/card-view-mode';

const isCardViewMode = (value: string | null): value is CardViewMode => {
	return value === 'grid' || value === 'list';
};

export const useCardViewMode = (
	storageKey: string,
	defaultMode: CardViewMode = DEFAULT_CARD_VIEW_MODE,
) => {
	const [viewMode, setViewMode] = useState<CardViewMode>(defaultMode);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		const storedMode = window.localStorage.getItem(storageKey);
		if (isCardViewMode(storedMode)) {
			setViewMode(storedMode);
		}
		setIsReady(true);
	}, [storageKey]);

	useEffect(() => {
		if (!isReady) {
			return;
		}
		window.localStorage.setItem(storageKey, viewMode);
	}, [isReady, storageKey, viewMode]);

	return {
		viewMode,
		setViewMode,
		isReady,
	};
};
