import changelogRaw from '../../CHANGELOG.md?raw';

const STORAGE_KEY = 'lastSeenVersion';

export interface VersionEntry {
    version: string;
    date: string;
    items: string[];
}

export function parseChangelog(raw: string): VersionEntry[] {
    const versions: VersionEntry[] = [];
    let current: VersionEntry | null = null;

    for (const line of raw.split('\n')) {
        const match = line.match(/^## (v[\d.]+) — (.+)/);
        if (match) {
            if (current) versions.push(current);
            current = { version: match[1], date: match[2], items: [] };
        } else if (current && line.startsWith('- ')) {
            current.items.push(line.slice(2));
        }
    }
    if (current) versions.push(current);
    return versions;
}

export const versions = parseChangelog(changelogRaw);
export const latestVersion = versions[0]?.version ?? '';

export function hasNewVersion(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== latestVersion;
}

export function markAsSeen() {
    localStorage.setItem(STORAGE_KEY, latestVersion);
}
