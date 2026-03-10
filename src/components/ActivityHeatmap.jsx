import React, { useMemo } from 'react';
import useActivityStore from '../stores/activityStore';
import '../styles/activity-heatmap.css';

export default function ActivityHeatmap() {
    const { dailyCounts, getTotalWords, getCurrentStreak } = useActivityStore();

    // Generate last 365 days
    const days = useMemo(() => {
        const result = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 364; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            const dateStr = date.toISOString().split('T')[0];
            const record = dailyCounts.find(c => c.date === dateStr);
            const count = record ? record.count : 0;

            result.push({
                date: dateStr,
                count: count,
                dateObj: date
            });
        }
        return result;
    }, [dailyCounts]);

    // Calculate max to determine intensity
    const maxCount = useMemo(() => {
        if (dailyCounts.length === 0) return 1;
        return Math.max(...dailyCounts.map(c => c.count), 1);
    }, [dailyCounts]);

    // Group into weeks (columns of 7)
    const weeks = useMemo(() => {
        const weeksArray = [];
        let currentWeek = [];

        days.forEach((day, index) => {
            currentWeek.push(day);
            if (currentWeek.length === 7 || index === days.length - 1) {
                weeksArray.push(currentWeek);
                currentWeek = [];
            }
        });

        return weeksArray;
    }, [days]);

    const getIntensityClass = (count) => {
        if (count === 0) return 'level-0';
        const ratio = count / maxCount;
        if (ratio < 0.25) return 'level-1';
        if (ratio < 0.5) return 'level-2';
        if (ratio < 0.75) return 'level-3';
        return 'level-4';
    };

    return (
        <div className="activity-heatmap-container">
            <div className="heatmap-header">
                <h3>Writing Activity</h3>
                <div className="heatmap-stats">
                    <div className="stat">
                        <span className="stat-value">{getTotalWords().toLocaleString()}</span>
                        <span className="stat-label">Total Words</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{getCurrentStreak()} <span className="fire-emoji">🔥</span></span>
                        <span className="stat-label">Day Streak</span>
                    </div>
                </div>
            </div>

            <div className="heatmap-graph-wrapper">
                <div className="heatmap-graph">
                    {weeks.map((week, wIndex) => (
                        <div key={wIndex} className="heatmap-week">
                            {week.map((day, dIndex) => (
                                <div
                                    key={day.date}
                                    className={`heatmap-day ${getIntensityClass(day.count)}`}
                                    title={`${day.date}: ${day.count} words`}
                                ></div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="heatmap-legend">
                <span>Less</span>
                <div className="heatmap-day level-0"></div>
                <div className="heatmap-day level-1"></div>
                <div className="heatmap-day level-2"></div>
                <div className="heatmap-day level-3"></div>
                <div className="heatmap-day level-4"></div>
                <span>More</span>
            </div>
        </div>
    );
}
