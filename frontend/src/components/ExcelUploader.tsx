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

    function handleRemove(e: React.MouseEvent) {
        e.stopPropagation();
        onFileChange(null);
        if (inputRef.current) inputRef.current.value = '';
    }

    const clickable = !file;

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
                    if (file) return;
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={file ? undefined : handleDrop}
                style={{
                    border: `1.5px dashed ${isDragging ? 'var(--color-accent-from)' : 'var(--color-border-hover)'}`,
                    borderRadius: 8,
                    padding: 16,
                    textAlign: 'center',
                    cursor: clickable ? 'pointer' : 'default',
                    background: isDragging ? '#dcfce7' : 'transparent',
                    transition: 'all 0.2s',
                }}
            >
                {file ? (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                        }}
                    >
                        <span style={{ fontSize: 13, color: 'var(--color-success)' }}>
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
                    <div style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>
                        📂 .xlsx 파일을 드래그하거나 클릭하여 선택
                    </div>
                )}
            </div>
        </div>
    );
}
