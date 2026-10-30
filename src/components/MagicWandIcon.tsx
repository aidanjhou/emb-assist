import React from 'react';

interface MagicWandIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 经典 macOS / Apple 风格魔棒图标 (对齐 🪄)
 * 特征：细长黑色杖身 + 纯白尖端 (White Tip) + 金黄璀璨星芒
 */
export function MagicWandIcon({ size = 28, className, style }: MagicWandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {/* 1. 细长黑色法杖身 (倾斜 45 度) */}
      <line
        x1="7"
        y1="25"
        x2="15"
        y2="17"
        stroke="#1c1917"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* 2. 标志性纯白杖尖 (White tip) */}
      <line
        x1="15"
        y1="17"
        x2="19.5"
        y2="12.5"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <line
        x1="15"
        y1="17"
        x2="19.5"
        y2="12.5"
        stroke="#d1d5db"
        strokeWidth="0.5"
        strokeLinecap="round"
      />

      {/* 3. 金黄核心主星芒 */}
      <path
        d="M23 4C23.3 7 25.5 9.2 28.5 9.5C25.5 9.8 23.3 12 23 15C22.7 12 20.5 9.8 17.5 9.5C20.5 9.2 22.7 7 23 4Z"
        fill="#f59e0b"
      />

      {/* 4. 左侧灵动淡金小星芒 */}
      <path
        d="M13 3C13.2 5 14.6 6.4 16.5 6.6C14.6 6.8 13.2 8.2 13 10.2C12.8 8.2 11.4 6.8 9.5 6.6C11.4 6.4 12.8 5 13 3Z"
        fill="#fbbf24"
      />

      {/* 5. 右下方小星光 */}
      <path
        d="M26.5 17C26.6 18.2 27.6 19.1 28.8 19.2C27.6 19.3 26.6 20.2 26.5 21.4C26.4 20.2 25.4 19.3 24.2 19.2C25.4 19.1 26.4 18.2 26.5 17Z"
        fill="#fcd34d"
      />

      {/* 6. 周围散落的微星点 */}
      <circle cx="10" cy="14" r="0.8" fill="#fbbf24" />
      <circle cx="20" cy="18" r="0.9" fill="#f59e0b" />
    </svg>
  );
}
