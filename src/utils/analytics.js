// Desc: Utility functions for aggregating analytics data

// Function to aggregate clicks by date for the last 7 days
export const aggregateClicksByDate = (clicks) => {
    const last7Days = [...Array(7)].map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map((date) => ({
        date,
        count: clicks.filter((click) => click.timestamp.startsWith(date)).length
    }));
};

// Function to aggregate analytics by field (e.g., os, device)
export const aggregateByField = (clicks, field) => {
    const fieldCounts = {};
    clicks.forEach((click) => {
        const value = click[field] || 'Unknown';
        if (!fieldCounts[value]) {
            fieldCounts[value] = { uniqueClicks: 0, uniqueUsers: new Set() };
        }
        fieldCounts[value].uniqueClicks++;
        fieldCounts[value].uniqueUsers.add(click.ip);
    });

    return Object.keys(fieldCounts).map((key) => ({
        [`${field}Name`]: key,
        uniqueClicks: fieldCounts[key].uniqueClicks,
        uniqueUsers: fieldCounts[key].uniqueUsers.size,
    }));
};
