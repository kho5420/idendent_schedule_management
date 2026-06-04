import { useRef, useState } from 'react';

interface Props {
    file: File | null;
    onFileChange: (file: File | null) => void;
    isLoading?: boolean;
}

export function ExcelUploader({ file, onFileChange, isLoading }: Props) {
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

    function handleRemove(e: React.MouseEvent) {
        e.stopPropagation();
        onFileChange(null);
        if (inputRef.current) inputRef.current.value = '';
    }

    const clickable = !isLoading && !file;

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
                onClick={() => clickable && inputRef.current?.click()}
                onDragOver={(e) => {
                    if (isLoading || file) return;
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={isLoading || file ? undefined : handleDrop}
                style={{
                    border: `1.5px dashed ${isDragging ? 'var(--color-accent-from)' : 'var(--color-border-hover)'}`,
                    borderRadius: 8,
                    padding: 16,
                    textAlign: 'center',
                    cursor: clickable ? 'pointer' : 'default',
                    background: isDragging ? '#1a1a2e' : 'transparent',
                    transition: 'all 0.2s',
                }}
            >
                {isLoading ? (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        <span
                            style={{
                                width: 14,
                                height: 14,
                                border: '2px solid rgba(255,255,255,0.15)',
                                borderTopColor: 'var(--color-accent-from)',
                                borderRadius: '50%',
                                display: 'inline-block',
                                animation: 'spin 0.8s linear infinite',
                            }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>
                            처리 중...
                        </span>
                    </div>
                ) : file ? (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                        }}
                    >
                        <span style={{ fontSize: 12, color: 'var(--color-success)' }}>
                            ✅ {file.name}
                        </span>
                        <button
                            onClick={handleRemove}
                            title="파일 제거"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-sub)',
                                fontSize: 14,
                                lineHeight: 1,
                                padding: '2px 6px',
                                borderRadius: 4,
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            ✕
                        </button>
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
