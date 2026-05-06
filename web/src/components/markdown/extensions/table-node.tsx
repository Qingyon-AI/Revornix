'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import { Minus, Plus, Table2, Trash2 } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	extractCustomBlockTag,
	findCustomBlockTagStart,
} from '@/lib/markdown-custom-block';
import BlockNodeShell from './block-node-shell';

type TableCellRow = string[];
type TableSelection =
	| { type: 'row'; index: number }
	| { type: 'column'; index: number }
	| null;

const DEFAULT_TABLE_CONTENT: TableCellRow[] = [
	['Header 1', 'Header 2', 'Header 3'],
	['Cell 1', 'Cell 2', 'Cell 3'],
	['Cell 4', 'Cell 5', 'Cell 6'],
];

const getColumnCount = (content: TableCellRow[]) =>
	Math.max(...content.map((row) => row.length), 1);

const normalizeTableShape = (content: TableCellRow[]) => {
	const columnCount = getColumnCount(content);
	return content.map((row) =>
		Array.from({ length: columnCount }, (_, index) => row[index] ?? ''),
	);
};

const encodeTableContent = (content: TableCellRow[]) =>
	encodeURIComponent(JSON.stringify(content));

const decodeTableContent = (value: string | null): TableCellRow[] => {
	if (!value) {
		return DEFAULT_TABLE_CONTENT;
	}

	try {
		const parsed = JSON.parse(decodeURIComponent(value));
		if (
			Array.isArray(parsed) &&
			parsed.every(
				(row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'),
			)
		) {
			return normalizeTableShape(parsed as TableCellRow[]);
		}
	} catch {
		// Fall back to default content below.
	}

	return DEFAULT_TABLE_CONTENT;
};

const normalizeTableContent = (content?: unknown): TableCellRow[] => {
	if (
		Array.isArray(content) &&
		content.length > 0 &&
		content.every(
			(row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'),
		)
	) {
		return normalizeTableShape(content as TableCellRow[]);
	}

	return DEFAULT_TABLE_CONTENT;
};

type TableCellTextareaProps = {
	value: string;
	className?: string;
	onChange: (value: string) => void;
	onFocus: () => void;
};

const TableCellTextarea = ({
	value,
	className,
	onChange,
	onFocus,
}: TableCellTextareaProps) => {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const syncTextareaHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) {
			return;
		}

		const parentHeight = textarea.parentElement?.clientHeight ?? 0;
		textarea.style.height = 'auto';
		textarea.style.height = `${Math.max(textarea.scrollHeight, parentHeight)}px`;
	}, []);

	useLayoutEffect(() => {
		syncTextareaHeight();
	}, [syncTextareaHeight, value]);

	useLayoutEffect(() => {
		const parent = textareaRef.current?.parentElement;
		if (!parent || typeof ResizeObserver === 'undefined') {
			return;
		}

		const resizeObserver = new ResizeObserver(syncTextareaHeight);
		resizeObserver.observe(parent);

		return () => resizeObserver.disconnect();
	}, [syncTextareaHeight]);

	return (
		<textarea
			ref={textareaRef}
			value={value}
			rows={1}
			wrap='soft'
			draggable={false}
			onFocus={onFocus}
			onMouseDown={(event) => event.stopPropagation()}
			onClick={(event) => event.stopPropagation()}
			onChange={(event) => onChange(event.target.value)}
			className={className}
		/>
	);
};

const TableNodeView = ({
	node,
	editor,
	updateAttributes,
	selected,
}: NodeViewProps) => {
	const t = useTranslations();
	const isEditable = editor.isEditable;
	const table = normalizeTableContent(node.attrs.content);
	const columnCount = getColumnCount(table);
	const [tableSelection, setTableSelection] = useState<TableSelection>(null);
	const selectedRowIndex =
		tableSelection?.type === 'row' ? tableSelection.index : null;
	const selectedColumnIndex =
		tableSelection?.type === 'column' ? tableSelection.index : null;

	const commitTable = (nextTable: TableCellRow[]) => {
		updateAttributes({
			content: nextTable,
		});
	};

	const updateCell = (rowIndex: number, cellIndex: number, value: string) => {
		const nextTable = table.map((row, currentRowIndex) =>
			currentRowIndex === rowIndex
				? row.map((cell, currentCellIndex) =>
						currentCellIndex === cellIndex ? value : cell,
					)
				: row,
		);

		commitTable(nextTable);
	};

	const toggleRowSelection = (rowIndex: number) => {
		setTableSelection((current) =>
			current?.type === 'row' && current.index === rowIndex
				? null
				: { type: 'row', index: rowIndex },
		);
	};

	const toggleColumnSelection = (columnIndex: number) => {
		setTableSelection((current) =>
			current?.type === 'column' && current.index === columnIndex
				? null
				: { type: 'column', index: columnIndex },
		);
	};

	const addRow = () => {
		commitTable([
			...table,
			Array.from({ length: columnCount }, (_, index) =>
				t('document_create_table_cell_label', {
					row: table.length + 1,
					column: index + 1,
				}),
			),
		]);
	};

	const removeRow = (rowIndex = table.length - 1) => {
		if (table.length <= 1) {
			return;
		}

		commitTable(table.filter((_, currentRowIndex) => currentRowIndex !== rowIndex));
		setTableSelection(null);
	};

	const addColumn = () => {
		commitTable(
			table.map((row, rowIndex) => [
				...row,
				rowIndex === 0
					? t('document_create_table_header_label', { column: row.length + 1 })
					: t('document_create_table_cell_label', {
							row: rowIndex + 1,
							column: row.length + 1,
						}),
			]),
		);
	};

	const removeColumn = (columnIndex = columnCount - 1) => {
		if (columnCount <= 1) {
			return;
		}

		commitTable(
			table.map((row) =>
				row.filter(
					(_, currentColumnIndex) => currentColumnIndex !== columnIndex,
				),
			),
		);
		setTableSelection(null);
	};

	const removeSelected = () => {
		if (!tableSelection) {
			return;
		}

		if (tableSelection.type === 'row') {
			removeRow(tableSelection.index);
			return;
		}

		removeColumn(tableSelection.index);
	};

	const canRemoveSelected =
		tableSelection?.type === 'row'
			? table.length > 1
			: tableSelection?.type === 'column'
				? columnCount > 1
				: false;

	const getCellSelectionClassName = (rowIndex: number, cellIndex: number) => {
		if (selectedRowIndex === rowIndex || selectedColumnIndex === cellIndex) {
			return 'bg-primary/10';
		}
		return '';
	};

	return (
		<NodeViewWrapper className='group/table-node'>
			<BlockNodeShell
				selected={selected && isEditable}
				contentClassName='relative rounded-lg border-0 bg-transparent p-0'>
			{isEditable && (
				<div
					className='absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-border/70 bg-background/95 p-1 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover/table-node:opacity-100 focus-within:opacity-100'
					contentEditable={false}>
					<div className='mr-1 hidden items-center gap-1 px-1 text-[11px] font-medium text-muted-foreground sm:flex'>
						<Table2 className='size-3' />
						<span>Table</span>
					</div>
					<Button
						type='button'
						variant='ghost'
						size='icon'
						className='size-7'
						title={t('document_create_table_add_row')}
						onClick={addRow}>
						<Plus className='size-3.5' />
					</Button>
					<Button
						type='button'
						variant='ghost'
						size='icon'
						className='size-7'
						title={t('document_create_table_remove_row')}
						onClick={() => removeRow()}
						disabled={table.length <= 1}>
						<Minus className='size-3.5' />
					</Button>
					<div className='mx-1 h-4 w-px bg-border/70' />
					<Button
						type='button'
						variant='ghost'
						size='icon'
						className='size-7'
						title={t('document_create_table_add_column')}
						onClick={addColumn}>
						<Plus className='size-3.5 rotate-90' />
					</Button>
					<Button
						type='button'
						variant='ghost'
						size='icon'
						className='size-7'
						title={t('document_create_table_remove_column')}
						onClick={() => removeColumn()}
						disabled={columnCount <= 1}>
						<Minus className='size-3.5 rotate-90' />
					</Button>
					{tableSelection ? (
						<>
							<div className='mx-1 h-4 w-px bg-border/70' />
							<Button
								type='button'
								variant='ghost'
								size='icon'
								className='size-7 text-destructive hover:text-destructive'
								title={
									tableSelection.type === 'row'
										? t('document_create_table_delete_selected_row')
										: t('document_create_table_delete_selected_column')
								}
								onClick={removeSelected}
								disabled={!canRemoveSelected}>
								<Trash2 className='size-3.5' />
							</Button>
						</>
					) : null}
				</div>
			)}
			<div className='overflow-hidden rounded-lg border border-border/70 bg-background'>
				<div className='overflow-x-auto'>
				<table className='my-0 w-full min-w-[520px] border-separate border-spacing-0 text-sm'>
					<tbody>
						{table.map((row, rowIndex) => (
							<tr
								key={rowIndex}
								className='last:[&>*]:border-b-0'>
								{isEditable && (
									<td
										className={cn(
											'w-8 min-w-8 border-b border-r border-border/50 bg-muted/20 p-0 text-center align-middle',
											rowIndex === 0 && 'first:rounded-tl-lg',
											selectedRowIndex === rowIndex && 'bg-primary/10',
										)}>
										<button
											type='button'
											className='flex h-full min-h-10 w-full items-center justify-center text-[11px] font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground'
											title={t('document_create_table_delete_selected_row')}
											onMouseDown={(event) => event.preventDefault()}
											onClick={() => toggleRowSelection(rowIndex)}>
											{rowIndex + 1}
										</button>
									</td>
								)}
								{Array.from({ length: columnCount }, (_, cellIndex) => {
									const cellValue = row[cellIndex] ?? '';
									const sharedClassName =
										'block min-h-10 w-full resize-none overflow-hidden whitespace-pre-wrap break-words border-0 bg-transparent px-3 py-2.5 leading-5 outline-none transition-colors [overflow-wrap:anywhere] focus:bg-muted/40';

									return rowIndex === 0 ? (
										<th
											key={`${rowIndex}-${cellIndex}`}
											className={cn(
												'border-b border-r border-border/50 bg-muted/30 text-left last:border-r-0',
												!isEditable && 'first:rounded-tl-lg',
												cellIndex === columnCount - 1 && 'rounded-tr-lg',
												getCellSelectionClassName(rowIndex, cellIndex),
											)}>
											{isEditable ? (
												<div className='flex min-h-10 items-stretch'>
													<button
														type='button'
														className={cn(
															'flex w-7 shrink-0 items-center justify-center border-r border-border/40 text-[11px] font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground',
															selectedColumnIndex === cellIndex &&
																'bg-primary/10 text-foreground',
														)}
														title={t('document_create_table_delete_selected_column')}
														onMouseDown={(event) => event.preventDefault()}
														onClick={() => toggleColumnSelection(cellIndex)}>
														{cellIndex + 1}
													</button>
													<TableCellTextarea
														value={cellValue}
														onFocus={() => setTableSelection(null)}
														onChange={(value) =>
															updateCell(rowIndex, cellIndex, value)
														}
														className={cn(sharedClassName, 'font-semibold')}
													/>
												</div>
											) : (
												<div className={cn(sharedClassName, 'font-semibold')}>
													{cellValue}
												</div>
											)}
										</th>
									) : (
										<td
											key={`${rowIndex}-${cellIndex}`}
											className={cn(
												'border-b border-r border-border/50 align-top last:border-r-0',
												getCellSelectionClassName(rowIndex, cellIndex),
											)}>
											{isEditable ? (
												<TableCellTextarea
													value={cellValue}
													onFocus={() => setTableSelection(null)}
													onChange={(value) =>
														updateCell(rowIndex, cellIndex, value)
													}
													className={sharedClassName}
												/>
											) : (
												<div className={sharedClassName}>{cellValue}</div>
											)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
				</div>
			</div>
			</BlockNodeShell>
		</NodeViewWrapper>
	);
};

const TableNode = Node.create({
	name: 'tableNode',
	group: 'block',
	atom: true,
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			content: {
				default: DEFAULT_TABLE_CONTENT,
				parseHTML: (element) =>
					decodeTableContent(element.getAttribute('data-content')),
				renderHTML: (attributes) => ({
					'data-content': encodeTableContent(
						normalizeTableContent(attributes.content),
					),
				}),
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'quick-table',
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'quick-table',
			mergeAttributes(HTMLAttributes, {
				class: 'quick-table-node',
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(TableNodeView);
	},

	markdownTokenName: 'tableNode',

	markdownTokenizer: {
		name: 'tableNode',
		level: 'block',
		start: findCustomBlockTagStart('quick-table'),
		tokenize(src) {
			const parsed = extractCustomBlockTag(src, 'quick-table');
			if (!parsed) {
				return undefined;
			}

			return {
				type: 'tableNode',
				raw: parsed.raw,
				attrs: parsed.attributes,
				tokens: [],
			};
		},
	},

	parseMarkdown(token, helpers) {
		const attrs = (token as { attrs?: Record<string, string> }).attrs ?? {};
		return helpers.createNode('tableNode', {
			content: decodeTableContent(attrs['data-content'] ?? ''),
		});
	},

	renderMarkdown(node) {
		const content = normalizeTableContent(node.attrs?.content);
		return `<quick-table data-content="${encodeTableContent(content)}"></quick-table>`;
	},
});

export default TableNode;
