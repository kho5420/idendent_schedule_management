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
                    minHeight: 34,
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 11,
                    color: '#1e40af',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 6,
                    padding: '4px 8px',
                    lineHeight: 1.4,
                }}
            >
                📄 원본은 그대로 두고, 생성 스케줄만 담긴 새 엑셀 파일로 받아요
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
