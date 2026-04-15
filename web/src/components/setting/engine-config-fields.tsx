'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AIModelSelect from '@/components/ai/model-select';
import { FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import MultipleSelector from '@/components/ui/multiple-selector';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertTriangle, CircleHelp, Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

type JsonLike = string | number | boolean | Record<string, unknown> | unknown[];
type ConfigRecord = Record<string, JsonLike | undefined>;

type EngineConfigFieldsProps = {
	engineUuid?: string | null;
	engineName?: string | null;
	engineNameZh?: string | null;
	value?: string | null;
	disabled?: boolean;
	onChange: (value: string) => void;
};

type FieldType =
	| 'text'
	| 'secret'
	| 'textarea'
	| 'number'
	| 'boolean'
	| 'json'
	| 'select'
	| 'model'
	| 'speakers';

type FieldOption = {
	value: string;
	labelKey?: string;
	fallbackLabel: string;
};

type FieldCatalogEntry = {
	labelKey?: string;
	placeholderKey?: string;
	tooltipKey?: string;
	fallbackLabel?: string;
	fallbackPlaceholder?: string;
	fallbackTooltip?: string;
	type?: FieldType;
	options?: FieldOption[];
};

type FieldSpec = {
	key: string;
	descriptionKey?: string;
};

type FieldDefinition = {
	key: string;
	label: string;
	type: FieldType;
	placeholder?: string;
	description?: string;
	tooltip?: string;
	options?: FieldOption[];
};

const FIELD_CATALOG: Record<string, FieldCatalogEntry> = {
	api_key: {
		labelKey: 'setting_engine_field_api_key_label',
		placeholderKey: 'setting_engine_field_api_key_placeholder',
		tooltipKey: 'setting_engine_field_api_key_tooltip',
		fallbackLabel: 'API Key',
		fallbackPlaceholder: 'sk-...',
		fallbackTooltip:
			'The credential used to call the upstream engine API. You can usually create it from the provider dashboard or API key page.',
		type: 'secret',
	},
	openai_api_key: {
		labelKey: 'setting_engine_field_openai_api_key_label',
		placeholderKey: 'setting_engine_field_openai_api_key_placeholder',
		tooltipKey: 'setting_engine_field_openai_api_key_tooltip',
		fallbackLabel: 'OpenAI API Key',
		fallbackPlaceholder: 'sk-proj-...',
		fallbackTooltip:
			'The OpenAI key passed into MarkItDown for richer parsing, especially for images and more complex content.',
		type: 'secret',
	},
	base_url: {
		labelKey: 'setting_engine_field_base_url_label',
		placeholderKey: 'setting_engine_field_base_url_placeholder',
		tooltipKey: 'setting_engine_field_base_url_tooltip',
		fallbackLabel: 'Base URL',
		fallbackPlaceholder: 'https://api.example.com',
		fallbackTooltip:
			'The root endpoint used to send requests. Use the provider default unless you are routing through a proxy, gateway, or self-hosted compatible service.',
	},
	model_name: {
		labelKey: 'setting_engine_field_model_name_label',
		placeholderKey: 'setting_engine_field_model_name_placeholder',
		tooltipKey: 'setting_engine_field_model_name_tooltip',
		fallbackLabel: 'Model Name',
		fallbackPlaceholder: 'gpt-4.1-mini',
		fallbackTooltip:
			'The exact upstream model identifier. This decides which provider model Revornix actually uses.',
	},
	token: {
		labelKey: 'setting_engine_field_token_label',
		placeholderKey: 'setting_engine_field_token_placeholder',
		tooltipKey: 'setting_engine_field_token_tooltip',
		fallbackLabel: 'Token',
		fallbackPlaceholder: 'Enter your access token',
		fallbackTooltip:
			'The access token required by this engine provider. Copy it from the engine service console or developer portal.',
		type: 'secret',
	},
	uid: {
		labelKey: 'setting_engine_field_uid_label',
		placeholderKey: 'setting_engine_field_uid_placeholder',
		tooltipKey: 'setting_engine_field_uid_tooltip',
		fallbackLabel: 'UID',
		fallbackPlaceholder: 'Your provider user id',
		fallbackTooltip:
			'The user identifier issued by the provider. MinerU API uses it in request validation and checksum-related logic.',
	},
	appid: {
		labelKey: 'setting_engine_field_appid_label',
		placeholderKey: 'setting_engine_field_appid_placeholder',
		tooltipKey: 'setting_engine_field_appid_tooltip',
		fallbackLabel: 'App ID',
		fallbackPlaceholder: 'Your application id',
		fallbackTooltip:
			'The application ID for this engine integration. You can find it in the provider app or project settings page.',
	},
	access_token: {
		labelKey: 'setting_engine_field_access_token_label',
		placeholderKey: 'setting_engine_field_access_token_placeholder',
		tooltipKey: 'setting_engine_field_access_token_tooltip',
		fallbackLabel: 'Access Token',
		fallbackPlaceholder: 'Your service access token',
		fallbackTooltip:
			'The access token used for authenticated requests to the provider service.',
		type: 'secret',
	},
	access_key_id: {
		labelKey: 'setting_engine_field_access_key_id_label',
		placeholderKey: 'setting_engine_field_access_key_id_placeholder',
		tooltipKey: 'setting_engine_field_access_key_id_tooltip',
		fallbackLabel: 'Access Key ID',
		fallbackPlaceholder: 'AKIA...',
		fallbackTooltip:
			'The public key identifier used in signed requests. Create or view it from the cloud provider credential management page.',
	},
	secret_access_key: {
		labelKey: 'setting_engine_field_secret_access_key_label',
		placeholderKey: 'setting_engine_field_secret_access_key_placeholder',
		tooltipKey: 'setting_engine_field_secret_access_key_tooltip',
		fallbackLabel: 'Secret Access Key',
		fallbackPlaceholder: 'Enter your secret access key',
		fallbackTooltip:
			'The private secret paired with the access key ID. Most providers only show it once when the key is created.',
		type: 'secret',
	},
	req_key: {
		labelKey: 'setting_engine_field_req_key_label',
		placeholderKey: 'setting_engine_field_req_key_placeholder',
		tooltipKey: 'setting_engine_field_req_key_tooltip',
		fallbackLabel: 'Request Key',
		fallbackPlaceholder: 'high_aes_general_v21_L',
		fallbackTooltip:
			'The upstream request key or capability key used by the image service to decide which generation pipeline to run.',
	},
	region: {
		labelKey: 'setting_engine_field_region_label',
		placeholderKey: 'setting_engine_field_region_placeholder',
		tooltipKey: 'setting_engine_field_region_tooltip',
		fallbackLabel: 'Region',
		fallbackPlaceholder: 'cn-north-1',
		fallbackTooltip:
			'The provider region where requests are routed, such as `cn-north-1`.',
	},
	service: {
		labelKey: 'setting_engine_field_service_label',
		placeholderKey: 'setting_engine_field_service_placeholder',
		tooltipKey: 'setting_engine_field_service_tooltip',
		fallbackLabel: 'Service',
		fallbackPlaceholder: 'cv',
		fallbackTooltip:
			'The provider service code used in signature generation or request routing.',
	},
	action: {
		labelKey: 'setting_engine_field_action_label',
		placeholderKey: 'setting_engine_field_action_placeholder',
		tooltipKey: 'setting_engine_field_action_tooltip',
		fallbackLabel: 'Action',
		fallbackPlaceholder: 'CVProcess',
		fallbackTooltip:
			'The provider action name used by the API endpoint.',
	},
	version: {
		labelKey: 'setting_engine_field_version_label',
		placeholderKey: 'setting_engine_field_version_placeholder',
		tooltipKey: 'setting_engine_field_version_tooltip',
		fallbackLabel: 'Version',
		fallbackPlaceholder: '2022-08-31',
		fallbackTooltip: 'The API version string required by the provider.',
	},
	size: {
		labelKey: 'setting_engine_field_size_label',
		placeholderKey: 'setting_engine_field_size_placeholder',
		tooltipKey: 'setting_engine_field_size_tooltip',
		fallbackLabel: 'Size',
		fallbackPlaceholder: '2048x2048',
		fallbackTooltip:
			'The target image size. Follow the provider format, such as `1024x1024` or `2048*2048`.',
	},
	negative_prompt: {
		labelKey: 'setting_engine_field_negative_prompt_label',
		placeholderKey: 'setting_engine_field_negative_prompt_placeholder',
		tooltipKey: 'setting_engine_field_negative_prompt_tooltip',
		fallbackLabel: 'Negative Prompt',
		fallbackPlaceholder: 'low quality, blurry',
		fallbackTooltip:
			'Optional instructions describing what the generated result should avoid.',
		type: 'textarea',
	},
	seed: {
		labelKey: 'setting_engine_field_seed_label',
		placeholderKey: 'setting_engine_field_seed_placeholder',
		tooltipKey: 'setting_engine_field_seed_tooltip',
		fallbackLabel: 'Seed',
		fallbackPlaceholder: '123456',
		fallbackTooltip:
			'Optional numeric seed for more reproducible generation output.',
		type: 'number',
	},
	scale: {
		labelKey: 'setting_engine_field_scale_label',
		placeholderKey: 'setting_engine_field_scale_placeholder',
		tooltipKey: 'setting_engine_field_scale_tooltip',
		fallbackLabel: 'Scale',
		fallbackPlaceholder: '3.5',
		fallbackTooltip:
			'Optional generation guidance scale used by some image APIs.',
		type: 'number',
	},
	width: {
		labelKey: 'setting_engine_field_width_label',
		placeholderKey: 'setting_engine_field_width_placeholder',
		tooltipKey: 'setting_engine_field_width_tooltip',
		fallbackLabel: 'Width',
		fallbackPlaceholder: '1024',
		fallbackTooltip:
			'Optional explicit output width. Use it when your provider supports width and height separately.',
		type: 'number',
	},
	height: {
		labelKey: 'setting_engine_field_height_label',
		placeholderKey: 'setting_engine_field_height_placeholder',
		tooltipKey: 'setting_engine_field_height_tooltip',
		fallbackLabel: 'Height',
		fallbackPlaceholder: '1024',
		fallbackTooltip:
			'Optional explicit output height. Use it when your provider supports width and height separately.',
		type: 'number',
	},
	return_url: {
		labelKey: 'setting_engine_field_return_url_label',
		tooltipKey: 'setting_engine_field_return_url_tooltip',
		fallbackLabel: 'Return URL',
		fallbackTooltip:
			'If enabled, the engine prefers returning a hosted image URL when the provider supports it.',
		type: 'boolean',
	},
	use_pre_llm: {
		labelKey: 'setting_engine_field_use_pre_llm_label',
		tooltipKey: 'setting_engine_field_use_pre_llm_tooltip',
		fallbackLabel: 'Use Pre LLM',
		fallbackTooltip:
			'If enabled, the upstream flow may run an extra prompt-refinement step before image generation.',
		type: 'boolean',
	},
	prompt_extend: {
		labelKey: 'setting_engine_field_prompt_extend_label',
		tooltipKey: 'setting_engine_field_prompt_extend_tooltip',
		fallbackLabel: 'Prompt Extend',
		fallbackTooltip:
			'Allows the provider to expand or enhance the prompt automatically before generating the image.',
		type: 'boolean',
	},
	watermark: {
		labelKey: 'setting_engine_field_watermark_label',
		tooltipKey: 'setting_engine_field_watermark_tooltip',
		fallbackLabel: 'Watermark',
		fallbackTooltip:
			'Controls whether the provider should add its watermark or watermark metadata to the generated result.',
		type: 'boolean',
	},
	generation_mode: {
		labelKey: 'setting_engine_field_generation_mode_label',
		placeholderKey: 'setting_engine_field_generation_mode_placeholder',
		tooltipKey: 'setting_engine_field_generation_mode_tooltip',
		fallbackLabel: 'Generation Mode',
		fallbackPlaceholder: 'Select generation mode',
		fallbackTooltip:
			'Controls how the podcast content is generated. `summary` sends long text directly, `prompt` uses topic-based online generation, and `dialogue` generates two-speaker turns first.',
		type: 'select',
		options: [
			{
				value: 'summary',
				labelKey: 'setting_engine_field_generation_mode_option_summary',
				fallbackLabel: 'summary',
			},
			{
				value: 'prompt',
				labelKey: 'setting_engine_field_generation_mode_option_prompt',
				fallbackLabel: 'prompt',
			},
			{
				value: 'dialogue',
				labelKey: 'setting_engine_field_generation_mode_option_dialogue',
				fallbackLabel: 'dialogue',
			},
		],
	},
	dialogue_model_id: {
		labelKey: 'setting_engine_field_script_model_id_label',
		placeholderKey: 'setting_engine_field_dialogue_model_id_placeholder',
		tooltipKey: 'setting_engine_field_script_model_id_tooltip',
		fallbackLabel: 'Script Generation Model',
		fallbackPlaceholder: 'Default document reader model id',
		fallbackTooltip:
			'Used by dialogue podcast mode to choose which text model writes the conversation script. If omitted, Revornix falls back to the default document reader model.',
		type: 'model',
	},
	scene: {
		labelKey: 'setting_engine_field_scene_label',
		placeholderKey: 'setting_engine_field_scene_placeholder',
		tooltipKey: 'setting_engine_field_scene_tooltip',
		fallbackLabel: 'Scene',
		fallbackPlaceholder: 'deep_research',
		fallbackTooltip:
			'An optional provider-specific scene hint that influences upstream generation behavior.',
	},
	speaker_info: {
		labelKey: 'setting_engine_field_speaker_info_label',
		placeholderKey: 'setting_engine_field_speaker_info_placeholder',
		tooltipKey: 'setting_engine_field_speaker_info_tooltip',
		fallbackLabel: 'Speaker Info',
		fallbackPlaceholder: '{"speakers":["BV001_streaming","BV002_streaming"]}',
		fallbackTooltip:
			'Advanced speaker configuration in JSON. The most important part is the `speakers` array used to select voices.',
		type: 'speakers',
	},
	speaker_additions: {
		labelKey: 'setting_engine_field_speaker_additions_label',
		placeholderKey: 'setting_engine_field_speaker_additions_placeholder',
		tooltipKey: 'setting_engine_field_speaker_additions_tooltip',
		fallbackLabel: 'Speaker Additions',
		fallbackPlaceholder:
			'{"speaker_id_1":{"model":"seed-tts-2.0-standard"}}',
		fallbackTooltip:
			'Optional JSON map for advanced TTS or ICL cloned voice additions, such as model selection for specific speakers.',
		type: 'json',
	},
	audio_config: {
		labelKey: 'setting_engine_field_audio_config_label',
		placeholderKey: 'setting_engine_field_audio_config_placeholder',
		tooltipKey: 'setting_engine_field_audio_config_tooltip',
		fallbackLabel: 'Audio Config',
		fallbackPlaceholder:
			'{"format":"mp3","sample_rate":24000,"speech_rate":0}',
		fallbackTooltip:
			'Advanced output audio settings in JSON, such as format, sample rate, and speech rate.',
		type: 'json',
	},
	input_info: {
		labelKey: 'setting_engine_field_input_info_label',
		placeholderKey: 'setting_engine_field_input_info_placeholder',
		tooltipKey: 'setting_engine_field_input_info_tooltip',
		fallbackLabel: 'Input Info',
		fallbackPlaceholder:
			'{"return_audio_url":true,"input_text_max_length":12000}',
		fallbackTooltip:
			'Optional extra input controls in JSON, including URL mode, truncation limits, and final audio URL return.',
		type: 'json',
	},
	aigc_metadata: {
		labelKey: 'setting_engine_field_aigc_metadata_label',
		placeholderKey: 'setting_engine_field_aigc_metadata_placeholder',
		tooltipKey: 'setting_engine_field_aigc_metadata_tooltip',
		fallbackLabel: 'AIGC Metadata',
		fallbackPlaceholder:
			'{"enable":true,"content_producer":"revornix","produce_id":"demo-001"}',
		fallbackTooltip:
			'Optional metadata payload for implicit watermark headers. It is only effective for supported audio formats such as mp3, wav, and ogg_opus, and should usually include `enable: true`.',
		type: 'json',
	},
	use_head_music: {
		labelKey: 'setting_engine_field_use_head_music_label',
		tooltipKey: 'setting_engine_field_use_head_music_tooltip',
		fallbackLabel: 'Use Head Music',
		fallbackTooltip:
			'Whether the generated podcast should add intro music automatically.',
		type: 'boolean',
	},
	use_tail_music: {
		labelKey: 'setting_engine_field_use_tail_music_label',
		tooltipKey: 'setting_engine_field_use_tail_music_tooltip',
		fallbackLabel: 'Use Tail Music',
		fallbackTooltip:
			'Whether the generated podcast should add outro music automatically.',
		type: 'boolean',
	},
	aigc_watermark: {
		labelKey: 'setting_engine_field_aigc_watermark_label',
		tooltipKey: 'setting_engine_field_aigc_watermark_tooltip',
		fallbackLabel: 'AIGC Watermark',
		fallbackTooltip:
			'Whether to include an AIGC watermark marker in the generated audio result.',
		type: 'boolean',
	},
};

const ENGINE_UUID_SCHEMAS: Record<string, string> = {
	'e31849ffa7f84a2cb4e2fa2ea00f25d2': 'jina',
	'9188ddca93ff4c2bb97fa252723c6c13': 'markitdown',
	'd90eabd6ce9e42da98ba6168cb189b70': 'mineru_api',
	'142d5cc7db8c42d0bc1ad1f24d4b6cd4': 'openai_tts',
	'f2286c251b0b4650b60b6b9b48ea3cce': 'volc_tts',
	'9d6cc831e9924d4995d6f490b47a59f3': 'volc_stt_standard',
	'86a7083d4e994b86819a960bd51e9a1c': 'volc_stt_fast',
	'7f09db37f3f04b23832a518f5f25fa9b': 'volc_image',
	'9f1fb0005a99483da191a38af6dc7a23': 'banana_image',
	'd5daed7e73144af3b2ad7410976f9424': 'bailian_image',
	'c5f2670915994b1f80bc9cf2517343a4': 'kimi_image_understand',
};

const ENGINE_SCHEMAS: Record<string, FieldSpec[]> = {
	jina: [{ key: 'api_key' }],
	markitdown: [{ key: 'openai_api_key' }],
	mineru_api: [{ key: 'token' }, { key: 'uid' }],
	openai_tts: [{ key: 'base_url' }, { key: 'api_key' }, { key: 'model_name' }],
	volc_tts: [
		{ key: 'appid' },
		{ key: 'access_token' },
		{ key: 'base_url' },
		{
			key: 'generation_mode',
			descriptionKey: 'setting_engine_config_desc_generation_mode',
		},
		{ key: 'dialogue_model_id' },
		{ key: 'scene' },
		{ key: 'use_head_music' },
		{ key: 'use_tail_music' },
		{ key: 'aigc_watermark' },
		{ key: 'aigc_metadata', descriptionKey: 'setting_engine_config_desc_json' },
		{ key: 'speaker_info' },
	],
	volc_stt_standard: [{ key: 'token' }, { key: 'appid' }],
	volc_stt_fast: [{ key: 'token' }, { key: 'appid' }],
	banana_image: [
		{ key: 'api_key' },
		{ key: 'base_url' },
		{ key: 'model_name' },
	],
	bailian_image: [
		{ key: 'api_key' },
		{ key: 'base_url' },
		{ key: 'model_name' },
		{ key: 'size', descriptionKey: 'setting_engine_config_desc_size' },
		{ key: 'negative_prompt' },
		{
			key: 'prompt_extend',
			descriptionKey: 'setting_engine_config_desc_prompt_extend',
		},
		{ key: 'watermark' },
		{ key: 'seed' },
	],
	volc_image: [
		{ key: 'access_key_id' },
		{ key: 'secret_access_key' },
		{ key: 'base_url' },
		{ key: 'region' },
		{ key: 'service' },
		{ key: 'action' },
		{ key: 'version' },
		{ key: 'req_key' },
		{ key: 'scale' },
		{ key: 'width' },
		{ key: 'height' },
		{ key: 'use_pre_llm' },
		{ key: 'return_url', descriptionKey: 'setting_engine_config_desc_return_url' },
	],
	kimi_image_understand: [
		{ key: 'api_key' },
		{ key: 'base_url' },
		{ key: 'model_name' },
	],
};

const normalizeObject = (value?: string | null): Record<string, unknown> => {
	if (!value?.trim()) {
		return {};
	}

	try {
		const parsed = JSON.parse(value);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		return {};
	}

	return {};
};

const VOLC_PODCAST_SPEAKER_OPTIONS = [
	{
		value: 'zh_male_dayixiansheng_v2_saturn_bigtts',
		label: '黑猫侦探社大义',
	},
	{
		value: 'zh_female_mizaitongxue_v2_saturn_bigtts',
		label: '黑猫侦探社咪仔',
	},
	{
		value: 'zh_male_liufei_v2_saturn_bigtts',
		label: '刘飞',
	},
	{
		value: 'zh_male_xiaolei_v2_saturn_bigtts',
		label: '潇磊',
	},
];

const resolveEngineSchemaKey = ({
	engineUuid,
}: {
	engineUuid?: string | null;
}) => {
	if (engineUuid) {
		const byUuid = ENGINE_UUID_SCHEMAS[engineUuid];
		if (byUuid) {
			return byUuid;
		}
	}
	return '';
};

const translateOrFallback = (
	t: ReturnType<typeof useTranslations>,
	key: string | undefined,
	fallback?: string,
) => {
	if (!key) {
		return fallback;
	}
	try {
		const translated = t(key as never);
		return translated === key ? fallback : translated;
	} catch {
		return fallback;
	}
};

const prettifyKey = (key: string) => {
	return key
		.split(/[_-]+/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
};

const inferFieldType = (
	catalogEntry: FieldCatalogEntry | undefined,
	exampleValue: unknown,
): FieldType => {
	if (catalogEntry?.type) {
		return catalogEntry.type;
	}
	if (typeof exampleValue === 'boolean') {
		return 'boolean';
	}
	if (typeof exampleValue === 'number') {
		return 'number';
	}
	if (
		exampleValue &&
		(typeof exampleValue === 'object' || Array.isArray(exampleValue))
	) {
		return 'json';
	}
	if (typeof exampleValue === 'string' && exampleValue.includes('\n')) {
		return 'textarea';
	}
	return 'text';
};

const toPlaceholder = (value: unknown) => {
	if (typeof value === 'string' || typeof value === 'number') {
		return String(value);
	}
	if (value && typeof value === 'object') {
		try {
			return JSON.stringify(value);
		} catch {
			return undefined;
		}
	}
	return undefined;
};

const createFieldDefinition = ({
	t,
	spec,
	currentValues,
}: {
	t: ReturnType<typeof useTranslations>;
	spec: FieldSpec;
	currentValues: Record<string, unknown>;
}): FieldDefinition => {
	const catalogEntry = FIELD_CATALOG[spec.key];
	const exampleValue = currentValues[spec.key];

	return {
		key: spec.key,
		label:
			translateOrFallback(
				t,
				catalogEntry?.labelKey,
				catalogEntry?.fallbackLabel ?? prettifyKey(spec.key),
			) ?? prettifyKey(spec.key),
		type: inferFieldType(catalogEntry, exampleValue),
		placeholder: translateOrFallback(
			t,
			catalogEntry?.placeholderKey,
			catalogEntry?.fallbackPlaceholder,
		),
		tooltip: translateOrFallback(
			t,
			catalogEntry?.tooltipKey,
			catalogEntry?.fallbackTooltip,
		),
		description: spec.descriptionKey
			? t(spec.descriptionKey as never)
			: undefined,
		options: catalogEntry?.options,
	};
};

const buildFieldDefinitions = ({
	t,
	engineUuid,
	currentValues,
}: {
	t: ReturnType<typeof useTranslations>;
	engineUuid?: string | null;
	currentValues: Record<string, unknown>;
}): FieldDefinition[] => {
	const schemaKey = resolveEngineSchemaKey({
		engineUuid,
	});
	const schema = ENGINE_SCHEMAS[schemaKey];

	if (schema) {
		return schema.map((spec) =>
			createFieldDefinition({
				t,
				spec,
				currentValues,
			}),
		);
	}

	return Object.keys(currentValues)
		.sort((a, b) => a.localeCompare(b))
		.map((key) =>
			createFieldDefinition({
				t,
				spec: { key },
				currentValues,
			}),
		);
};

const toInitialFieldValue = (
	field: FieldDefinition,
	currentValue: unknown,
): JsonLike | undefined => {
	if (field.type === 'boolean') {
		if (typeof currentValue === 'boolean') return currentValue;
		return false;
	}
	if (field.type === 'number') {
		if (typeof currentValue === 'number') return currentValue;
		return undefined;
	}
	if (field.type === 'model') {
		if (typeof currentValue === 'number') return currentValue;
		if (typeof currentValue === 'string' && currentValue.trim() !== '') {
			const parsed = Number(currentValue);
			return Number.isNaN(parsed) ? undefined : parsed;
		}
		return undefined;
	}
	if (field.type === 'speakers') {
		if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
			const speakers = (currentValue as Record<string, unknown>).speakers;
			if (Array.isArray(speakers)) {
				return speakers
					.map((speaker) => String(speaker).trim())
					.filter(Boolean)
					.slice(0, 2);
			}
		}
		return [];
	}
	if (field.type === 'json') {
		if (currentValue && typeof currentValue === 'object') {
			return JSON.stringify(currentValue, null, 2);
		}
		return '';
	}
	if (field.type === 'select') {
		return typeof currentValue === 'string' ? currentValue : '';
	}
	return typeof currentValue === 'string' ? currentValue : '';
};

const parseJsonLikeObject = (value: JsonLike | undefined) => {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}

	if (typeof value === 'string' && value.trim() !== '') {
		try {
			const parsed = JSON.parse(value);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				return parsed as Record<string, unknown>;
			}
		} catch {
			return undefined;
		}
	}

	return undefined;
};

const resolveAudioFormat = (values: ConfigRecord) => {
	const audioConfig = parseJsonLikeObject(values.audio_config);
	const rawFormat = audioConfig?.format;
	if (typeof rawFormat === 'string' && rawFormat.trim() !== '') {
		return rawFormat.trim().toLowerCase();
	}
	return 'mp3';
};

const isFieldVisible = (field: FieldDefinition, values: ConfigRecord) => {
	if (field.key === 'dialogue_model_id') {
		return values.generation_mode === 'dialogue';
	}
	if (field.key === 'scene') {
		return values.generation_mode === 'prompt';
	}
	if (field.key === 'aigc_metadata') {
		const supportedFormats = new Set(['mp3', 'wav', 'ogg_opus']);
		return (
			Boolean(values.aigc_watermark) &&
			supportedFormats.has(resolveAudioFormat(values))
		);
	}
	return true;
};

const sanitizeConfigValues = (
	values: ConfigRecord,
	fields: FieldDefinition[],
): Record<string, unknown> => {
	const result: Record<string, unknown> = {};

	fields.forEach((field) => {
		if (!isFieldVisible(field, values)) {
			return;
		}

		const value = values[field.key];
		if (field.type === 'boolean') {
			if (typeof value === 'boolean') {
				result[field.key] = value;
			}
			return;
		}
		if (field.type === 'number') {
			if (typeof value === 'number' && !Number.isNaN(value)) {
				result[field.key] = value;
			}
			return;
		}
		if (field.type === 'model') {
			if (typeof value === 'number' && !Number.isNaN(value)) {
				result[field.key] = value;
			}
			return;
		}
		if (field.type === 'speakers') {
			if (Array.isArray(value)) {
				const speakers = value
					.map((speaker) => String(speaker).trim())
					.filter(Boolean)
					.slice(0, 2);
				if (speakers.length > 0) {
					result[field.key] = { speakers };
				}
			}
			return;
		}
		if (field.type === 'json') {
			if (typeof value === 'string' && value.trim() !== '') {
				try {
					result[field.key] = JSON.parse(value);
				} catch {
					result[field.key] = value;
				}
			}
			return;
		}
		if (field.type === 'select') {
			if (typeof value === 'string' && value.trim() !== '') {
				result[field.key] = value;
			}
			return;
		}
		if (typeof value === 'string' && value.trim() !== '') {
			result[field.key] = value;
		}
	});

	return result;
};

const serializeConfigValues = (
	values: ConfigRecord,
	fields: FieldDefinition[],
) => {
	const next = sanitizeConfigValues(values, fields);
	return Object.keys(next).length > 0 ? JSON.stringify(next) : '';
};

const EngineConfigFields = ({
	engineUuid,
	engineName,
	engineNameZh,
	value,
	disabled = false,
	onChange,
}: EngineConfigFieldsProps) => {
	const t = useTranslations();
	const currentValues = useMemo(() => normalizeObject(value), [value]);
	const fields = useMemo(
		() =>
			buildFieldDefinitions({
				t,
				engineUuid,
				currentValues,
			}),
		[t, engineUuid, currentValues],
	);
	const hasInvalidConfig =
		Boolean(value?.trim()) && Object.keys(currentValues).length === 0;
	const [configValues, setConfigValues] = useState<ConfigRecord>({});
	const lastEmittedValueRef = useRef<string>(value ?? '');
	const visibleFields = useMemo(
		() => fields.filter((field) => isFieldVisible(field, configValues)),
		[fields, configValues],
	);

	useEffect(() => {
		const nextValues: ConfigRecord = {};
		fields.forEach((field) => {
			nextValues[field.key] = toInitialFieldValue(
				field,
				currentValues[field.key],
			);
		});
		setConfigValues((current) => {
			const currentSerialized = JSON.stringify(current);
			const nextSerialized = JSON.stringify(nextValues);
			return currentSerialized === nextSerialized ? current : nextValues;
		});
		lastEmittedValueRef.current = value ?? '';
	}, [currentValues, fields, value]);

	const updateConfigValue = (key: string, nextValue: JsonLike | undefined) => {
		setConfigValues((current) => {
			const nextValues = {
				...current,
				[key]: nextValue,
			};
			const serialized = serializeConfigValues(nextValues, fields);
			if (serialized !== lastEmittedValueRef.current) {
				lastEmittedValueRef.current = serialized;
				onChange(serialized);
			}
			return nextValues;
		});
	};

	if (hasInvalidConfig) {
		return (
			<Alert variant='destructive'>
				<AlertTriangle className='h-4 w-4' />
				<AlertTitle>{t('setting_engine_config_invalid_title')}</AlertTitle>
				<AlertDescription>
					{t('setting_engine_config_invalid_description')}
				</AlertDescription>
			</Alert>
		);
	}

	if (fields.length === 0) {
		return (
			<Alert>
				<Settings2 className='h-4 w-4' />
				<AlertTitle>{t('setting_engine_config_empty_title')}</AlertTitle>
				<AlertDescription>
					{t('setting_engine_config_empty_description')}
				</AlertDescription>
			</Alert>
		);
	}

		return (
		<div className='space-y-4'>
			{visibleFields.map((field) => (
				<div key={field.key} className='grid grid-cols-12 gap-2'>
					<div className='col-span-3 flex items-center gap-1.5'>
						<FormLabel className='leading-6'>{field.label}</FormLabel>
						{field.tooltip ? (
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type='button'
										className='inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground'
										aria-label={t('setting_config_about_field', {
											field: field.label,
										})}>
										<CircleHelp className='size-3.5' />
									</button>
								</TooltipTrigger>
								<TooltipContent side='right' className='max-w-72 leading-5'>
									{field.tooltip}
								</TooltipContent>
							</Tooltip>
						) : null}
					</div>
					<div className='col-span-9 space-y-2'>
						{field.type === 'boolean' ? (
							<div className='flex min-h-10 items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2'>
								<span className='text-sm text-muted-foreground'>
									{Boolean(configValues[field.key])
										? t('setting_config_enabled')
										: t('setting_config_disabled')}
								</span>
								<Switch
									disabled={disabled}
									checked={Boolean(configValues[field.key])}
									onCheckedChange={(checked) => {
										updateConfigValue(field.key, checked);
									}}
								/>
							</div>
						) : field.type === 'textarea' || field.type === 'json' ? (
							<Textarea
								disabled={disabled}
								className={
									field.type === 'json' ? 'font-mono text-xs' : undefined
								}
								value={
									typeof configValues[field.key] === 'string'
										? (configValues[field.key] as string)
										: ''
								}
								placeholder={field.placeholder}
								onChange={(event) => {
									updateConfigValue(field.key, event.target.value);
								}}
							/>
						) : field.type === 'select' ? (
							<Select
								disabled={disabled}
								value={
									typeof configValues[field.key] === 'string'
										? (configValues[field.key] as string)
										: ''
								}
								onValueChange={(nextValue) => {
									updateConfigValue(field.key, nextValue);
								}}>
								<SelectTrigger className='w-full'>
									<SelectValue placeholder={field.placeholder} />
								</SelectTrigger>
								<SelectContent>
									{field.options?.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{translateOrFallback(
												t,
												option.labelKey,
												option.fallbackLabel,
											) ?? option.fallbackLabel}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : field.type === 'model' ? (
							<AIModelSelect
								value={
									typeof configValues[field.key] === 'number'
										? (configValues[field.key] as number)
										: undefined
								}
								onChange={(nextValue) => {
									updateConfigValue(field.key, nextValue);
								}}
								disabled={disabled}
								className='border-input h-9 w-full rounded-md bg-transparent px-3 py-1 shadow-xs hover:bg-transparent'
								placeholder={field.placeholder}
								size='default'
							/>
						) : field.type === 'speakers' ? (
							<MultipleSelector
								placeholder={field.placeholder ?? field.label}
								maxSelected={2}
								value={
									Array.isArray(configValues[field.key])
										? ((configValues[field.key] as unknown[]).map((item) =>
												String(item),
											) as string[])
										: []
								}
								onChange={(nextValue) => {
									updateConfigValue(
										field.key,
										nextValue.map((item) => item.value),
									);
								}}
								options={VOLC_PODCAST_SPEAKER_OPTIONS}
								hasMore={false}
							/>
						) : (
							<Input
								disabled={disabled}
								type={
									field.type === 'secret'
										? 'password'
										: field.type === 'number'
											? 'number'
											: 'text'
								}
								value={
									field.type === 'number'
										? configValues[field.key] === undefined
											? ''
											: String(configValues[field.key])
										: typeof configValues[field.key] === 'string'
											? (configValues[field.key] as string)
											: ''
								}
								placeholder={field.placeholder}
								onChange={(event) => {
									const nextValue =
										field.type === 'number'
											? event.target.value === ''
												? undefined
												: Number(event.target.value)
											: event.target.value;
									updateConfigValue(field.key, nextValue);
								}}
							/>
						)}
						{field.description ? (
							<p className='text-xs leading-5 text-muted-foreground'>
								{field.description}
							</p>
						) : null}
					</div>
				</div>
			))}
		</div>
	);
};

export default EngineConfigFields;
