import type { CSSProperties } from 'react';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  style?: CSSProperties;
}

export function SkeletonBox({
  width = '100%',
  height = 14,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  return (
    <span
      className="skeleton-shimmer"
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export interface SkeletonColumn {
  width?: number | string;
  hasIcon?: 'circle' | 'square';
  twoLines?: boolean;
  align?: 'left' | 'right';
}

interface SkeletonTableRowsProps {
  rows?: number;
  columns: SkeletonColumn[];
}

export function SkeletonTableRows({ rows = 6, columns }: SkeletonTableRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`sk-row-${rIdx}`} aria-hidden="true">
          {columns.map((col, cIdx) => (
            <td
              key={`sk-col-${rIdx}-${cIdx}`}
              style={{ textAlign: col.align || 'left' }}
            >
              {col.hasIcon ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <SkeletonBox
                    width={34}
                    height={34}
                    borderRadius={col.hasIcon === 'circle' ? '50%' : 10}
                    style={{ flexShrink: 0 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <SkeletonBox width={col.width || '65%'} height={13} />
                    {col.twoLines && <SkeletonBox width="45%" height={10} />}
                  </div>
                </div>
              ) : col.twoLines ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SkeletonBox width={col.width || '85%'} height={12} />
                  <SkeletonBox width="55%" height={10} />
                </div>
              ) : (
                <SkeletonBox
                  width={col.width || '70%'}
                  height={13}
                  style={col.align === 'right' ? { marginLeft: 'auto' } : undefined}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
