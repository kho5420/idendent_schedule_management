import type { DayAssignment, LeaveRequest } from '../types';
import { ORTHO_FIXED_COUNT } from './scheduleAssigner';

const NAMES_PER_LINE = 4;

/** 알바 글자색 — 미리보기·구글 시트가 같은 값을 쓴다 (알바는 색으로만 구분, 접미사 없음) */
export const ALBA_COLOR = '#FF9900';

/** 그날 출근 명단 = 정규 인원 + 알바(정규 뒤에 붙임) */
export function rosterWithAlba(assignment: DayAssignment): string[] {
    return [...assignment.working, ...(assignment.albaWorking ?? [])];
}

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

function formatCount(assignment: DayAssignment): string {
    // 알바 포함 총 출근 인원 (알바는 정규 인원에 합산해 카운팅)
    const total = assignment.working.length + (assignment.albaWorking?.length ?? 0);

    // 교정일은 교정 인원을 정원(ORTHO_FIXED_COUNT)으로 고정 표기하고, 나머지(알바 포함)는 일반에 합산한다.
    const orthoShown =
        assignment.isOrthoDay && assignment.orthoStaffCount > 0
            ? Math.min(assignment.orthoStaffCount, ORTHO_FIXED_COUNT)
            : 0;

    // 오전/오후 반차가 있으면 (오전 출근/오후 출근) 으로 나눠 표기한다.
    // 출근 명단에 든 인원만 반영해 잘못된 차감을 막는다.
    const workingSet = new Set(assignment.working);
    const countHalfOff = (half: '오전' | '오후'): number =>
        assignment.halfDayOff.filter((r) => r.half === half && workingSet.has(r.name)).length;
    const amOff = countHalfOff('오전');
    const pmOff = countHalfOff('오후');

    if (amOff > 0 || pmOff > 0) {
        // 교정일이면 교정 정원은 고정하고 일반 인원만 오전/오후로 나눈다 (예: 6+3/5+3).
        if (orthoShown > 0) {
            return `(${total - orthoShown - amOff}+${orthoShown}/${total - orthoShown - pmOff}+${orthoShown})`;
        }
        return `(${total - amOff}/${total - pmOff})`;
    }

    if (orthoShown > 0) {
        return `(${total - orthoShown}+${orthoShown})`;
    }
    return `(${total})`;
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
          : [formatNameLines(rosterWithAlba(assignment)), formatCount(assignment)];

    const annotations = formatAnnotations(assignment);
    if (annotations) blocks.push(annotations);

    return blocks.join('\n\n');
}
