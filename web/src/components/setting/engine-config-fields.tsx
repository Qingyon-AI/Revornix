'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CircleHelp, Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

type JsonLike = string | number | boolean | Record<string, unknown> | unknown[];
type ConfigRecord = Record<string, JsonLike | undefined>;

type EngineConfigFieldsProps = {
	engineName?: string | null;
	demoConfig?: string | null;
	value?: string | null;
	disabled?: boolean;
	onChange: (value: string) => void;
};

type FieldType = 'text' | 'secret' | 'textarea' | 'number' | 'boolean' | 'json';

type FieldDefinition = {
	key: string;
	label: string;
	type: FieldType;
	placeholder?: string;
	description?: string;
	tooltip?: string;
};

const FIELD_LABEL_KEYS: Record<string, string> = {
	api_key: 'setting_engine_field_api_key_label',
	openai_api_key: 'setting_engine_field_openai_api_key_label',
	base_url: 'setting_engine_field_base_url_label',
	model_name: 'setting_engine_field_model_name_label',
	token: 'setting_engine_field_token_label',
	uid: 'setting_engine_field_uid_label',
	appid: 'setting_engine_field_appid_label',
	access_token: 'setting_engine_field_access_token_label',
	access_key_id: 'setting_engine_field_access_key_id_label',
	secret_access_key: 'setting_engine_field_secret_access_key_label',
	req_key: 'setting_engine_field_req_key_label',
	region: 'setting_engine_field_region_label',
	service: 'setting_engine_field_service_label',
	action: 'setting_engine_field_action_label',
	version: 'setting_engine_field_version_label',
	model_version: 'setting_engine_field_model_version_label',
	size: 'setting_engine_field_size_label',
	negative_prompt: 'setting_engine_field_negative_prompt_label',
	seed: 'setting_engine_field_seed_label',
	scale: 'setting_engine_field_scale_label',
	ddim_steps: 'setting_engine_field_ddim_steps_label',
	width: 'setting_engine_field_width_label',
	height: 'setting_engine_field_height_label',
	return_url: 'setting_engine_field_return_url_label',
	use_pre_llm: 'setting_engine_field_use_pre_llm_label',
	prompt_extend: 'setting_engine_field_prompt_extend_label',
	watermark: 'setting_engine_field_watermark_label',
	generation_mode: 'setting_engine_field_generation_mode_label',
	dialogue_model_id: 'setting_engine_field_dialogue_model_id_label',
	scene: 'setting_engine_field_scene_label',
	speaker_info: 'setting_engine_field_speaker_info_label',
	audio_config: 'setting_engine_field_audio_config_label',
	input_info: 'setting_engine_field_input_info_label',
	aigc_metadata: 'setting_engine_field_aigc_metadata_label',
	use_head_music: 'setting_engine_field_use_head_music_label',
	use_tail_music: 'setting_engine_field_use_tail_music_label',
	aigc_watermark: 'setting_engine_field_aigc_watermark_label',
	extra_body: 'setting_engine_field_extra_body_label',
};

const FIELD_PLACEHOLDER_KEYS: Record<string, string> = {
	api_key: 'setting_engine_field_api_key_placeholder',
	openai_api_key: 'setting_engine_field_openai_api_key_placeholder',
	base_url: 'setting_engine_field_base_url_placeholder',
	model_name: 'setting_engine_field_model_name_placeholder',
	token: 'setting_engine_field_token_placeholder',
	uid: 'setting_engine_field_uid_placeholder',
	appid: 'setting_engine_field_appid_placeholder',
	access_token: 'setting_engine_field_access_token_placeholder',
	access_key_id: 'setting_engine_field_access_key_id_placeholder',
	secret_access_key: 'setting_engine_field_secret_access_key_placeholder',
	req_key: 'setting_engine_field_req_key_placeholder',
	region: 'setting_engine_field_region_placeholder',
	service: 'setting_engine_field_service_placeholder',
	action: 'setting_engine_field_action_placeholder',
	version: 'setting_engine_field_version_placeholder',
	model_version: 'setting_engine_field_model_version_placeholder',
	size: 'setting_engine_field_size_placeholder',
	negative_prompt: 'setting_engine_field_negative_prompt_placeholder',
	seed: 'setting_engine_field_seed_placeholder',
	scale: 'setting_engine_field_scale_placeholder',
	ddim_steps: 'setting_engine_field_ddim_steps_placeholder',
	width: 'setting_engine_field_width_placeholder',
	height: 'setting_engine_field_height_placeholder',
	dialogue_model_id: 'setting_engine_field_dialogue_model_id_placeholder',
	scene: 'setting_engine_field_scene_placeholder',
	speaker_info: 'setting_engine_field_speaker_info_placeholder',
	audio_config: 'setting_engine_field_audio_config_placeholder',
	input_info: 'setting_engine_field_input_info_placeholder',
	aigc_metadata: 'setting_engine_field_aigc_metadata_placeholder',
	extra_body: 'setting_engine_field_extra_body_placeholder',
};

const FIELD_TOOLTIP_KEYS: Record<string, string> = {
	api_key: 'setting_engine_field_api_key_tooltip',
	openai_api_key: 'setting_engine_field_openai_api_key_tooltip',
	base_url: 'setting_engine_field_base_url_tooltip',
	model_name: 'setting_engine_field_model_name_tooltip',
	token: 'setting_engine_field_token_tooltip',
	uid: 'setting_engine_field_uid_tooltip',
	appid: 'setting_engine_field_appid_tooltip',
	access_token: 'setting_engine_field_access_token_tooltip',
	access_key_id: 'setting_engine_field_access_key_id_tooltip',
	secret_access_key: 'setting_engine_field_secret_access_key_tooltip',
	req_key: 'setting_engine_field_req_key_tooltip',
	region: 'setting_engine_field_region_tooltip',
	service: 'setting_engine_field_service_tooltip',
	action: 'setting_engine_field_action_tooltip',
	version: 'setting_engine_field_version_tooltip',
	model_version: 'setting_engine_field_model_version_tooltip',
	size: 'setting_engine_field_size_tooltip',
	negative_prompt: 'setting_engine_field_negative_prompt_tooltip',
	seed: 'setting_engine_field_seed_tooltip',
	scale: 'setting_engine_field_scale_tooltip',
	ddim_steps: 'setting_engine_field_ddim_steps_tooltip',
	width: 'setting_engine_field_width_tooltip',
	height: 'setting_engine_field_height_tooltip',
	return_url: 'setting_engine_field_return_url_tooltip',
	use_pre_llm: 'setting_engine_field_use_pre_llm_tooltip',
	prompt_extend: 'setting_engine_field_prompt_extend_tooltip',
	watermark: 'setting_engine_field_watermark_tooltip',
	generation_mode: 'setting_engine_field_generation_mode_tooltip',
	dialogue_model_id: 'setting_engine_field_dialogue_model_id_tooltip',
	scene: 'setting_engine_field_scene_tooltip',
	speaker_info: 'setting_engine_field_speaker_info_tooltip',
	audio_config: 'setting_engine_field_audio_config_tooltip',
	input_info: 'setting_engine_field_input_info_tooltip',
	aigc_metadata: 'setting_engine_field_aigc_metadata_tooltip',
	use_head_music: 'setting_engine_field_use_head_music_tooltip',
	use_tail_music: 'setting_engine_field_use_tail_music_tooltip',
	aigc_watermark: 'setting_engine_field_aigc_watermark_tooltip',
	extra_body: 'setting_engine_field_extra_body_tooltip',
};

const FIELD_TYPE_OVERRIDES: Record<string, FieldType> = {
	api_key: 'secret',
	openai_api_key: 'secret',
	token: 'secret',
	access_token: 'secret',
	secret_access_key: 'secret',
	generation_mode: 'text',
	dialogue_model_id: 'number',
	seed: 'number',
	scale: 'number',
	ddim_steps: 'number',
	width: 'number',
	height: 'number',
	use_head_music: 'boolean',
	use_tail_music: 'boolean',
	aigc_watermark: 'boolean',
	prompt_extend: 'boolean',
	watermark: 'boolean',
	use_pre_llm: 'boolean',
	return_url: 'boolean',
	speaker_info: 'json',
	audio_config: 'json',
	input_info: 'json',
	aigc_metadata: 'json',
	extra_body: 'json',
};

const FIELD_LABELS: Record<string, string> = {
	api_key: 'API Key',
	openai_api_key: 'OpenAI API Key',
	base_url: 'Base URL',
	model_name: 'Model Name',
	token: 'Token',
	uid: 'UID',
	appid: 'App ID',
	access_token: 'Access Token',
	access_key_id: 'Access Key ID',
	secret_access_key: 'Secret Access Key',
	req_key: 'Request Key',
	region: 'Region',
	service: 'Service',
	action: 'Action',
	version: 'Version',
	model_version: 'Model Version',
	size: 'Size',
	negative_prompt: 'Negative Prompt',
	seed: 'Seed',
	scale: 'Scale',
	ddim_steps: 'DDIM Steps',
	width: 'Width',
	height: 'Height',
	return_url: 'Return URL',
	use_pre_llm: 'Use Pre LLM',
	prompt_extend: 'Prompt Extend',
	watermark: 'Watermark',
	generation_mode: 'Generation Mode',
	dialogue_model_id: 'Dialogue Model ID',
	scene: 'Scene',
	speaker_info: 'Speaker Info',
	audio_config: 'Audio Config',
	input_info: 'Input Info',
	aigc_metadata: 'AIGC Metadata',
	use_head_music: 'Use Head Music',
	use_tail_music: 'Use Tail Music',
	aigc_watermark: 'AIGC Watermark',
	extra_body: 'Extra Body',
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
	api_key: 'sk-...',
	openai_api_key: 'sk-proj-...',
	base_url: 'https://api.example.com',
	model_name: 'gpt-4.1-mini',
	token: 'Enter your access token',
	uid: 'Your provider user id',
	appid: 'Your application id',
	access_token: 'Your service access token',
	access_key_id: 'AKIA...',
	secret_access_key: 'Enter your secret access key',
	req_key: 'high_aes_general_v21_L',
	region: 'cn-north-1',
	service: 'cv',
	action: 'CVProcess',
	version: '2022-08-31',
	model_version: 'general_v2.1_L',
	size: '2048*2048',
	negative_prompt: 'low quality, blurry',
	seed: '123456',
	scale: '3.5',
	ddim_steps: '30',
	width: '1024',
	height: '1024',
	dialogue_model_id: 'Default document reader model id',
	scene: 'deep_research',
	speaker_info: '{"speakers":["BV001_streaming","BV002_streaming"]}',
	audio_config: '{"format":"mp3","sample_rate":44100,"speech_rate":1.0}',
	input_info: '{"topic":"AI and productivity"}',
	aigc_metadata: '{"source":"revornix"}',
	extra_body: '{"return_binary":false}',
};

const FIELD_TOOLTIPS: Record<string, string> = {
	api_key:
		'The credential used to call the upstream engine API. You can usually create it from the provider dashboard or API key page.',
	openai_api_key:
		'The OpenAI key passed into MarkItDown for richer parsing, especially for images and more complex content.',
	base_url:
		'The root endpoint used to send requests. Use the provider default unless you are routing through a proxy, gateway, or self-hosted compatible service.',
	model_name:
		'The exact upstream model identifier. This decides which provider model Revornix actually uses.',
	token:
		'The access token required by this engine provider. Copy it from the engine service console or developer portal.',
	uid: 'The user identifier issued by the provider. MinerU API uses it in request validation and checksum-related logic.',
	appid:
		'The application ID for this engine integration. You can find it in the provider app or project settings page.',
	access_token:
		'The access token used for authenticated requests to the provider service.',
	access_key_id:
		'The public key identifier used in signed requests. Create or view it from the cloud provider credential management page.',
	secret_access_key:
		'The private secret paired with the access key ID. Most providers only show it once when the key is created.',
	req_key:
		'The upstream request key or capability key used by the image service to decide which generation pipeline to run.',
	region:
		'The provider region where requests are routed, such as `cn-north-1`.',
	service:
		'The provider service code used in signature generation or request routing.',
	action:
		'The provider action name used by the API endpoint.',
	version:
		'The API version string required by the provider.',
	model_version:
		'An optional upstream model version or preset that further refines which generation backend is used.',
	size:
		'The target image size. Follow the provider format, such as `1024x1024` or `2048*2048`.',
	negative_prompt:
		'Optional instructions describing what the generated result should avoid.',
	seed:
		'Optional numeric seed for more reproducible generation output.',
	scale:
		'Optional generation guidance scale used by some image APIs.',
	ddim_steps:
		'Optional diffusion step count used by some image APIs.',
	width: 'Optional explicit output width. Use it when your provider supports width and height separately.',
	height: 'Optional explicit output height. Use it when your provider supports width and height separately.',
	return_url:
		'If enabled, the engine prefers returning a hosted image URL when the provider supports it.',
	use_pre_llm:
		'If enabled, the upstream flow may run an extra prompt-refinement step before image generation.',
	prompt_extend:
		'Allows the provider to expand or enhance the prompt automatically before generating the image.',
	watermark:
		'Controls whether the provider should add its watermark or watermark metadata to the generated result.',
	generation_mode:
		'Controls how the podcast content is generated. `prompt` is simpler, while `dialogue` generates two-speaker turns first.',
	dialogue_model_id:
		'Used by dialogue podcast mode to choose which text model writes the conversation script. If omitted, Revornix falls back to the default document reader model.',
	scene:
		'An optional provider-specific scene hint that influences upstream generation behavior.',
	speaker_info:
		'Advanced speaker configuration in JSON. The most important part is the `speakers` array used to select voices.',
	audio_config:
		'Advanced output audio settings in JSON, such as format, sample rate, and speech rate.',
	input_info:
		'Optional extra request body fields merged into the upstream request.',
	aigc_metadata:
		'Optional metadata payload passed through to the upstream API.',
	use_head_music: 'Whether the generated podcast should add intro music automatically.',
	use_tail_music: 'Whether the generated podcast should add outro music automatically.',
	aigc_watermark: 'Whether to include an AIGC watermark marker in the generated audio result.',
	extra_body:
		'Extra raw JSON merged directly into the upstream request body. Use this when the provider supports parameters that Revornix has not exposed as dedicated fields yet.',
};

const ENGINE_FIELD_ORDERS: Record<string, string[]> = {
	jina: ['api_key'],
	markitdown: ['openai_api_key'],
	mineru_api: ['token', 'uid'],
	openai_tts: ['base_url', 'api_key', 'model_name'],
	volc_tts: [
		'appid',
		'access_token',
		'base_url',
		'generation_mode',
		'dialogue_model_id',
		'scene',
		'use_head_music',
		'use_tail_music',
		'aigc_watermark',
		'speaker_info',
		'audio_config',
		'input_info',
		'aigc_metadata',
	],
	volc_stt_standard: ['token', 'appid'],
	volc_stt_fast: ['token', 'appid'],
	banana_image: ['api_key', 'base_url', 'model_name'],
	bailian_image: [
		'api_key',
		'base_url',
		'model_name',
		'size',
		'negative_prompt',
		'prompt_extend',
		'watermark',
		'seed',
	],
	volc_image: [
		'access_key_id',
		'secret_access_key',
		'req_key',
		'base_url',
		'region',
		'service',
		'action',
		'version',
		'model_version',
		'size',
		'negative_prompt',
		'seed',
		'scale',
		'ddim_steps',
		'width',
		'height',
		'use_pre_llm',
		'return_url',
		'extra_body',
	],
	kimi_image_understand: ['api_key', 'base_url', 'model_name'],
};

const ENGINE_NAME_ALIASES: Record<string, string> = {
	openai_audio_engine: 'openai_tts',
	volc_podcast_engine: 'volc_tts',
	doubao_podcast_engine: 'volc_tts',
	volc_stt_fast: 'volc_stt_fast',
	volc_fast_stt: 'volc_stt_fast',
	volc_stt_standard: 'volc_stt_standard',
	volc_standard_stt: 'volc_stt_standard',
	mineru_api_engine: 'mineru_api',
	jina_engine: 'jina',
	markitdown_engine: 'markitdown',
	banana_image_engine: 'banana_image',
	bailian_image_engine: 'bailian_image',
	volc_image_engine: 'volc_image',
	kimi_image_understand_engine: 'kimi_image_understand',
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

const normalizeEngineName = (value?: string | null) => {
	if (!value) {
		return '';
	}

	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, '_');

	return ENGINE_NAME_ALIASES[normalized] ?? normalized;
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
		return t(key as never);
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

const inferFieldType = (key: string, exampleValue: unknown): FieldType => {
	const overrideType = FIELD_TYPE_OVERRIDES[key];
	if (overrideType) {
		return overrideType;
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
	if (
		key.includes('secret') ||
		key.includes('token') ||
		key.includes('password') ||
		key.endsWith('api_key') ||
		key === 'api_key'
	) {
		return 'secret';
	}
	if (
		key.includes('prompt') ||
		key.includes('body') ||
		(typeof exampleValue === 'string' && exampleValue.includes('\n'))
	) {
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

const buildFieldDefinitions = ({
	t,
	engineName,
	demoValues,
	currentValues,
}: {
	t: ReturnType<typeof useTranslations>;
	engineName?: string | null;
	demoValues: Record<string, unknown>;
	currentValues: Record<string, unknown>;
}): FieldDefinition[] => {
	const normalizedEngineName = normalizeEngineName(engineName);
	const orderedKeys = ENGINE_FIELD_ORDERS[normalizedEngineName] ?? [];
	const keySet = new Set<string>([
		...orderedKeys,
		...Object.keys(demoValues),
		...Object.keys(currentValues),
	]);

	return Array.from(keySet)
		.filter(Boolean)
		.sort((a, b) => {
			const aIndex = orderedKeys.indexOf(a);
			const bIndex = orderedKeys.indexOf(b);
			if (aIndex !== -1 || bIndex !== -1) {
				if (aIndex === -1) return 1;
				if (bIndex === -1) return -1;
				return aIndex - bIndex;
			}
			return a.localeCompare(b);
		})
		.map((key) => {
			const exampleValue = currentValues[key] ?? demoValues[key];
			return {
				key,
				label:
					translateOrFallback(
						t,
						FIELD_LABEL_KEYS[key],
						FIELD_LABELS[key] ?? prettifyKey(key),
					) ?? prettifyKey(key),
				type: inferFieldType(key, exampleValue),
				placeholder:
					toPlaceholder(demoValues[key]) ??
					translateOrFallback(
						t,
						FIELD_PLACEHOLDER_KEYS[key],
						FIELD_PLACEHOLDERS[key],
					),
				tooltip: translateOrFallback(
					t,
					FIELD_TOOLTIP_KEYS[key],
					FIELD_TOOLTIPS[key],
				),
				description:
					key === 'generation_mode'
						? t('setting_engine_config_desc_generation_mode')
						: key === 'size'
							? t('setting_engine_config_desc_size')
							: key === 'speaker_info' ||
								  key === 'audio_config' ||
								  key === 'input_info' ||
								  key === 'aigc_metadata' ||
								  key === 'extra_body'
								? t('setting_engine_config_desc_json')
								: key === 'prompt_extend'
									? t('setting_engine_config_desc_prompt_extend')
									: key === 'return_url'
										? t('setting_engine_config_desc_return_url')
										: undefined,
			};
		});
};

const toInitialFieldValue = (
	field: FieldDefinition,
	currentValue: unknown,
	demoValue: unknown,
): JsonLike | undefined => {
	if (field.type === 'boolean') {
		if (typeof currentValue === 'boolean') return currentValue;
		if (typeof demoValue === 'boolean') return demoValue;
		return false;
	}
	if (field.type === 'number') {
		if (typeof currentValue === 'number') return currentValue;
		if (typeof demoValue === 'number') return demoValue;
		return undefined;
	}
	if (field.type === 'json') {
		if (currentValue && typeof currentValue === 'object') {
			return JSON.stringify(currentValue, null, 2);
		}
		if (demoValue && typeof demoValue === 'object') {
			return JSON.stringify(demoValue, null, 2);
		}
		return '';
	}
	return typeof currentValue === 'string' ? currentValue : '';
};

const sanitizeConfigValues = (
	values: ConfigRecord,
	fields: FieldDefinition[],
): Record<string, unknown> => {
	const result: Record<string, unknown> = {};

	fields.forEach((field) => {
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
	engineName,
	demoConfig,
	value,
	disabled = false,
	onChange,
}: EngineConfigFieldsProps) => {
	const t = useTranslations();
	const demoValues = useMemo(() => normalizeObject(demoConfig), [demoConfig]);
	const currentValues = useMemo(() => normalizeObject(value), [value]);
	const fields = useMemo(
		() =>
			buildFieldDefinitions({
				t,
				engineName,
				demoValues,
				currentValues,
			}),
		[t, engineName, demoValues, currentValues],
	);
	const hasInvalidConfig =
		Boolean(value?.trim()) && Object.keys(currentValues).length === 0;
	const [configValues, setConfigValues] = useState<ConfigRecord>({});
	const lastEmittedValueRef = useRef<string>(value ?? '');

	useEffect(() => {
		const nextValues: ConfigRecord = {};
		fields.forEach((field) => {
			nextValues[field.key] = toInitialFieldValue(
				field,
				currentValues[field.key],
				demoValues[field.key],
			);
		});
		setConfigValues((current) => {
			const currentSerialized = JSON.stringify(current);
			const nextSerialized = JSON.stringify(nextValues);
			return currentSerialized === nextSerialized ? current : nextValues;
		});
		lastEmittedValueRef.current = value ?? '';
	}, [currentValues, demoValues, fields, value]);

	const updateConfigValue = (
		key: string,
		nextValue: JsonLike | undefined,
	) => {
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
			{fields.map((field) => (
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
								className={field.type === 'json' ? 'font-mono text-xs' : undefined}
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
