/** 흑백 라인아트 스타일 프로필 실루엣 */
export function ProfileAvatar({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="72" height="72" fill="#fff" />
      <circle cx="36" cy="26" r="12" stroke="#111" strokeWidth="2" fill="#fff" />
      <path
        d="M14 62c4-14 14-20 22-20s18 6 22 20"
        stroke="#111"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M28 24c2 2 6 2 8 0" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="32" cy="26" r="1.5" fill="#111" />
      <circle cx="40" cy="26" r="1.5" fill="#111" />
    </svg>
  );
}
