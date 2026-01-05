import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import { SessionItem } from '@/types/ai'

export type AIChatState = {
    currentSessionId: string | null;
    currentSession: () => SessionItem | null;
    sessions: SessionItem[];
    _hasHydrated: boolean;
};

export type AIChatAction = {
    setCurrentSessionId: (id: string | null) => void;
    addSession: (chat: SessionItem) => void;
    deleteSession: (id: string) => void;
    setHasHydrated: (status: boolean) => void;
    appendChatToken: (
        chat_id: string,
        role: 'assistant' | 'user',
        token: string
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

export const useAiChatStore = create<AIChatState & AIChatAction>()(
    persist(
        (set, get) => {
            return ({
                _hasHydrated: false,
                sessions: [],
                currentSessionId: null,
                currentSession: () => {
                    const currentSessionId = get().currentSessionId;
                    if (!currentSessionId) return null;
                    return get().sessions.find((session) => session.id === currentSessionId) || null;
                },
                setCurrentSessionId: (id) => set({ currentSessionId: id }),
                appendChatToken: (chat_id: string, role: string, token: string) => {
                    return set((state) => {
                        const sessions = state.sessions.map(session => {
                            if (session.id !== state.currentSessionId) return session;

                            const messages = [...session.messages];

                            const idx = messages.findIndex(m => m.chat_id === chat_id);

                            if (idx === -1) {
                                messages.push({
                                    chat_id: chat_id,
                                    role: role,
                                    content: token,
                                });
                            } else {
                                messages[idx] = {
                                    ...messages[idx],
                                    content: messages[idx].content + token,
                                };
                            }

                            return { ...session, messages };
                        });

                        return { sessions }; // ✅ 必须 return
                    })
                },
                addSession: (session: SessionItem) => set((state) => ({ sessions: [...state.sessions, session] })),
                deleteSession: (id: string) => set((state) => ({ sessions: state.sessions.filter((item) => item.id !== id) })),
                setHasHydrated: (status) => {
                    return set({
                        _hasHydrated: status
                    });
                },
            })
        },
        {
            name: 'revornix-ai-chat', // unique name
            storage: createJSONStorage(() => storage),
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
