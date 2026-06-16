import type { DayAssignment, LeaveRequest } from '../types';

const NAMES_PER_LINE = 4;

/** 평일 전체휴진 셀에 표기하는 문구 (출력 단계에서 배경색 칠할 때도 이 문구로 식별) */
export const CLOSURE_LABEL = '전체 휴진';

/** 전체휴진 칸 배경색 — 미리보기·엑셀·구글 시트가 모두 이 한 색을 쓴다 */
export const CLOSURE_BG_HEX = '#fde7ea';

/** 전체휴진 '전체 휴진' 글자색 (빨강) — 세 출력 공통 */
export const CLOSURE_TEXT_HEX = '#dc2626';

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

/** 평일 전체휴진(진료 없음·출근 0명)일 때 — 셀에 인원수 대신 '전체 휴진'을 표기 */
export function isClosureDay(a: DayAssignment): boolean {
    return (
        a.working.length === 0 &&
        a.doctorAliases.length === 0 &&
        !a.isFullAttendance &&
        a.dayOfWeek >= 1 &&
        a.dayOfWeek <= 5
    );
}

export function formatDayCell(assignment: DayAssignment): string {
    const blocks = isClosureDay(assignment)
        ? [CLOSURE_LABEL]
        : assignment.hasNightShift
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
