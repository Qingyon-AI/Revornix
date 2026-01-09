'use client';

import {
	PopoverContentProps,
	PopoverProps,
	PopoverTriggerProps,
} from '@radix-ui/react-popover';
import {
	TooltipContentProps,
	TooltipProps,
	TooltipTriggerProps,
	TooltipProviderProps,
} from '@radix-ui/react-tooltip';
import { throttle } from 'lodash-es';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';

import { Popover, PopoverTrigger, PopoverContent } from './popover';
import {
	TooltipProvider as OriginalTooltipProvider,
	Tooltip as OriginalTooltip,
	TooltipTrigger as OriginalTooltipTrigger,
	TooltipContent as OriginalTooltipContent,
} from './tooltip';

const TouchContext = createContext<boolean | undefined>(undefined);
const useTouch = () => useContext(TouchContext);

export const TooltipProvider = ({
	children,
	...props
}: TooltipProviderProps) => {
	const [isTouch, setTouch] = useState<boolean | undefined>(undefined);

	useEffect(() => {
		setTouch(window.matchMedia('(pointer: coarse)').matches);
	}, []);

	return (
		<TouchContext.Provider value={isTouch}>
			<OriginalTooltipProvider {...props}>{children}</OriginalTooltipProvider>
		</TouchContext.Provider>
	);
};

export const Tooltip = (
	props: TooltipProps &
		PopoverProps & { trackingRef?: React.RefObject<HTMLElement> }
) => {
	const isTouch = useTouch();
	const { trackingRef } = props;

	const [open, setOpen] = useState(false);

	const closeToolTip = useCallback(
		() =>
			throttle(() => {
				setOpen((currentOpen) => {
					if (!currentOpen || !isTouch) return currentOpen;
					return false;
				});
			}, 500),
		[isTouch]
	);

	useEffect(() => {
		const targetDom = trackingRef?.current ?? window;
		targetDom.addEventListener('scroll', closeToolTip);
		return () => {
			targetDom.removeEventListener('scroll', closeToolTip);
		};
	}, [closeToolTip, trackingRef]);

	return isTouch ? (
		<Popover open={open} onOpenChange={setOpen} {...props} />
	) : (
		<OriginalTooltip delayDuration={0} {...props} />
	);
};

export const TooltipTrigger = (
	props: TooltipTriggerProps & PopoverTriggerProps
) => {
	const isTouch = useTouch();

	const triggerProps = {
		...props,
		type: 'button' as const, // ⭐ 关键
	};

	return isTouch ? (
		<PopoverTrigger {...triggerProps} />
	) : (
		<OriginalTooltipTrigger {...triggerProps} />
	);
};

export const TooltipContent = (
	props: TooltipContentProps & PopoverContentProps
) => {
	const isTouch = useTouch();

	return isTouch ? (
		<PopoverContent
			className='z-50 w-fit overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary animate-in fade-in-0 zoom-in-95'
			{...props}
		/>
	) : (
		<OriginalTooltipContent {...props} />
	);
};
