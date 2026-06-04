import type { InputMethod } from '../types';
import { ExcelUploader } from './ExcelUploader';
import { GoogleSheetPicker } from './GoogleSheetPicker';

interface Props {
    selected: InputMethod | null;
    uploadedFile: File | null;
    googleToken: string | null;
    sheetId: string | null;
    onMethodSelect: (method: InputMethod) => void;
    onFileChange: (file: File | null) => void;
    onTokenChange: (token: string | null) => void;
    onSheetIdChange: (id: string | null) => void;
}

interface CardProps {
    isSelected: boolean;
    onClick: () => void;
    icon: string;
    title: string;
    description: string;
    children: React.ReactNode;
}

function Card({ isSelected, onClick, icon, title, description, children }: CardProps) {
    return (
        <div
            onClick={onClick}
            style={{
                flex: 1,
                background: isSelected ? '#21213a' : 'var(--color-card)',
                border: `1.5px solid ${isSelected ? 'var(--color-accent-from)' : 'var(--color-border)'}`,
                borderRadius: 12,
                padding: 20,
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
            }}
        >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                {title}
            </h3>
            <p style={{ fontSize: 11, color: 'var(--color-text-sub)', marginBottom: 12 }}>
                {description}
            </p>
            <div onClick={(e) => e.stopPropagation()}>{children}</div>
        </div>
    );
}

export function InputMethodCard({
    selected,
    uploadedFile,
    googleToken,
    sheetId,
    onMethodSelect,
    onFileChange,
    onTokenChange,
    onSheetIdChange,
}: Props) {
    return (
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
            <Card
                isSelected={selected === 'excel'}
                onClick={() => onMethodSelect('excel')}
                icon="📁"
                title="엑셀 파일 업로드"
                description="로컬 .xlsx 파일을 직접 업로드합니다"
            >
                <ExcelUploader file={uploadedFile} onFileChange={onFileChange} />
            </Card>
            <Card
                isSelected={selected === 'google'}
                onClick={() => onMethodSelect('google')}
                icon="📊"
                title="구글 스프레드시트"
                description="Google 계정으로 로그인하여 시트를 불러옵니다"
            >
                <GoogleSheetPicker
                    token={googleToken}
                    sheetId={sheetId}
                    onTokenChange={onTokenChange}
                    onSheetIdChange={onSheetIdChange}
                />
            </Card>
        </div>
    );
}
