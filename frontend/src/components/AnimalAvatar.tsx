const AVATARS = {
  fox: {
    label: 'Fox',
    color: '#D4A853',
    svg: (
      <g>
        {/* Ears */}
        <polygon points="10,8 16,2 18,12" fill="currentColor" opacity="0.9" />
        <polygon points="30,8 24,2 22,12" fill="currentColor" opacity="0.9" />
        <polygon points="12,9 16,4 17,12" fill="currentColor" opacity="0.3" />
        <polygon points="28,9 24,4 23,12" fill="currentColor" opacity="0.3" />
        {/* Head */}
        <ellipse cx="20" cy="20" rx="12" ry="11" fill="currentColor" opacity="0.85" />
        {/* Snout */}
        <ellipse cx="20" cy="25" rx="6" ry="5" fill="currentColor" opacity="0.5" />
        {/* Eyes */}
        <ellipse cx="15" cy="18" rx="1.8" ry="2" fill="#0A0A0F" />
        <ellipse cx="25" cy="18" rx="1.8" ry="2" fill="#0A0A0F" />
        <circle cx="15.5" cy="17.5" r="0.6" fill="white" opacity="0.8" />
        <circle cx="25.5" cy="17.5" r="0.6" fill="white" opacity="0.8" />
        {/* Nose */}
        <ellipse cx="20" cy="23" rx="2" ry="1.3" fill="#0A0A0F" />
        {/* Mouth */}
        <path d="M18 25 Q20 27 22 25" fill="none" stroke="#0A0A0F" strokeWidth="0.6" />
      </g>
    ),
  },
  wolf: {
    label: 'Wolf',
    color: '#8B9EC2',
    svg: (
      <g>
        {/* Ears - pointed */}
        <polygon points="9,10 14,1 17,13" fill="currentColor" opacity="0.9" />
        <polygon points="31,10 26,1 23,13" fill="currentColor" opacity="0.9" />
        <polygon points="11,10 14,3 16,13" fill="currentColor" opacity="0.25" />
        <polygon points="29,10 26,3 24,13" fill="currentColor" opacity="0.25" />
        {/* Head */}
        <ellipse cx="20" cy="20" rx="12" ry="11" fill="currentColor" opacity="0.85" />
        {/* Snout - longer */}
        <ellipse cx="20" cy="26" rx="5" ry="5" fill="currentColor" opacity="0.5" />
        {/* Eyes - narrow, intense */}
        <ellipse cx="14.5" cy="18" rx="2.2" ry="1.4" fill="#0A0A0F" />
        <ellipse cx="25.5" cy="18" rx="2.2" ry="1.4" fill="#0A0A0F" />
        <ellipse cx="15" cy="17.8" rx="0.8" ry="0.6" fill="#C8D850" opacity="0.9" />
        <ellipse cx="26" cy="17.8" rx="0.8" ry="0.6" fill="#C8D850" opacity="0.9" />
        {/* Nose */}
        <ellipse cx="20" cy="24" rx="2.2" ry="1.5" fill="#0A0A0F" />
        {/* Mouth snarl */}
        <path d="M17 26.5 Q20 28.5 23 26.5" fill="none" stroke="#0A0A0F" strokeWidth="0.7" />
      </g>
    ),
  },
  raven: {
    label: 'Raven',
    color: '#9B7FD4',
    svg: (
      <g>
        {/* Head */}
        <circle cx="20" cy="18" r="11" fill="currentColor" opacity="0.85" />
        {/* Head tuft */}
        <ellipse cx="20" cy="9" rx="3" ry="4" fill="currentColor" opacity="0.7" transform="rotate(-5 20 9)" />
        <ellipse cx="18" cy="9" rx="2" ry="3.5" fill="currentColor" opacity="0.5" transform="rotate(-15 18 9)" />
        {/* Beak */}
        <polygon points="20,21 14,25 20,30" fill="currentColor" opacity="0.55" />
        <polygon points="20,21 26,25 20,30" fill="currentColor" opacity="0.45" />
        <line x1="14" y1="25" x2="20" y2="26" stroke="#0A0A0F" strokeWidth="0.4" />
        {/* Eyes - piercing */}
        <circle cx="15" cy="17" r="2.2" fill="#0A0A0F" />
        <circle cx="25" cy="17" r="2.2" fill="#0A0A0F" />
        <circle cx="15.3" cy="16.5" r="1" fill="#E8E040" opacity="0.95" />
        <circle cx="25.3" cy="16.5" r="1" fill="#E8E040" opacity="0.95" />
        <circle cx="15.5" cy="16.3" r="0.4" fill="#0A0A0F" />
        <circle cx="25.5" cy="16.3" r="0.4" fill="#0A0A0F" />
      </g>
    ),
  },
  snake: {
    label: 'Snake',
    color: '#6DBF7B',
    svg: (
      <g>
        {/* Head - diamond shape */}
        <path d="M20 7 L31 18 L20 30 L9 18 Z" fill="currentColor" opacity="0.85" rx="2" />
        {/* Scale pattern */}
        <path d="M20 10 L26 17 L20 24 L14 17 Z" fill="currentColor" opacity="0.3" />
        {/* Eyes - slitted */}
        <ellipse cx="15" cy="17" rx="2.5" ry="2.5" fill="#0A0A0F" />
        <ellipse cx="25" cy="17" rx="2.5" ry="2.5" fill="#0A0A0F" />
        <ellipse cx="15" cy="17" rx="0.7" ry="2" fill="#E8D040" opacity="0.9" />
        <ellipse cx="25" cy="17" rx="0.7" ry="2" fill="#E8D040" opacity="0.9" />
        {/* Nostrils */}
        <circle cx="18" cy="21" r="0.7" fill="#0A0A0F" opacity="0.6" />
        <circle cx="22" cy="21" r="0.7" fill="#0A0A0F" opacity="0.6" />
        {/* Tongue */}
        <path d="M20 27 L20 32 M20 32 L18 34 M20 32 L22 34" stroke="#E53E3E" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  owl: {
    label: 'Owl',
    color: '#C4956A',
    svg: (
      <g>
        {/* Ear tufts */}
        <polygon points="10,12 12,4 16,14" fill="currentColor" opacity="0.7" />
        <polygon points="30,12 28,4 24,14" fill="currentColor" opacity="0.7" />
        {/* Head */}
        <circle cx="20" cy="19" r="12" fill="currentColor" opacity="0.85" />
        {/* Eye discs */}
        <circle cx="14.5" cy="17" r="5" fill="currentColor" opacity="0.4" />
        <circle cx="25.5" cy="17" r="5" fill="currentColor" opacity="0.4" />
        <circle cx="14.5" cy="17" r="4" fill="#0A0A0F" opacity="0.3" />
        <circle cx="25.5" cy="17" r="4" fill="#0A0A0F" opacity="0.3" />
        {/* Eyes - large, round */}
        <circle cx="14.5" cy="17" r="2.8" fill="#0A0A0F" />
        <circle cx="25.5" cy="17" r="2.8" fill="#0A0A0F" />
        <circle cx="14.5" cy="17" r="1.8" fill="#E8A040" opacity="0.95" />
        <circle cx="25.5" cy="17" r="1.8" fill="#E8A040" opacity="0.95" />
        <circle cx="14.5" cy="17" r="0.8" fill="#0A0A0F" />
        <circle cx="25.5" cy="17" r="0.8" fill="#0A0A0F" />
        <circle cx="15" cy="16.2" r="0.5" fill="white" opacity="0.7" />
        <circle cx="26" cy="16.2" r="0.5" fill="white" opacity="0.7" />
        {/* Beak */}
        <polygon points="20,20 17.5,23 20,27 22.5,23" fill="currentColor" opacity="0.55" />
      </g>
    ),
  },
  cat: {
    label: 'Cat',
    color: '#E07B9B',
    svg: (
      <g>
        {/* Ears - triangular */}
        <polygon points="9,12 14,2 18,14" fill="currentColor" opacity="0.9" />
        <polygon points="31,12 26,2 22,14" fill="currentColor" opacity="0.9" />
        <polygon points="11,12 14,4 17,14" fill="currentColor" opacity="0.35" />
        <polygon points="29,12 26,4 23,14" fill="currentColor" opacity="0.35" />
        {/* Head */}
        <ellipse cx="20" cy="20" rx="12" ry="11" fill="currentColor" opacity="0.85" />
        {/* Eyes - almond */}
        <ellipse cx="14.5" cy="18" rx="2.5" ry="2" fill="#0A0A0F" />
        <ellipse cx="25.5" cy="18" rx="2.5" ry="2" fill="#0A0A0F" />
        <ellipse cx="14.5" cy="18" rx="1" ry="1.8" fill="#50C878" opacity="0.9" />
        <ellipse cx="25.5" cy="18" rx="1" ry="1.8" fill="#50C878" opacity="0.9" />
        <ellipse cx="14.5" cy="18" rx="0.35" ry="1.5" fill="#0A0A0F" />
        <ellipse cx="25.5" cy="18" rx="0.35" ry="1.5" fill="#0A0A0F" />
        {/* Nose */}
        <polygon points="20,22 18.5,23.5 21.5,23.5" fill="#E07B9B" opacity="0.6" />
        {/* Mouth */}
        <path d="M18.5 24 Q20 25.5 21.5 24" fill="none" stroke="#0A0A0F" strokeWidth="0.5" />
        <line x1="20" y1="23.5" x2="20" y2="24.5" stroke="#0A0A0F" strokeWidth="0.5" />
        {/* Whiskers */}
        <line x1="6" y1="22" x2="14" y2="23" stroke="currentColor" strokeWidth="0.4" opacity="0.4" />
        <line x1="6" y1="24" x2="14" y2="24" stroke="currentColor" strokeWidth="0.4" opacity="0.4" />
        <line x1="34" y1="22" x2="26" y2="23" stroke="currentColor" strokeWidth="0.4" opacity="0.4" />
        <line x1="34" y1="24" x2="26" y2="24" stroke="currentColor" strokeWidth="0.4" opacity="0.4" />
      </g>
    ),
  },
} as const

export type AvatarId = keyof typeof AVATARS
export const AVATAR_IDS = Object.keys(AVATARS) as AvatarId[]
export const AVATAR_LIST = AVATAR_IDS.map((id) => ({ id, ...AVATARS[id] }))

export function getAvatarColor(avatar: AvatarId | string): string {
  return AVATARS[avatar as AvatarId]?.color ?? '#D4A853'
}

interface AnimalAvatarProps {
  avatar: AvatarId | string
  size?: number
  className?: string
  dead?: boolean
}

export default function AnimalAvatar({ avatar, size = 40, className = '', dead = false }: AnimalAvatarProps) {
  const data = AVATARS[avatar as AvatarId]
  if (!data) {
    // Fallback: first letter circle
    return (
      <div
        className={`rounded-full flex items-center justify-center font-bold border-2 ${className}`}
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #D4A85330, #D4A85310)',
          borderColor: '#D4A85340',
          color: '#D4A853',
          fontSize: size * 0.4,
        }}
      >
        ?
      </div>
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center border-2 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: dead
          ? 'rgba(28,28,43,0.5)'
          : `linear-gradient(135deg, ${data.color}25, ${data.color}08)`,
        borderColor: dead ? 'rgba(42,42,58,0.5)' : `${data.color}35`,
        color: dead ? '#8B8B9E' : data.color,
      }}
    >
      {dead ? (
        <span style={{ fontSize: size * 0.45 }}>{'\u2620'}</span>
      ) : (
        <svg
          viewBox="0 0 40 40"
          width={size * 0.75}
          height={size * 0.75}
          style={{ display: 'block' }}
        >
          {data.svg}
        </svg>
      )}
    </div>
  )
}
