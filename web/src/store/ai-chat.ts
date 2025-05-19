import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval' // can use anything: IndexedDB, Ionic Storage, etc.

export type DocumentItem = {
    id: string;
    title: string;
    description: string;
    ai_summary: string;
};

export type ResponseItem = {
    status: string;
    content: string;
}

export type Message = {
    content: string;
    role: string;
    chat_id: string;
    reasoning_content?: string;
    finish_reason?: string;
    quote?: DocumentItem[];
    references?: ReferenceItem[]
};

export type CoverImage = {
    url: string
    width: number
    height: number
}

export type Extra = {
    rel_info: string
    freshness_info: string
    auth_info: string
    final_ref: string
}

export type ReferenceItem = {
    url: string
    logo_url: string
    site_name: string
    title: string
    summary: string
    cover_image: CoverImage
}

export type SessionItem = {
    id: string
    title: string
    messages: Message[]
}

export type AIChatState = {
    currentSessionId: string | null
    sessions: SessionItem[]
    _hasHydrated: boolean
}

export type AIChacAction = {
    setCurrentSessionId: (id: string | null) => void
    addSession: (chat: SessionItem) => void
    updateSessionMessages: (id: string, new_messages: Message[]) => void
    deleteSession: (id: string) => void
    setHasHydrated: (status: boolean) => void
}

// Custom storage object
const storage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (typeof window === 'undefined') return null // SSR 阶段返回 null
        // console.log(name, 'has been retrieved')
        return (await get(name)) || null
    },
    setItem: async (name: string, value: string): Promise<void> => {
        if (typeof window === 'undefined') return // SSR 阶段跳过保存
        // console.log(name, 'with value', JSON.parse(value).state, 'has been saved')
        await set(name, value)
    },
    removeItem: async (name: string): Promise<void> => {
        if (typeof window === 'undefined') return
        // console.log(name, 'has been deleted')
        await del(name)
    },
}

export const useAiChatStore = create<AIChatState & AIChacAction>()(
    persist(
        (set, get) => {
            return ({
                _hasHydrated: false,
                sessions: [],
                currentSessionId: null,
                setCurrentSessionId: (id) => set({ currentSessionId: id }),
                updateSessionMessages: (id, new_messages) => {
                    return set((state) => ({
                        sessions: state.sessions.map((session) => {
                            if (session.id == id) {
                                return {
                                    ...session,
                                    messages: new_messages,
                                };
                            }
                            return session;
                        }),
                    }));
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
                    } else {
                    }

                }
            },
            // partialize: debounce((state) => state, 500), // 500ms防抖
            // merge: (persistedState, currentState) =>
            //     mergeDeepLeft(persistedState, currentState)
        },
    ),
)
