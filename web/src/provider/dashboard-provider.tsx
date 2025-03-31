'use client';

import { DashboardStore } from '@/store/dashboard';
import { createContext } from 'react';

export const DashboardContext = createContext<DashboardStore | null>(null);
