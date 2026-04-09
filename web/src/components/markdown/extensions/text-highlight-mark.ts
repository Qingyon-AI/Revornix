'use client';

import { Mark, mergeAttributes } from '@tiptap/core';

const TextHighlightMark = Mark.create({
	name: 'textHighlight',

	addAttributes() {
		return {
			color: {
				default: '#fef08a',
				parseHTML: (element) =>
					element.getAttribute('data-highlight-color') ||
					element.style.backgroundColor ||
					'#fef08a',
				renderHTML: (attributes) => ({
					'data-highlight-color': attributes.color ?? '#fef08a',
					style: `background-color: ${attributes.color ?? '#fef08a'}`,
				}),
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'mark',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement)) {
						return false;
					}

					return {
						color:
							element.getAttribute('data-highlight-color') ||
							element.style.backgroundColor ||
							'#fef08a',
					};
				},
			},
			{
				tag: 'span[style]',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement) || !element.style.backgroundColor) {
						return false;
					}

					return {
						color: element.style.backgroundColor,
					};
				},
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return ['mark', mergeAttributes(HTMLAttributes), 0];
	},

	renderMarkdown(node, helpers) {
		const color =
			typeof node.attrs?.color === 'string' ? node.attrs.color.trim() : '#fef08a';
		const content = helpers.renderChildren(node.content ?? []);

		return `<mark data-highlight-color="${color}" style="background-color: ${color}">${content}</mark>`;
	},
});

export default TextHighlightMark;
