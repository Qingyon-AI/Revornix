'use client';

import {
	CheckIcon,
	ChevronsUpDown,
	PlusCircleIcon,
	TrashIcon,
	XIcon,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { Command, CommandInput, CommandItem, CommandList } from './command';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from './badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from './empty';
import { useTranslations } from 'next-intl';
import { Separator } from './separator';

interface Element {
	label: string;
	value: string;
}

interface MultipleSelectorProps {
	placeholder: string;

	// selection
	value: string[];
	onChange: (e: Element[]) => void;

	// options (controlled)
	options: Element[];
	loading?: boolean;
	hasMore?: boolean;

	// keyword (controlled / uncontrolled)
	keyword?: string;
	onKeywordChange?: (keyword: string) => void;

	// actions
	onCreate?: (params: any) => Promise<void>;
	onInitOptions?: (params?: any) => void;
	onSearchNextOptions?: (params?: any) => void;
}

const MultipleSelector = (props: MultipleSelectorProps) => {
	const t = useTranslations();

	const {
		placeholder,
		value,
		onChange,
		options,
		loading = false,
		hasMore = true,
		keyword,
		onKeywordChange,
		onCreate,
		onInitOptions,
		onSearchNextOptions,
	} = props;

	/* ---------------- keyword control ---------------- */

	const [innerKeyword, setInnerKeyword] = useState('');
	const isKeywordControlled = keyword !== undefined;
	const actualKeyword = isKeywordControlled ? keyword : innerKeyword;

	/* ---------------- ui state ---------------- */

	const [open, setOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const loadMoreRef = useRef<HTMLDivElement>(null);

	/* ---------------- helpers ---------------- */

	const getElementByValue = (val: string) =>
		options.find((el) => el.value === val);

	const handleDeleteOption = (val: string) => {
		const next = value.filter((v) => v !== val);
		onChange(next.map((v) => getElementByValue(v)!).filter(Boolean));
	};

	/* ---------------- option display ---------------- */

	const displayOptions = useMemo(() => {
		if (!actualKeyword) return options;
		return options.filter((o) => o.label.includes(actualKeyword));
	}, [options, actualKeyword]);

	/* ---------------- effects ---------------- */

	// init load when open
	useEffect(() => {
		if (!open) return;
		onInitOptions?.({ keyword: actualKeyword });
	}, [open]);

	// infinite scroll
	useEffect(() => {
		if (!loadMoreRef.current) return;
		if (!hasMore) return;
		if (!onSearchNextOptions) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !loading) {
					onSearchNextOptions({ keyword: actualKeyword });
				}
			},
			{ threshold: 1 }
		);

		observer.observe(loadMoreRef.current);
		return () => observer.disconnect();
	}, [actualKeyword, hasMore, loading]);

	/* ---------------- render ---------------- */

	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
					className='flex flex-row justify-between flex-1 items-center'>
					{value.length === 0 && (
						<span className='text-muted-foreground'>{placeholder}</span>
					)}

					{value.length > 0 && (
						<span className='flex-1 flex flex-row gap-1 flex-wrap'>
							{value.map((val) => (
								<Badge
									key={val}
									onClick={(e) => {
										e.stopPropagation();
										handleDeleteOption(val);
									}}
									className='rounded-full flex items-center gap-1'>
									{getElementByValue(val)?.label}
									<XIcon className='size-4' />
								</Badge>
							))}
						</span>
					)}

					<ChevronsUpDown className='opacity-50 ml-2 shrink-0' />
				</Button>
			</PopoverTrigger>

			<PopoverContent align='start' className='p-0'>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={placeholder}
						value={actualKeyword}
						onValueChange={(val) => {
							if (isKeywordControlled) {
								onKeywordChange?.(val);
							} else {
								setInnerKeyword(val);
							}
						}}
						className='h-9'
					/>

					<CommandList>
						{/* create */}
						{actualKeyword &&
							onCreate &&
							options.findIndex((o) => o.label === actualKeyword) === -1 && (
								<>
									<CommandItem
										disabled={creating}
										className='flex justify-between'
										onSelect={async () => {
											try {
												setCreating(true);
												await onCreate({ label: actualKeyword });
											} finally {
												setCreating(false);
											}
										}}>
										<p className='text-xs'>{actualKeyword}</p>
										<p className='text-xs flex items-center gap-1'>
											{t('create')}
											<PlusCircleIcon className='size-4' />
										</p>
									</CommandItem>
									<Separator />
								</>
							)}

						{/* empty */}
						{!loading && displayOptions.length === 0 && (
							<Empty className='h-full'>
								<EmptyHeader>
									<EmptyMedia variant='icon'>
										<TrashIcon />
									</EmptyMedia>
									<EmptyDescription>{t('empty')}</EmptyDescription>
								</EmptyHeader>
							</Empty>
						)}

						{/* options */}
						{displayOptions.map((option, index) => {
							const isLast = index === displayOptions.length - 1;
							return (
								<CommandItem
									key={option.value}
									ref={isLast ? loadMoreRef : null}
									value={option.value}
									className='flex justify-between'
									onSelect={(val) => {
										if (value.includes(val)) {
											setOpen(false);
											return;
										}
										onChange(
											[...value, val]
												.map((v) => getElementByValue(v)!)
												.filter(Boolean)
										);
										setOpen(false);
									}}>
									<p className='text-xs'>{option.label}</p>
									{value.includes(option.value) && (
										<CheckIcon className='size-4' />
									)}
								</CommandItem>
							);
						})}

						{/* loading */}
						{loading && (
							<div className='py-2 text-center text-xs text-muted-foreground'>
								{t('loading')}
							</div>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};

export default MultipleSelector;
