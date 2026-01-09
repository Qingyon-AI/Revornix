'use client';

import {
	CheckIcon,
	ChevronsUpDown,
	PlusCircleIcon,
	TrashIcon,
	XIcon,
} from 'lucide-react';
import * as _ from 'lodash-es';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Command, CommandInput, CommandItem, CommandList } from './command';
import { useMemo, useRef, useState } from 'react';
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
	value: string[];
	options: Element[];
	onChange: (e: Element[]) => void;
	onCreate?: (params: any) => Promise<void>;

	// 动态获取数据
	onSearch?: (params: any) => Promise<void>;
}

const MultipleSelector = (props: MultipleSelectorProps) => {
	const t = useTranslations();
	const { onChange, placeholder, value, options, onCreate } = props;

	const [creating, setCreating] = useState(false);

	const [open, setOpen] = useState(false);
	const [keyword, setKeyword] = useState('');

	const loadMoreRef = useRef<HTMLDivElement>(null);

	const getElementByValue = (value: string) => {
		return options.find((element) => element.value === value);
	};

	const handleDeleteOption = (option_value: string) => {
		const newValue = value.filter((option) => option !== option_value);
		onChange(newValue.map((elem) => getElementByValue(elem)!));
	};

	const filterOptions = useMemo(() => {
		if (!options) return [];
		return options.filter((option) => option.label.includes(keyword));
	}, [keyword, value, options]);

	return (
		<Popover open={open} onOpenChange={setOpen} modal={true}>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
					className='flex flex-row justify-between flex-1 items-center'>
					{value.length === 0 && (
						<span className='text-muted-foreground'>{placeholder}</span>
					)}
					{value.length > 0 && (
						<span className={cn('flex-1 flex flex-row gap-1 flex-wrap')}>
							{value.map((option_value, index) => {
								return (
									<Badge
										key={index}
										onClick={(e) => {
											e.stopPropagation();
											handleDeleteOption(option_value);
										}}
										className='rounded-full flex flex-row justify-between items-center'>
										{getElementByValue(option_value)?.label}
										<XIcon className='size-4' />
									</Badge>
								);
							})}
						</span>
					)}

					<ChevronsUpDown className='opacity-50 shrink-0 ml-2' />
				</Button>
			</PopoverTrigger>
			<PopoverContent align={'start'} className='p-0'>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={placeholder}
						className='h-9'
						value={keyword}
						onValueChange={(value) => {
							setKeyword(value); // 直接更新输入框，不触发请求
						}}
					/>
					<CommandList>
						{keyword &&
							options.findIndex((option) => option.label === keyword) === -1 &&
							onCreate && (
								<>
									<CommandItem
										className='flex flex-row justify-between items-center'
										disabled={creating}
										onSelect={async () => {
											if (!onCreate) return;
											try {
												setCreating(true);
												await onCreate({ label: keyword });
											} finally {
												setCreating(false);
											}
										}}>
										<p className='text-xs'>{keyword}</p>
										<p className='text-xs flex flex-row gap-1 items-center'>
											{t('create')}
											<PlusCircleIcon className='size-4' />
										</p>
									</CommandItem>
									<Separator />
								</>
							)}
						{((filterOptions.length === 0 && !onCreate) ||
							(options.length === 0 && onCreate && !keyword)) && (
							<Empty className='h-full'>
								<EmptyHeader>
									<EmptyMedia variant='icon'>
										<TrashIcon />
									</EmptyMedia>
									<EmptyDescription>{t('empty')}</EmptyDescription>
								</EmptyHeader>
							</Empty>
						)}
						{filterOptions.length > 0 &&
							filterOptions.map((option, index) => {
								const isLast = index === options.length - 1;
								return (
									<CommandItem
										key={index}
										className='flex flex-row justify-between items-center'
										ref={isLast ? loadMoreRef : null}
										value={option.value}
										onSelect={(currentValue) => {
											if (value.includes(currentValue)) {
												setOpen(false);
												return;
											}
											const newChosed = [...value, currentValue];
											onChange(
												newChosed.map((element) => getElementByValue(element)!)
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
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};

export default MultipleSelector;
