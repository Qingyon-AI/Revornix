'use client';

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from 'react';

type RightSidebarContextValue = {
	content: ReactNode;
	hasContent: boolean;
	open: boolean;
	setOpen: (open: boolean) => void;
	toggleSidebar: () => void;
	setContent: (content: ReactNode) => void;
	clearContent: () => void;
};

const RightSidebarContext = createContext<RightSidebarContextValue | null>(null);

export const RightSidebarProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const [open, setOpen] = useState(true);
	const [content, setContentState] = useState<ReactNode>(null);
	const hasContentRef = useRef(false);

	const setContent = useCallback((nextContent: ReactNode) => {
		if (!hasContentRef.current) {
			setOpen(true);
		}
		hasContentRef.current = nextContent !== null;
		setContentState(nextContent);
	}, []);

	const clearContent = useCallback(() => {
		hasContentRef.current = false;
		setContentState(null);
	}, []);

	const value = useMemo<RightSidebarContextValue>(
		() => ({
			content,
			hasContent: content !== null,
			open,
			setOpen,
			toggleSidebar: () => setOpen((currentOpen) => !currentOpen),
			setContent,
			clearContent,
		}),
		[clearContent, content, open, setContent],
	);

	return (
		<RightSidebarContext.Provider value={value}>
			{children}
		</RightSidebarContext.Provider>
	);
};

export const useRightSidebar = () => {
	const context = useContext(RightSidebarContext);

	if (!context) {
		throw new Error(
			'useRightSidebar must be used within a RightSidebarProvider.',
		);
	}

	return context;
};

export const useOptionalRightSidebar = () => {
	return useContext(RightSidebarContext);
};
