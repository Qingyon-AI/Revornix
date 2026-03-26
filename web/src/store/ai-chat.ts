import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import { AIDocumentSource, AIPhase, AIWorkflow, SessionItem } from '@/types/ai'
import {
	hydrateSessionItem,
	sortSessionsByRecent,
	touchSession,
	touchSessionWithMessages,
} from '@/lib/ai-session'
import { mergeDocumentSources } from '@/lib/ai-sources'

export type AIChatState = {
    currentSessionId: string | null;
    currentSession: () => SessionItem | null;
    sessions: SessionItem[];
    ownerUserId: number | null;
    _hasHydrated: boolean;
};

export type AIChatAction = {
    setCurrentSessionId: (id: string | null) => void;
    bindUserScope: (userId: number) => void;
    addSession: (chat: SessionItem) => void;
    deleteSession: (id: string) => void;
    updateSessionMeta: (session_id: string, patch: Partial<SessionItem>) => void;
    setHasHydrated: (status: boolean) => void;
    updateChatMessage: (
        session_id: string,
        chat_id: string,
        role: 'assistant' | 'user',
        token: string,
        patch?: Partial<SessionItem['messages'][number]>
    ) => void;
    advanceChatMessageWorkflow: (
        session_id: string,
        chat_id: string,
        step: AIPhase,
        meta?: any
    ) => void;
    mergeChatMessageDocumentSources: (
        session_id: string,
        chat_id: string,
        sources: AIDocumentSource[]
    ) => void;
};

const storage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (typeof window === 'undefined') return null // SSR 阶段返回 null
        return (await get(name)) || null
    },
    setItem: async (name: string, value: string): Promise<void> => {
        if (typeof window === 'undefined') return // SSR 阶段跳过保存
        await set(name, value)
    },
    removeItem: async (name: string): Promise<void> => {
        if (typeof window === 'undefined') return
        await del(name)
    },
}

const phaseLabelMap: Record<AIPhase, (meta?: any) => string> = {
    idle: () => 'revornix_ai_phase_idle',
    thinking: () => 'revornix_ai_phase_thinking',
    writing: () => 'revornix_ai_phase_writing',
    tool: () => 'revornix_ai_phase_tool',
    tool_result: () => 'revornix_ai_phase_tool_result',
    done: () => 'revornix_ai_phase_done',
    error: (meta) => meta?.message ?? 'revornix_ai_phase_error',
};

function pushWorkflowStep(
    workflow: AIWorkflow | undefined,
    phase: AIPhase,
    label: string,
    meta?: any
): AIWorkflow {
    const steps = workflow ? [...workflow] : [];

    const last = steps[steps.length - 1];

    // ✅ 只有在 phase + label 都相同时才认为是重复
    if (last && last.phase === phase && last.label === label) {
        return steps;
    }

    steps.push({
        phase,
        label,
        meta,
    });

    return steps;
}

export const useAiChatStore = create<AIChatState & AIChatAction>()(
    persist(
        (set, get) => {
            return ({
                _hasHydrated: false,
                currentSessionId: null,
                sessions: [],
                ownerUserId: null,
                currentSession: () => {
                    const currentSessionId = get().currentSessionId;
                    if (!currentSessionId) return null;
                    return get().sessions.find((session) => session.id === currentSessionId) || null;
                },
                setCurrentSessionId: (id) => set({ currentSessionId: id }),
                bindUserScope: (userId: number) => set((state) => {
                    if (state.ownerUserId === userId) {
                        return state;
                    }
                    return {
                        ownerUserId: userId,
                        currentSessionId: null,
                        sessions: [],
                    };
                }),
                updateChatMessage: (session_id: string, chat_id: string, role: string, token: string, patch) => {
                    return set((state) => {
                        const sessions = state.sessions.map(session => {
                            if (session.id !== session_id) return session;

                            const messages = [...session.messages];

                            const idx = messages.findIndex(m => m.chat_id === chat_id);

                            if (idx === -1) {
                                messages.push({
                                    chat_id: chat_id,
                                    role: role,
                                    content: token,
                                    ...patch,
                                });
                            } else {
                                messages[idx] = {
                                    ...messages[idx],
                                    content: messages[idx].content + token,
                                    ...patch,
                                };
                            }

                            return touchSessionWithMessages(session, messages);
                        });

                        return { sessions: sortSessionsByRecent(sessions) }; // ✅ 必须 return
                    })
                },
                advanceChatMessageWorkflow: (session_id, chat_id, phase, meta) => {
                    set((state) => {
                        const sessions = state.sessions.map((session) => {
                            if (session.id !== session_id) return session;

                            const messages = [...session.messages];
                            const idx = messages.findIndex((m) => m.chat_id === chat_id);

                            const label = phaseLabelMap[phase]?.(meta);

                            if (idx === -1) {
                                messages.push({
                                    chat_id,
                                    role: 'assistant',
                                    content: '',
                                    ai_state: {
                                        phase,
                                        label,
                                    },
                                    ai_workflow: pushWorkflowStep(undefined, phase, label, meta),
                                });
                            } else {
                                const msg = messages[idx];

                                messages[idx] = {
                                    ...msg,
                                    ai_state: {
                                        phase,
                                        label,
                                    },
                                    ai_workflow: pushWorkflowStep(
                                        msg.ai_workflow,
                                        phase,
                                        label,
                                        meta
                                    ),
                                };
                            }

                            return touchSessionWithMessages(session, messages);
                        });

                        return { sessions: sortSessionsByRecent(sessions) };
                    });
                },
                mergeChatMessageDocumentSources: (session_id, chat_id, sources) => {
                    set((state) => {
                        const sessions = state.sessions.map((session) => {
                            if (session.id !== session_id) return session;

                            const messages = [...session.messages];
                            const idx = messages.findIndex((m) => m.chat_id === chat_id);

                            if (idx === -1) {
                                messages.push({
                                    chat_id,
                                    role: 'assistant',
                                    content: '',
                                    document_sources: sources,
                                });
                            } else {
                                messages[idx] = {
                                    ...messages[idx],
                                    document_sources: mergeDocumentSources(
                                        messages[idx].document_sources,
                                        sources
                                    ),
                                };
                            }

                            return touchSessionWithMessages(session, messages);
                        });

                        return { sessions: sortSessionsByRecent(sessions) };
                    });
                },
                addSession: (session: SessionItem) => set((state) => {
                    const nextSession = hydrateSessionItem(session);
                    const sessions = sortSessionsByRecent([
                        ...state.sessions.filter((item) => item.id !== nextSession.id),
                        nextSession,
                    ]);

                    return { sessions };
                }),
                deleteSession: (id: string) => set((state) => ({ sessions: state.sessions.filter((item) => item.id !== id) })),
                updateSessionMeta: (session_id, patch) => set((state) => {
                    const sessions = state.sessions.map((session) => {
                        if (session.id !== session_id) return session;
                        return touchSession(session, patch);
                    });

                    return {
                        sessions: sortSessionsByRecent(sessions),
                    };
                }),
                setHasHydrated: (status) => {
                    return set({
                        _hasHydrated: status
                    });
                },
            })
        },
        {
            name: 'revornix-ai-chat', // unique name
            version: 4,
            storage: createJSONStorage(() => storage),
            migrate: (persistedState) => {
                const state = persistedState as Partial<AIChatState & AIChatAction> | undefined;

                return {
                    _hasHydrated: false,
                    currentSessionId: state?.currentSessionId ?? null,
                    ownerUserId: state?.ownerUserId ?? null,
                    sessions: Array.isArray(state?.sessions)
                        ? sortSessionsByRecent(state.sessions.map((session) => hydrateSessionItem(session)))
                        : [],
                };
            },
            onRehydrateStorage: (state) => {
                // optional
                return (state, error) => {
                    state && state.setHasHydrated(true)
                    if (error) {
                        console.error('onRehydrateStorage error: ', error)
                    }
                }
            },
        },
    ),
)
