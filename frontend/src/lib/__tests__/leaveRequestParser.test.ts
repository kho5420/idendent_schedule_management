import { describe, it, expect } from 'vitest';
import { parseLeaveRequests } from '../leaveRequestParser';

describe('parseLeaveRequests', () => {
    it('번호가 붙은 휴무 신청을 이름/유형/날짜로 추출한다', () => {
        const rows: unknown[][] = [
            ['', '', '*공지* 안내문', '', '', '', ''],
            ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
            ['', '', 1, 2, 3, 4, 5],
            ['', '', '1. 미연연차', '1.미연연차', '1.미연연차', '', '1.성민주차'],
            ['', '', '', '', '', '', '2.지수주차'],
        ];

        const result = parseLeaveRequests(rows, { year: 2026, month: 7 });

        expect(result).toEqual([
            { date: '2026-07-01', name: '미연', type: '연차' },
            { date: '2026-07-02', name: '미연', type: '연차' },
            { date: '2026-07-03', name: '미연', type: '연차' },
            { date: '2026-07-05', name: '성민', type: '주차' },
            { date: '2026-07-05', name: '지수', type: '주차' },
        ]);
    });

    it('번호 없이 적힌 휴무 신청도 인식한다', () => {
        const rows: unknown[][] = [
            ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
            [20, 21, 22, 23, 24, 25, 26],
            ['1.지수주차', '1.혜수연차', '3.윤정연차', '4.윤정연차', '언경반차', '', '은경주차'],
        ];

        const result = parseLeaveRequests(rows, { year: 2026, month: 7 });

        expect(result).toEqual([
            { date: '2026-07-20', name: '지수', type: '주차' },
            { date: '2026-07-21', name: '혜수', type: '연차' },
            { date: '2026-07-22', name: '윤정', type: '연차' },
            { date: '2026-07-23', name: '윤정', type: '연차' },
            { date: '2026-07-24', name: '언경', type: '반차' },
            { date: '2026-07-26', name: '은경', type: '주차' },
        ]);
    });

    it('공지/상태 표시/변경 메모 등 휴무 신청이 아닌 텍스트는 무시한다', () => {
        const rows: unknown[][] = [
            ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
            ['', '', 1, 2, 3, 4, 5],
            [
                '',
                '',
                '--적용완료-- 변동시 이 밑으로 적어주세요~',
                '------휴진--------',
                '4이은주차 ----마감-----',
                '지수 토요일 연차->출근으로 변경',
                '',
            ],
        ];

        const result = parseLeaveRequests(rows, { year: 2026, month: 7 });

        expect(result).toEqual([{ date: '2026-07-03', name: '이은', type: '주차' }]);
    });

    it('날짜 행에 원장님 코드가 함께 적혀 있어도 날짜만 추출한다', () => {
        const rows: unknown[][] = [
            ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
            [13, 14, 15, '16 Y 출근 ', 17, 18, 19],
            [
                '1.예진 주차',
                '1.언경연차 ',
                '1.언경주차',
                '',
                '------휴진--------',
                '1.성민주차',
                '1성민연차',
            ],
        ];

        const result = parseLeaveRequests(rows, { year: 2026, month: 7 });

        expect(result).toEqual([
            { date: '2026-07-13', name: '예진', type: '주차' },
            { date: '2026-07-14', name: '언경', type: '연차' },
            { date: '2026-07-15', name: '언경', type: '주차' },
            { date: '2026-07-18', name: '성민', type: '주차' },
            { date: '2026-07-19', name: '성민', type: '연차' },
        ]);
    });

    it('여러 주차 블록을 모두 순회하며 추출한다', () => {
        const rows: unknown[][] = [
            ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
            ['', '', 1, 2, 3, 4, 5],
            ['', '', '1. 미연연차', '', '', '', ''],
            [6, 7, 8, 9, 10, 11, 12],
            ['', '', '', '1.예진주차', '', '', ''],
        ];

        const result = parseLeaveRequests(rows, { year: 2026, month: 7 });

        expect(result).toEqual([
            { date: '2026-07-01', name: '미연', type: '연차' },
            { date: '2026-07-09', name: '예진', type: '주차' },
        ]);
    });
});
