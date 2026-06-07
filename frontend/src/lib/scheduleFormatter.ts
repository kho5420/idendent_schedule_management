import type { DayAssignment, LeaveRequest } from '../types';

const NAMES_PER_LINE = 4;

function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

function formatNameLines(names: string[]): string {
    return chunk(names, NAMES_PER_LINE)
        .map((line) => line.join(','))
        .join('\n');
}

function formatCount(workingCount: number, isOrthoDay: boolean, orthoStaffCount: number): string {
    if (isOrthoDay && orthoStaffCount > 0) {
        return `(${workingCount - orthoStaffCount}+${orthoStaffCount})`;
    }
    return `(${workingCount})`;
}

function formatAnnotationLine(label: string, requests: LeaveRequest[]): string | null {
    if (requests.length === 0) return null;
    return `${label}:${requests.map((r) => r.name).join(',')}`;
}

function formatShiftBlock(label: string, names: string[]): string {
    return `${label})${formatNameLines(names)}\n(${names.length})`;
}

function formatNightShiftCell(assignment: DayAssignment): string {
    return [
        formatShiftBlock('주', assignment.dayShiftStaff),
        formatShiftBlock('야', assignment.nightShiftStaff),
    ].join('\n\n');
}

function formatAnnotations(assignment: DayAssignment): string | null {
    const lines = [
        formatAnnotationLine(
            '주차',
            assignment.fullDayOff.filter((r) => r.type === '주차')
        ),
        formatAnnotationLine(
            '연차',
            assignment.fullDayOff.filter((r) => r.type === '연차')
        ),
        formatAnnotationLine('반차', assignment.halfDayOff),
    ].filter((line): line is string => line !== null);

    return lines.length > 0 ? lines.join('\n') : null;
}

export function formatDayCell(assignment: DayAssignment): string {
    const blocks = assignment.hasNightShift
        ? [formatNightShiftCell(assignment)]
        : [
              formatNameLines(assignment.working),
              formatCount(
                  assignment.working.length,
                  assignment.isOrthoDay,
                  assignment.orthoStaffCount
              ),
          ];

    const annotations = formatAnnotations(assignment);
    if (annotations) blocks.push(annotations);

    return blocks.join('\n\n');
}
