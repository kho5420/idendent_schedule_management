import { useRef, useState } from 'react';

interface Props {
    file: File | null;
    onFileChange: (file: File | null) => void;
}

export function ExcelUploader({ file, onFileChange }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped?.name.endsWith('.xlsx')) onFileChange(dropped);
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0] ?? null;
        if (selected) onFileChange(selected);
    }

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                style={{ display: 'none' }}
                onChange={handleChange}
            />
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{
                    border: `1.5px dashed ${isDragging ? 'var(--color-accent-from)' : 'var(--color-border-hover)'}`,
                    borderRadius: 8,
                    padding: 16,
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragging ? '#1a1a2e' : 'transparent',
                    transition: 'all 0.2s',
                }}
            >
                {file ? (
                    <div style={{ fontSize: 12, color: 'var(--color-success)' }}>
                        ✅ {file.name}
                    </div>
                ) : (
                    <div style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>
                        📂 .xlsx 파일을 드래그하거나 클릭하여 선택
                    </div>
                )}
            </div>
        </div>
    );
}
