const ROLE_TONE: Record<string, { fg: string; bg: string }> = {
    대표원장: { fg: '#d97706', bg: '#fef3c7' },
    원장: { fg: '#d97706', bg: '#fef3c7' },
    진료실: { fg: '#0d9488', bg: '#ccfbf1' },
    알바: { fg: '#64748b', bg: '#f1f5f9' },
};

export function roleTone(role: string): { fg: string; bg: string } {
    return ROLE_TONE[role] ?? { fg: '#6b7280', bg: '#f3f4f6' };
}
