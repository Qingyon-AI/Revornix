'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CircleHelp, HardDrive } from 'lucide-react';
import { useTranslations } from 'next-intl';

type ConfigPrimitive = string | number | boolean;
type ConfigRecord = Record<string, ConfigPrimitive | undefined>;

type FileSystemConfigFieldsProps = {
	fileSystemId?: number | null;
	value?: string | null;
	onChange: (value: string) => void;
};

type FieldType = 'text' | 'secret' | 'textarea' | 'number' | 'boolean';

type FieldDefinition = {
	key: string;
	label: string;
	type: FieldType;
	placeholder?: string;
	description?: string;
	tooltip?: string;
};

const FIELD_LABEL_KEYS: Record<string, string> = {
	bucket: 'setting_file_system_field_bucket_label',
	bucket_name: 'setting_file_system_field_bucket_label',
	region: 'setting_file_system_field_region_label',
	region_id: 'setting_file_system_field_region_id_label',
	region_name: 'setting_file_system_field_region_name_label',
	endpoint: 'setting_file_system_field_endpoint_label',
	endpoint_url: 'setting_file_system_field_endpoint_url_label',
	public_endpoint: 'setting_file_system_field_public_endpoint_label',
	public_url: 'setting_file_system_field_public_url_label',
	custom_domain: 'setting_file_system_field_custom_domain_label',
	base_path: 'setting_file_system_field_base_path_label',
	root_path: 'setting_file_system_field_root_path_label',
	prefix: 'setting_file_system_field_prefix_label',
	access_key_id: 'setting_file_system_field_access_key_id_label',
	access_key: 'setting_file_system_field_access_key_label',
	user_access_key_id: 'setting_file_system_field_user_access_key_id_label',
	user_access_key_secret:
		'setting_file_system_field_user_access_key_secret_label',
	secret_access_key: 'setting_file_system_field_secret_access_key_label',
	access_key_secret: 'setting_file_system_field_access_key_secret_label',
	secret_key: 'setting_file_system_field_secret_key_label',
	session_token: 'setting_file_system_field_session_token_label',
	force_path_style: 'setting_file_system_field_force_path_style_label',
	role_arn: 'setting_file_system_field_role_arn_label',
};

const FIELD_PLACEHOLDER_KEYS: Record<string, string> = {
	bucket: 'setting_file_system_field_bucket_placeholder',
	bucket_name: 'setting_file_system_field_bucket_placeholder',
	region: 'setting_file_system_field_region_placeholder',
	region_id: 'setting_file_system_field_region_id_placeholder',
	region_name: 'setting_file_system_field_region_name_placeholder',
	endpoint: 'setting_file_system_field_endpoint_placeholder',
	endpoint_url: 'setting_file_system_field_endpoint_url_placeholder',
	public_endpoint: 'setting_file_system_field_public_endpoint_placeholder',
	public_url: 'setting_file_system_field_public_url_placeholder',
	custom_domain: 'setting_file_system_field_custom_domain_placeholder',
	base_path: 'setting_file_system_field_base_path_placeholder',
	root_path: 'setting_file_system_field_root_path_placeholder',
	prefix: 'setting_file_system_field_prefix_placeholder',
	access_key_id: 'setting_file_system_field_access_key_id_placeholder',
	access_key: 'setting_file_system_field_access_key_placeholder',
	user_access_key_id: 'setting_file_system_field_user_access_key_id_placeholder',
	user_access_key_secret:
		'setting_file_system_field_user_access_key_secret_placeholder',
	secret_access_key: 'setting_file_system_field_secret_access_key_placeholder',
	access_key_secret: 'setting_file_system_field_access_key_secret_placeholder',
	secret_key: 'setting_file_system_field_secret_key_placeholder',
	session_token: 'setting_file_system_field_session_token_placeholder',
	role_arn: 'setting_file_system_field_role_arn_placeholder',
};

const FIELD_TOOLTIP_KEYS: Record<string, string> = {
	bucket: 'setting_file_system_field_bucket_tooltip',
	bucket_name: 'setting_file_system_field_bucket_tooltip',
	region: 'setting_file_system_field_region_tooltip',
	region_id: 'setting_file_system_field_region_id_tooltip',
	region_name: 'setting_file_system_field_region_name_tooltip',
	endpoint: 'setting_file_system_field_endpoint_tooltip',
	endpoint_url: 'setting_file_system_field_endpoint_url_tooltip',
	public_endpoint: 'setting_file_system_field_public_endpoint_tooltip',
	public_url: 'setting_file_system_field_public_url_tooltip',
	custom_domain: 'setting_file_system_field_custom_domain_tooltip',
	base_path: 'setting_file_system_field_base_path_tooltip',
	root_path: 'setting_file_system_field_root_path_tooltip',
	prefix: 'setting_file_system_field_prefix_tooltip',
	access_key_id: 'setting_file_system_field_access_key_id_tooltip',
	access_key: 'setting_file_system_field_access_key_tooltip',
	user_access_key_id: 'setting_file_system_field_user_access_key_id_tooltip',
	user_access_key_secret:
		'setting_file_system_field_user_access_key_secret_tooltip',
	secret_access_key: 'setting_file_system_field_secret_access_key_tooltip',
	access_key_secret: 'setting_file_system_field_access_key_secret_tooltip',
	secret_key: 'setting_file_system_field_secret_key_tooltip',
	session_token: 'setting_file_system_field_session_token_tooltip',
	force_path_style: 'setting_file_system_field_force_path_style_tooltip',
	role_arn: 'setting_file_system_field_role_arn_tooltip',
};

const FIELD_LABELS: Record<string, string> = {
	bucket: 'Bucket',
	bucket_name: 'Bucket',
	region: 'Region',
	region_id: 'Region ID',
	region_name: 'Region Name',
	endpoint: 'Endpoint',
	endpoint_url: 'Endpoint URL',
	public_endpoint: 'Public Endpoint',
	public_url: 'Public URL',
	custom_domain: 'Custom Domain',
	base_path: 'Base Path',
	root_path: 'Root Path',
	prefix: 'Prefix',
	access_key_id: 'Access Key ID',
	access_key: 'Access Key',
	user_access_key_id: 'User Access Key ID',
	user_access_key_secret: 'User Access Key Secret',
	secret_access_key: 'Secret Access Key',
	access_key_secret: 'Access Key Secret',
	secret_key: 'Secret Key',
	session_token: 'Session Token',
	force_path_style: 'Force Path Style',
	role_arn: 'Role ARN',
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
	bucket: 'my-app-bucket',
	bucket_name: 'my-app-bucket',
	region: 'us-east-1',
	region_id: 'oss-cn-beijing',
	region_name: 'us-east-1',
	endpoint: 'https://s3.amazonaws.com',
	endpoint_url: 'https://oss-cn-beijing.aliyuncs.com',
	public_endpoint: 'https://cdn.example.com',
	public_url: 'https://cdn.example.com',
	custom_domain: 'https://files.example.com',
	base_path: 'revornix/uploads',
	root_path: 'revornix',
	prefix: 'assets',
	access_key_id: 'AKIA...',
	access_key: 'AKIA...',
	user_access_key_id: 'LTAI...',
	user_access_key_secret: 'Enter your user access key secret',
	secret_access_key: 'Enter your secret access key',
	access_key_secret: 'Enter your access key secret',
	secret_key: 'Enter your secret key',
	session_token: 'Optional temporary session token',
	role_arn: 'acs:ram::1234567890123456:role/revornix-oss-role',
};

const FIELD_TOOLTIPS: Record<string, string> = {
	bucket:
		'Your storage bucket or container name. You can usually find this in your object storage console where the files are stored.',
	bucket_name:
		'Your storage bucket or container name. Use the exact bucket name shown in your storage provider dashboard.',
	region:
		'The region where this bucket lives, such as `us-east-1` or `oss-cn-beijing`. You can find it on the bucket detail page.',
	region_id:
		'The OSS region ID from the bucket detail page, such as `oss-cn-beijing`. Use the region ID expected by Aliyun OSS.',
	region_name:
		'The AWS or S3-compatible region name for this bucket, such as `us-east-1`.',
	endpoint:
		'The API endpoint used by your storage provider. For S3-compatible services this is often a hostname like `s3.amazonaws.com` or a custom provider endpoint.',
	endpoint_url:
		'The full endpoint URL for uploads, usually copied from your provider documentation or bucket settings. This field should include the `https://` prefix.',
	public_endpoint:
		'Optional public access endpoint used to read uploaded files back. Use this when your read domain differs from the API upload endpoint.',
	public_url:
		'Optional public base URL used to access files after upload.',
	custom_domain:
		'Optional custom CDN or public domain bound to this bucket, if you want generated file URLs to use that domain.',
	base_path:
		'An optional folder prefix inside the bucket. Uploaded files will be placed under this path instead of the bucket root.',
	root_path:
		'An optional root folder inside the storage space. Use it to isolate Revornix files from other app data.',
	prefix:
		'An optional path prefix added before uploaded file paths.',
	access_key_id:
		'The public identifier for your storage access key pair. Create or view it from your provider IAM, RAM, or access key settings.',
	access_key:
		'The public key or access key ID used to identify your storage credentials.',
	user_access_key_id:
		'The user AccessKey ID used to assume the STS role or access the bucket. Create it from your cloud account credential page.',
	user_access_key_secret:
		'The user AccessKey Secret paired with the user AccessKey ID. Revornix uses it to obtain temporary credentials or access the bucket.',
	secret_access_key:
		'The private secret paired with your access key ID. This is shown only when the key is created in most providers, so copy it carefully.',
	access_key_secret:
		'The private secret paired with your access key ID. You can typically generate it from your provider access key page.',
	secret_key:
		'The private credential used with your access key. Treat it like a password and keep it secure.',
	session_token:
		'Optional temporary security token used with short-lived credentials such as STS or assumed roles.',
	force_path_style:
		'Turn this on for providers that require path-style bucket URLs instead of virtual-host style URLs.',
	role_arn:
		'The ARN of the role that Revornix should assume for STS-based access. Copy it from the role detail page in Aliyun RAM or AWS IAM.',
};

const FILE_SYSTEM_FIELD_ORDERS: Record<number, string[]> = {
	2: [
		'user_access_key_id',
		'user_access_key_secret',
		'role_arn',
		'region_id',
		'endpoint_url',
		'bucket',
	],
	3: [
		'role_arn',
		'user_access_key_id',
		'user_access_key_secret',
		'region_name',
		'bucket',
	],
	4: [
		'user_access_key_id',
		'user_access_key_secret',
		'region_name',
		'endpoint_url',
		'bucket',
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

const prettifyKey = (key: string) => {
	return key
		.split(/[_-]+/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
};

const inferFieldType = (key: string, exampleValue: unknown): FieldType => {
	if (typeof exampleValue === 'boolean') {
		return 'boolean';
	}
	if (typeof exampleValue === 'number') {
		return 'number';
	}
	if (
		key.includes('secret') ||
		key.includes('password') ||
		key.includes('token')
	) {
		return 'secret';
	}
	if (
		key.includes('cert') ||
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
	return undefined;
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

const buildFieldDefinitions = ({
	t,
	fileSystemId,
	currentValues,
}: {
	t: ReturnType<typeof useTranslations>;
	fileSystemId?: number | null;
	currentValues: Record<string, unknown>;
}): FieldDefinition[] => {
	const orderedKeys = FILE_SYSTEM_FIELD_ORDERS[fileSystemId ?? -1] ?? [];
	const keySet =
		orderedKeys.length > 0
			? new Set<string>(orderedKeys)
			: new Set<string>(Object.keys(currentValues));

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
			const exampleValue = currentValues[key];
			return {
				key,
				label:
					translateOrFallback(
						t,
						FIELD_LABEL_KEYS[key],
						FIELD_LABELS[key] ?? prettifyKey(key),
					) ?? prettifyKey(key),
				type: inferFieldType(key, exampleValue),
				placeholder: translateOrFallback(
					t,
					FIELD_PLACEHOLDER_KEYS[key],
					FIELD_PLACEHOLDERS[key],
				),
				description:
					key === 'endpoint_url'
						? t('setting_file_system_config_desc_endpoint_url')
						: key === 'role_arn'
							? t('setting_file_system_config_desc_role_arn')
							: undefined,
				tooltip: translateOrFallback(
					t,
					FIELD_TOOLTIP_KEYS[key],
					FIELD_TOOLTIPS[key],
				),
			};
		});
};

const sanitizeConfigValues = (
	values: ConfigRecord,
	fields: FieldDefinition[],
): Record<string, ConfigPrimitive> => {
	const result: Record<string, ConfigPrimitive> = {};

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

const FileSystemConfigFields = ({
	fileSystemId,
	value,
	onChange,
}: FileSystemConfigFieldsProps) => {
	const t = useTranslations();
	const currentValues = useMemo(() => normalizeObject(value), [value]);
	const fields = useMemo(
		() =>
			buildFieldDefinitions({
				t,
				fileSystemId,
				currentValues,
			}),
		[t, fileSystemId, currentValues],
	);
	const hasInvalidConfig = Boolean(value?.trim()) && Object.keys(currentValues).length === 0;
	const [configValues, setConfigValues] = useState<ConfigRecord>({});
	const lastEmittedValueRef = useRef<string>(value ?? '');

	useEffect(() => {
		const nextValues: ConfigRecord = {};
		fields.forEach((field) => {
			const currentValue = currentValues[field.key];
			if (field.type === 'boolean') {
				nextValues[field.key] =
					typeof currentValue === 'boolean'
						? currentValue
						: false;
				return;
			}
			if (field.type === 'number') {
				nextValues[field.key] =
					typeof currentValue === 'number'
						? currentValue
						: undefined;
				return;
			}
			nextValues[field.key] =
				typeof currentValue === 'string' ? currentValue : '';
		});
		setConfigValues((current) => {
			const currentSerialized = JSON.stringify(current);
			const nextSerialized = JSON.stringify(nextValues);
			return currentSerialized === nextSerialized ? current : nextValues;
		});
		lastEmittedValueRef.current = value ?? '';
	}, [currentValues, fields]);

	const updateConfigValue = (
		key: string,
		nextValue: ConfigPrimitive | undefined,
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

	if (fileSystemId === 1) {
		return (
			<Alert>
				<HardDrive className='h-4 w-4' />
				<AlertTitle>{t('setting_file_system_config_builtin_title')}</AlertTitle>
				<AlertDescription>
					{t('setting_file_system_config_builtin_description')}
				</AlertDescription>
			</Alert>
		);
	}

	if (hasInvalidConfig) {
		return (
			<Alert variant='destructive'>
				<AlertTriangle className='h-4 w-4' />
				<AlertTitle>{t('setting_file_system_config_invalid_title')}</AlertTitle>
				<AlertDescription>
					{t('setting_file_system_config_invalid_description')}
				</AlertDescription>
			</Alert>
		);
	}

	if (fields.length === 0) {
		return null;
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
							<div className='flex h-10 items-center rounded-xl border border-border/60 px-3'>
								<Switch
									checked={Boolean(configValues[field.key])}
									onCheckedChange={(checked) => {
										updateConfigValue(field.key, checked);
									}}
								/>
							</div>
						) : field.type === 'textarea' ? (
							<Textarea
								value={typeof configValues[field.key] === 'string' ? (configValues[field.key] as string) : ''}
								placeholder={field.placeholder}
								onChange={(event) => {
									updateConfigValue(field.key, event.target.value);
								}}
							/>
						) : (
							<Input
								type={field.type === 'secret' ? 'password' : field.type === 'number' ? 'number' : 'text'}
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

export default FileSystemConfigFields;
