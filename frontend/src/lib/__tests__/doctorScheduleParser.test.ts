import { describe, it, expect } from 'vitest';
import { parseDoctorSchedule } from '../doctorScheduleParser';

describe('parseDoctorSchedule', () => {
    it('날짜행에서 원장님 코드를 요일과 함께 추출한다', () => {
        const rows: unknown[][] = [
            ['', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
            [
                '',
                '1 Y,신',
                '2 Y,오,신',
                '3 원장님 전체출근',
                '4 오,신',
                '5 Y,오,우',
                '6 Y,오,신,우',
                7,
            ],
        ];

        const result = parseDoctorSchedule(rows, { year: 2026, month: 6 });

        expect(result).toEqual([
            {
                date: '2026-06-01',
                dayOfWeek: 1,
                doctorAliases: ['Y', '신'],
                isFullAttendance: false,
            },
            {
                date: '2026-06-02',
                dayOfWeek: 2,
                doctorAliases: ['Y', '오', '신'],
                isFullAttendance: false,
            },
            { date: '2026-06-03', dayOfWeek: 3, doctorAliases: [], isFullAttendance: true },
            {
                date: '2026-06-04',
                dayOfWeek: 4,
                doctorAliases: ['오', '신'],
                isFullAttendance: false,
            },
            {
                date: '2026-06-05',
                dayOfWeek: 5,
                doctorAliases: ['Y', '오', '우'],
                isFullAttendance: false,
            },
            {
                date: '2026-06-06',
                dayOfWeek: 6,
                doctorAliases: ['Y', '오', '신', '우'],
                isFullAttendance: false,
            },
            { date: '2026-06-07', dayOfWeek: 0, doctorAliases: [], isFullAttendance: false },
        ]);
    });

    it('"전체출근" 띄어쓰기 변형과 코드 없이 숫자만 있는 셀을 처리한다', () => {
        const rows: unknown[][] = [
            ['', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
            [
                '',
                '13 Y,신',
                '14 Y,오,신',
                '15 원장님 전체출근',
                '16 Y,오,신',
                17,
                '18 오,신,정',
                '19 Y',
            ],
        ];

        const result = parseDoctorSchedule(rows, { year: 2026, month: 7 });

        expect(result).toEqual([
            {
                date: '2026-07-13',
                dayOfWeek: 1,
                doctorAliases: ['Y', '신'],
                isFullAttendance: false,
            },
            {
                date: '2026-07-14',
                dayOfWeek: 2,
                doctorAliases: ['Y', '오', '신'],
                isFullAttendance: false,
            },
            { date: '2026-07-15', dayOfWeek: 3, doctorAliases: [], isFullAttendance: true },
            {
                date: '2026-07-16',
                dayOfWeek: 4,
                doctorAliases: ['Y', '오', '신'],
                isFullAttendance: false,
            },
            { date: '2026-07-17', dayOfWeek: 5, doctorAliases: [], isFullAttendance: false },
            {
                date: '2026-07-18',
                dayOfWeek: 6,
                doctorAliases: ['오', '신', '정'],
                isFullAttendance: false,
            },
            { date: '2026-07-19', dayOfWeek: 0, doctorAliases: ['Y'], isFullAttendance: false },
        ]);
    });

    it('여러 주차 블록(5행 간격)을 모두 순회한다', () => {
        const rows: unknown[][] = [
            ['', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
            ['', '', '', '1 원장님 전체출근', '2 오,신', '3 Y,오', '4 오,신,정', '5 Y'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            [
                '',
                '6 Y,신',
                '7 Y,오,신',
                '8 원장님 전체출근',
                '9 오,신',
                '10 Y,오,정',
                '11 오,신',
                '12 Y',
            ],
        ];

        const result = parseDoctorSchedule(rows, { year: 2026, month: 7 });

        expect(result).toEqual([
            { date: '2026-07-01', dayOfWeek: 3, doctorAliases: [], isFullAttendance: true },
            {
                date: '2026-07-02',
                dayOfWeek: 4,
                doctorAliases: ['오', '신'],
                isFullAttendance: false,
            },
            {
                date: '2026-07-03',
                dayOfWeek: 5,
                doctorAliases: ['Y', '오'],
                isFullAttendance: false,
            },
            {
                date: '2026-07-04',
                dayOfWeek: 6,
                doctorAliases: ['오', '신', '정'],
                isFullAttendance: false,
            },
            { date: '2026-07-05', dayOfWeek: 0, doctorAliases: ['Y'], isFullAttendance: false },
            {
                date: '2026-07-06',
                dayOfWeek: 1,
                doctorAliases: ['Y', '신'],
                isFullAttendance: false,
            },
            {
                date: '2026-07-07',
                dayOfWeek: 2,
                doctorAliases: ['Y', '오', '신'],
                isFullAttendance: false,
            },
            { date: '2026-07-08', dayOfWeek: 3, doctorAliases: [], isFullAttendance: true },
            {
                date: '2026-07-09',
                dayOfWeek: 4,
                doctorAliases: ['오', '신'],
                isFullAttendance: false,
            },
            {
                date: '2026-07-10',
                dayOfWeek: 5,
                doctorAliases: ['Y', '오', '정'],
                isFullAttendance: false,
            },
            {
                date: '2026-07-11',
                dayOfWeek: 6,
                doctorAliases: ['오', '신'],
                isFullAttendance: false,
            },
            { date: '2026-07-12', dayOfWeek: 0, doctorAliases: ['Y'], isFullAttendance: false },
        ]);
    });
});
