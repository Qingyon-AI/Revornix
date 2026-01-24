export enum EngineUUID {
    MinerU = 'c59151aa86784d9ab52f74c12c830b1f',
    MinerU_API = 'd90eabd6ce9e42da98ba6168cb189b70',
    MarkitDown = '9188ddca93ff4c2bb97fa252723c6c13',
    Jina = 'e31849ffa7f84a2cb4e2fa2ea00f25d2',
}

export enum EngineCategory {
    // Markdown
    Markdown = 0,
    // TTS
    TTS = 1,
    // 图片
    IMAGE = 2,
    // 音频解析 speech-to-text
    STT = 3
}

export const EngineCategoryLabel: Record<
    EngineCategory,
    { zh: string; en: string }
> = {
    [EngineCategory.Markdown]: {
        zh: 'Markdown 文本转化',
        en: 'Markdown Convert',
    },
    [EngineCategory.TTS]: {
        zh: '语音合成',
        en: 'Text to Speech',
    },
    [EngineCategory.IMAGE]: {
        zh: '图片生成',
        en: 'Image Generation',
    },
    [EngineCategory.STT]: {
        zh: '音频转文字',
        en: 'Speech To Text',
    },
};

export function isEngineCategory(
    value: number
): value is EngineCategory {
    return value in EngineCategory;
}

export function getEngineCategoryLabel(
    id: number,
    lang: 'zh' | 'en' = 'zh'
) {
    if (isEngineCategory(id)) {
        return EngineCategoryLabel[id][lang];
    }
    return 'Unknown';
}

export const EngineCategoryList = (
    Object.values(EngineCategory)
        .filter(v => typeof v === 'number') as EngineCategory[]
).map(id => ({
    id,
    key: EngineCategory[id],
    zh: EngineCategoryLabel[id].zh,
    en: EngineCategoryLabel[id].en,
}));