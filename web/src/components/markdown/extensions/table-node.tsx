'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from '@tiptap/react';
import { GripVertical, Minus, Plus, Table2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	extractCustomBlockTag,
	findCustomBlockTagStart,
} from '@/lib/markdown-custom-block';
import BlockNodeShell from './block-node-shell';

type TableCellRow = string[];
type DropPlacement = 'before' | 'after';

const DEFAULT_TABLE_CONTENT: TableCellRow[] = [
	['Header 1', 'Header 2', 'Header 3'],
	['Cell 1', 'Cell 2', 'Cell 3'],
	['Cell 4', 'Cell 5', 'Cell 6'],
];

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
			return parsed as TableCellRow[];
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
		return content as TableCellRow[];
	}

	return DEFAULT_TABLE_CONTENT;
};

const TableNodeView = ({
	node,
	editor,
	updateAttributes,
	selected,
	getPos,
}: NodeViewProps) => {
	const t = useTranslations();
	const isEditable = editor.isEditable;
	const table = normalizeTableContent(node.attrs.content);
	const columnCount = Math.max(...table.map((row) => row.length), 1);
	const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
	const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
	const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
	const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
	const [rowDropPreview, setRowDropPreview] = useState<{
		index: number;
		placement: DropPlacement;
	} | null>(null);
	const [columnDropPreview, setColumnDropPreview] = useState<{
		index: number;
		placement: DropPlacement;
	} | null>(null);

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
		if (table.length <= 2) {
			return;
		}

		commitTable(table.filter((_, currentRowIndex) => currentRowIndex !== rowIndex));
		setSelectedRowIndex((current) =>
			current === null ? null : current === rowIndex ? null : current > rowIndex ? current - 1 : current,
		);
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
		if (columnCount <= 2) {
			return;
		}

		commitTable(
			table.map((row) => row.filter((_, currentColumnIndex) => currentColumnIndex !== columnIndex)),
		);
		setSelectedColumnIndex((current) =>
			current === null ? null : current === columnIndex ? null : current > columnIndex ? current - 1 : current,
		);
	};

	const moveRow = (
		fromIndex: number,
		targetIndex: number,
		placement: DropPlacement = 'before',
	) => {
		if (fromIndex < 0 || targetIndex < 0) {
			return;
		}

		const nextTable = [...table];
		const [movedRow] = nextTable.splice(fromIndex, 1);
		let insertIndex = targetIndex + (placement === 'after' ? 1 : 0);
		if (fromIndex < insertIndex) {
			insertIndex -= 1;
		}
		if (insertIndex === fromIndex) {
			return;
		}
		nextTable.splice(insertIndex, 0, movedRow);
		commitTable(nextTable);
		setSelectedRowIndex(insertIndex);
	};

	const moveColumn = (
		fromIndex: number,
		targetIndex: number,
		placement: DropPlacement = 'before',
	) => {
		if (fromIndex < 0 || targetIndex < 0) {
			return;
		}

		let insertIndex = targetIndex + (placement === 'after' ? 1 : 0);
		if (fromIndex < insertIndex) {
			insertIndex -= 1;
		}
		if (insertIndex === fromIndex) {
			return;
		}

		const nextTable = table.map((row) => {
			const nextRow = [...row];
			const [movedCell] = nextRow.splice(fromIndex, 1);
			nextRow.splice(insertIndex, 0, movedCell);
			return nextRow;
		});
		commitTable(nextTable);
		setSelectedColumnIndex(insertIndex);
	};

	const selectRow = (rowIndex: number) => {
		setSelectedRowIndex(rowIndex);
		setSelectedColumnIndex(null);
	};

	const selectColumn = (columnIndex: number) => {
		setSelectedColumnIndex(columnIndex);
		setSelectedRowIndex(null);
	};

	const isRowSelected = (rowIndex: number) => selectedRowIndex === rowIndex;
	const isColumnSelected = (columnIndex: number) =>
		selectedColumnIndex === columnIndex;
	const hasRowSelection = selectedRowIndex !== null;
	const hasColumnSelection = selectedColumnIndex !== null;
	const getRowDropPlacement = (
		event: React.DragEvent<HTMLTableRowElement>,
	) => {
		const rect = event.currentTarget.getBoundingClientRect();
		return event.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
	};
	const getColumnDropPlacement = (
		event: React.DragEvent<HTMLTableCellElement>,
	) => {
		const rect = event.currentTarget.getBoundingClientRect();
		return event.clientX - rect.left < rect.width / 2 ? 'before' : 'after';
	};
	const isRowDropPreview = (rowIndex: number, placement: DropPlacement) =>
		rowDropPreview?.index === rowIndex && rowDropPreview.placement === placement;
	const isColumnDropPreview = (
		columnIndex: number,
		placement: DropPlacement,
	) =>
		columnDropPreview?.index === columnIndex &&
		columnDropPreview.placement === placement;
	const getCellChromeClassName = (
		rowIndex: number,
		columnIndex: number,
	) => {
		const classes: string[] = [];
		if (isRowSelected(rowIndex)) {
			classes.push('bg-primary/12');
		}
		if (isColumnSelected(columnIndex)) {
			classes.push(rowIndex === 0 ? 'bg-primary/12' : 'bg-primary/8');
		}
		if (isRowDropPreview(rowIndex, 'before')) {
			classes.push('shadow-[inset_0_3px_0_0_hsl(var(--primary))]');
		}
		if (isRowDropPreview(rowIndex, 'after')) {
			classes.push('shadow-[inset_0_-3px_0_0_hsl(var(--primary))]');
		}
		if (isColumnDropPreview(columnIndex, 'before')) {
			classes.push('shadow-[inset_3px_0_0_0_hsl(var(--primary))]');
		}
		if (isColumnDropPreview(columnIndex, 'after')) {
			classes.push('shadow-[inset_-3px_0_0_0_hsl(var(--primary))]');
		}
		return classes.join(' ');
	};

	const selectNode = () => {
		const position = typeof getPos === 'function' ? getPos() : null;
		if (typeof position !== 'number') {
			return;
		}
		editor.chain().focus().setNodeSelection(position).run();
	};

	return (
		<NodeViewWrapper>
			<BlockNodeShell
				selected={selected}
				contentClassName='p-3'>
			<div className='mb-3 flex items-center justify-between gap-3'>
				<div className='flex items-center gap-2 text-sm font-medium text-foreground'>
					<Table2 className='size-4' />
					<span>{t('document_create_table_node')}</span>
				</div>
				{isEditable && (
					<div className='flex items-center gap-2'>
						<Button type='button' variant='outline' size='sm' onClick={addRow}>
							<Plus className='size-4' />
							{t('document_create_table_add_row')}
						</Button>
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={() => removeRow()}
							disabled={table.length <= 2}>
							<Minus className='size-4' />
							{t('document_create_table_remove_row')}
						</Button>
						<Button type='button' variant='outline' size='sm' onClick={addColumn}>
							<Plus className='size-4' />
							{t('document_create_table_add_column')}
						</Button>
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={() => removeColumn()}
							disabled={columnCount <= 2}>
							<Minus className='size-4' />
							{t('document_create_table_remove_column')}
						</Button>
						{hasRowSelection && (
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() => removeRow(selectedRowIndex)}>
								<Trash2 className='size-4' />
								{t('document_create_table_delete_selected_row')}
							</Button>
						)}
						{hasColumnSelection && (
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() => removeColumn(selectedColumnIndex)}>
								<Trash2 className='size-4' />
								{t('document_create_table_delete_selected_column')}
							</Button>
						)}
					</div>
				)}
			</div>
			<div className='overflow-x-auto rounded-xl border border-border/70 bg-background'>
				<table className='w-full min-w-[520px] border-collapse'>
					<tbody>
						{isEditable && (
							<tr className='border-b border-border/60 bg-muted/15'>
								<td
									className={cn(
										'w-12 min-w-12 border-r border-border/60 bg-muted/30',
										isColumnDropPreview(0, 'before') &&
											'shadow-[inset_3px_0_0_0_hsl(var(--primary))]',
									)}
								/>
								{Array.from({ length: columnCount }, (_, columnIndex) => (
									<td
										key={`column-handle-${columnIndex}`}
										className={cn(
											'border-r border-border/60 px-2 py-1.5 last:border-r-0',
											isColumnSelected(columnIndex) && 'bg-primary/12',
											getCellChromeClassName(0, columnIndex),
										)}
										onDragOver={(event) => {
											event.preventDefault();
											if (draggedColumnIndex === null) {
												return;
											}
											setColumnDropPreview({
												index: columnIndex,
												placement: getColumnDropPlacement(event),
											});
										}}
										onDragLeave={() => {
											setColumnDropPreview((current) =>
												current?.index === columnIndex ? null : current,
											);
										}}
										onDrop={() => {
											if (draggedColumnIndex === null || !columnDropPreview) {
												return;
											}
											moveColumn(
												draggedColumnIndex,
												columnDropPreview.index,
												columnDropPreview.placement,
											);
											setDraggedColumnIndex(null);
											setColumnDropPreview(null);
										}}>
										<button
											type='button'
											draggable
											onClick={() => selectColumn(columnIndex)}
											onDragStart={() => {
												selectColumn(columnIndex);
												setDraggedColumnIndex(columnIndex);
											}}
											onDragEnd={() => {
												setDraggedColumnIndex(null);
												setColumnDropPreview(null);
											}}
											className={cn(
												'flex w-full items-center justify-center rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground',
												isColumnSelected(columnIndex) && 'bg-primary/14 text-foreground',
											)}>
											<GripVertical className='size-4 rotate-90' />
										</button>
									</td>
								))}
							</tr>
						)}
						{table.map((row, rowIndex) => (
							<tr
								key={rowIndex}
								className={cn(
									'border-b border-border/60 last:border-b-0',
									isRowSelected(rowIndex) && 'bg-primary/6',
								)}
								onDragOver={(event) => {
									if (!isEditable) {
										return;
									}
									event.preventDefault();
									if (draggedRowIndex === null) {
										return;
									}
									setRowDropPreview({
										index: rowIndex,
										placement: getRowDropPlacement(event),
									});
								}}
								onDragLeave={() => {
									setRowDropPreview((current) =>
										current?.index === rowIndex ? null : current,
									);
								}}
								onDrop={() => {
									if (draggedRowIndex === null || !rowDropPreview) {
										return;
									}
									moveRow(
										draggedRowIndex,
										rowDropPreview.index,
										rowDropPreview.placement,
									);
									setDraggedRowIndex(null);
									setRowDropPreview(null);
								}}>
								{isEditable && (
									<td
										className={cn(
											'w-12 min-w-12 border-r border-border/60 bg-muted/20 px-1.5 py-1 align-top',
											isRowSelected(rowIndex) && 'bg-primary/12',
											isRowDropPreview(rowIndex, 'before') &&
												'shadow-[inset_0_3px_0_0_hsl(var(--primary))]',
											isRowDropPreview(rowIndex, 'after') &&
												'shadow-[inset_0_-3px_0_0_hsl(var(--primary))]',
										)}>
										<button
											type='button'
											draggable
											onClick={() => selectRow(rowIndex)}
											onDragStart={() => {
												selectRow(rowIndex);
												setDraggedRowIndex(rowIndex);
											}}
											onDragEnd={() => {
												setDraggedRowIndex(null);
												setRowDropPreview(null);
											}}
											className={cn(
												'flex w-full items-center justify-center rounded-md px-2 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground',
												isRowSelected(rowIndex) && 'bg-primary/14 text-foreground',
											)}>
											<GripVertical className='size-4' />
										</button>
									</td>
								)}
								{Array.from({ length: columnCount }, (_, cellIndex) => {
									const cellValue = row[cellIndex] ?? '';
									const sharedClassName =
										'min-h-11 w-full border-0 bg-transparent px-3 py-2 text-sm outline-none';
									const cellSelected =
										isRowSelected(rowIndex) || isColumnSelected(cellIndex);

									return rowIndex === 0 ? (
										<th
											key={`${rowIndex}-${cellIndex}`}
											className={cn(
												'border-r border-border/60 bg-muted/40 text-left last:border-r-0',
												cellSelected && 'bg-primary/12',
												getCellChromeClassName(rowIndex, cellIndex),
											)}>
											{isEditable ? (
												<input
													value={cellValue}
													onFocus={() => {
														setSelectedRowIndex(null);
														setSelectedColumnIndex(null);
													}}
													onChange={(event) =>
														updateCell(rowIndex, cellIndex, event.target.value)
													}
													className={cn(sharedClassName, 'font-semibold')}
												/>
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
												'border-r border-border/60 align-top last:border-r-0',
												cellSelected && 'bg-primary/8',
												getCellChromeClassName(rowIndex, cellIndex),
											)}>
											{isEditable ? (
												<input
													value={cellValue}
													onFocus={() => {
														setSelectedRowIndex(null);
														setSelectedColumnIndex(null);
													}}
													onChange={(event) =>
														updateCell(rowIndex, cellIndex, event.target.value)
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
