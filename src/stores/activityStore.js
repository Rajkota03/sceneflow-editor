import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useActivityStore = create(
    persist(
        (set, get) => ({
            // Array of daily records: { date: 'YYYY-MM-DD', count: number }
            dailyCounts: [],

            // Called whenever text is added
            logWords: (wordCount) => {
                if (!wordCount || wordCount <= 0) return;

                const todayStr = new Date().toISOString().split('T')[0];

                set((state) => {
                    const counts = [...state.dailyCounts];
                    const todayIndex = counts.findIndex((c) => c.date === todayStr);

                    if (todayIndex >= 0) {
                        counts[todayIndex] = {
                            ...counts[todayIndex],
                            count: counts[todayIndex].count + wordCount,
                        };
                    } else {
                        counts.push({ date: todayStr, count: wordCount });
                    }

                    // Keep only last 365 days
                    if (counts.length > 365) {
                        counts.shift();
                    }

                    return { dailyCounts: counts };
                });
            },

            // Get count for a specific date string (YYYY-MM-DD)
            getCountForDate: (dateStr) => {
                const record = get().dailyCounts.find((c) => c.date === dateStr);
                return record ? record.count : 0;
            },

            // Get total words written across all time
            getTotalWords: () => {
                return get().dailyCounts.reduce((sum, record) => sum + record.count, 0);
            },

            // Get current streak (days in a row including today or yesterday)
            getCurrentStreak: () => {
                const counts = [...get().dailyCounts].sort((a, b) => new Date(b.date) - new Date(a.date));
                if (counts.length === 0) return 0;

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let streak = 0;
                let currentCheckDate = new Date(today);

                // Check if they wrote today
                const wroteToday = counts.some(c => c.date === today.toISOString().split('T')[0] && c.count > 0);

                // If they didn't write today, streak could still be alive from yesterday
                if (!wroteToday) {
                    currentCheckDate.setDate(currentCheckDate.getDate() - 1);
                }

                while (true) {
                    const dateStr = currentCheckDate.toISOString().split('T')[0];
                    const dayRecord = counts.find(c => c.date === dateStr);

                    if (dayRecord && dayRecord.count > 0) {
                        streak++;
                        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
                    } else {
                        break;
                    }
                }

                return streak;
            }
        }),
        {
            name: 'sceneflow-activity',
        }
    )
);

export default useActivityStore;
