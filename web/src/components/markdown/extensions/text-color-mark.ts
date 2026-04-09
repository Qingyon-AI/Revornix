'use client';

import { Mark, mergeAttributes } from '@tiptap/core';

const TextColorMark = Mark.create({
	name: 'textColor',

	addAttributes() {
		return {
			color: {
				default: null,
				parseHTML: (element) => element.style.color || null,
				renderHTML: (attributes) => {
					if (!attributes.color) {
						return {};
					}

					return {
						style: `color: ${attributes.color}`,
					};
				},
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[style]',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement) || !element.style.color) {
						return false;
					}

					return {
						color: element.style.color,
					};
				},
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes(HTMLAttributes), 0];
	},

	renderMarkdown(node, helpers) {
		const color =
			typeof node.attrs?.color === 'string' ? node.attrs.color.trim() : '';
		const content = helpers.renderChildren(node.content ?? []);

		if (!color) {
			return content;
		}

		return `<span style="color: ${color}">${content}</span>`;
	},
});

export default TextColorMark;
