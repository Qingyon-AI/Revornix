export enum EngineBillingMode {
	TOKEN = 0,
	REQUEST = 1,
	FILE = 2,
	PAGE = 3,
	CHARACTER = 4,
	SECOND = 5,
	IMAGE = 6,
}

export const EngineBillingModeList = [
	EngineBillingMode.TOKEN,
	EngineBillingMode.REQUEST,
	EngineBillingMode.FILE,
	EngineBillingMode.PAGE,
	EngineBillingMode.CHARACTER,
	EngineBillingMode.SECOND,
	EngineBillingMode.IMAGE,
];

export const isEngineBillingMode = (value: number): value is EngineBillingMode =>
	value in EngineBillingMode;
