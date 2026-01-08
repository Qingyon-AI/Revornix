'use client';

import { ChevronsUpDown, TrashIcon, XIcon } from 'lucide-react';
import * as _ from 'lodash-es';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Command, CommandInput, CommandItem, CommandList } from './command';
import { useRef, useState } from 'react';
import { Badge } from './badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from './empty';
import { useTranslations } from 'next-intl';

interface Element {
	label: string;
	value: string;
}

interface MultipleSelectorProps {
	placeholder: string;
	value: string[];
	options: Element[];
	onChange: (e: Element[]) => void;
}

const MultipleSelector = (props: MultipleSelectorProps) => {
	const t = useTranslations();
	const { onChange, placeholder, value, options } = props;

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
						{options.length === 0 && (
							<Empty className='h-full'>
								<EmptyHeader>
									<EmptyMedia variant='icon'>
										<TrashIcon />
									</EmptyMedia>
									<EmptyDescription>{t('empty')}</EmptyDescription>
								</EmptyHeader>
							</Empty>
						)}
						{options.length > 0 &&
							options
								.filter((option) => option.label.includes(keyword))
								.map((option, index) => {
									const isLast = index === options.length - 1;
									return (
										<CommandItem
											key={index}
											ref={isLast ? loadMoreRef : null}
											value={option.value}
											onSelect={(currentValue) => {
												if (value.includes(currentValue)) {
													setOpen(false);
													return;
												}
												const newChosed = [...value, currentValue];
												onChange(
													newChosed.map(
														(element) => getElementByValue(element)!
													)
												);
												setOpen(false);
											}}>
											<p className='text-xs ml-2'>{option.label}</p>
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
