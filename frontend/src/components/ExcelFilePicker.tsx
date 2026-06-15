import { ExcelFileField } from './ExcelFileField';
import type { ExcelConnection } from '../types';

interface Props {
    onScheduleChange: (connection: ExcelConnection) => void;
    onLeaveChange: (connection: ExcelConnection) => void;
}

export function ExcelFilePicker({ onScheduleChange, onLeaveChange }: Props) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
                style={{
                    fontSize: 11,
                    color: '#92400e',
                    background: '#fefce8',
                    border: '1px solid #fde68a',
                    borderRadius: 6,
                    padding: '6px 8px',
                    lineHeight: 1.5,
                }}
            >
                ⚠️ 다운로드 시 기존 시트의 서식(색·테두리·병합)은 사라질 수 있어요. 글자(값)는
                그대로 유지됩니다.
            </div>
            <ExcelFileField
                label="📅 스케줄 파일"
                storageKey="excel_tab_schedule"
                tabPlaceholder="탭 이름 (예: 26.07)"
                onConnectionChange={onScheduleChange}
            />
            <ExcelFileField
                label="🌴 휴무신청 파일 (선택)"
                storageKey="excel_tab_leave_request"
                tabPlaceholder="탭 이름"
                onConnectionChange={onLeaveChange}
            />
        </div>
    );
}
