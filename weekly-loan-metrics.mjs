export function dateFromStoredValue(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value.toDate === "function") {
        const converted = value.toDate();
        return Number.isNaN(converted.getTime()) ? null : converted;
    }
    const seconds = Number(value.seconds ?? value._seconds);
    if (Number.isFinite(seconds)) return new Date(seconds * 1000);
    if (typeof value === "number") {
        const milliseconds = value < 100000000000 ? value * 1000 : value;
        const converted = new Date(milliseconds);
        return Number.isNaN(converted.getTime()) ? null : converted;
    }
    if (typeof value === "string") {
        const converted = new Date(value);
        return Number.isNaN(converted.getTime()) ? null : converted;
    }
    return null;
}

export function getLoanRecordDate(loan) {
    return dateFromStoredValue(loan?.startDate)
        || dateFromStoredValue(loan?.createdAt)
        || dateFromStoredValue(loan?.loanDate)
        || dateFromStoredValue(loan?.date);
}

export function calculateWeeklyLoanMetrics(clients, collectorId, now = new Date()) {
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    let loansAmount = 0;
    let interestAmount = 0;
    const details = [];
    for (const client of clients.filter((item) => item.collectorId === collectorId)) {
        for (const loan of client.loans || []) {
            const loanDate = getLoanRecordDate(loan);
            if (!loanDate || loanDate < weekStart || loanDate >= nextWeekStart || loan.migrationDate) continue;

            let principal = Number.parseFloat(loan.principalAmount);
            if (!Number.isFinite(principal) && loan.totalLoan) {
                const rate = Number.parseFloat(loan.interestRate ?? client.interestRate) || 20;
                principal = Number.parseFloat(loan.totalLoan) / (1 + (rate / 100));
            }
            principal = Number.isFinite(principal) ? principal : 0;
            const total = Number.parseFloat(loan.totalLoan) || 0;
            loansAmount += principal;
            interestAmount += total - principal;
            details.push({ name: client.name, amount: principal });
        }
    }
    return { loansAmount, interestAmount, details, weekStart, nextWeekStart };
}
