import * as React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

// Heart-2-Heart Organization Custom Icons
export const HeartIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <path 
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
      fill="currentColor"
      className="opacity-90"
    />
    <circle cx="8" cy="10" r="1.5" fill="rgba(255,255,255,0.8)" />
    <circle cx="16" cy="10" r="1.5" fill="rgba(255,255,255,0.8)" />
  </svg>
);

export const EducationIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <path 
      d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" 
      fill="currentColor"
      className="opacity-90"
    />
    <path 
      d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" 
      fill="currentColor"
      className="opacity-70"
    />
    <circle cx="12" cy="12" r="2" fill="rgba(255,255,255,0.9)" />
  </svg>
);

export const FeedingIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <path 
      d="M8 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3z" 
      fill="currentColor"
      className="opacity-90"
    />
    <path 
      d="M3 14a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" 
      fill="currentColor"
      className="opacity-80"
    />
    <path 
      d="M10 10v2h4v-2M8 16h8M9 18h6" 
      stroke="rgba(255,255,255,0.9)" 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />
  </svg>
);

export const KipawaIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <path 
      d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" 
      fill="currentColor"
      className="opacity-90"
    />
    <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.8)" />
    <path 
      d="M12 9v6M9 12h6" 
      stroke="rgba(255,255,255,0.9)" 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />
  </svg>
);

export const EmpowermentIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <path 
      d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" 
      fill="currentColor"
      className="opacity-90"
    />
    <path 
      d="M19 10v2a7 7 0 0 1-14 0v-2" 
      stroke="currentColor" 
      strokeWidth="2" 
      fill="none"
      className="opacity-80"
    />
    <path 
      d="M12 19v3M8 22h8" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
      className="opacity-70"
    />
    <circle cx="12" cy="7" r="1" fill="rgba(255,255,255,0.9)" />
  </svg>
);

export const DashboardIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <path 
      d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" 
      stroke="currentColor" 
      strokeWidth="2" 
      fill="none"
      className="opacity-80"
    />
    <circle cx="7" cy="7" r="2" fill="currentColor" className="opacity-90" />
    <circle cx="17" cy="7" r="2" fill="currentColor" className="opacity-90" />
    <circle cx="7" cy="17" r="2" fill="currentColor" className="opacity-90" />
    <circle cx="17" cy="17" r="2" fill="currentColor" className="opacity-90" />
  </svg>
);

export const ReportsIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <path 
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" 
      fill="currentColor"
      className="opacity-80"
    />
    <path 
      d="M14 2v6h6" 
      stroke="rgba(255,255,255,0.9)" 
      strokeWidth="2" 
      fill="none"
    />
    <path 
      d="M8 12h8M8 16h8M8 8h2" 
      stroke="rgba(255,255,255,0.9)" 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />
  </svg>
);

export const AnalyticsIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <path 
      d="M3 3v18h18" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="opacity-70"
    />
    <path 
      d="M18 9l-5 5-4-4-6 6" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
      className="opacity-90"
    />
    <circle cx="18" cy="9" r="2" fill="currentColor" className="opacity-90" />
    <circle cx="13" cy="14" r="2" fill="currentColor" className="opacity-90" />
    <circle cx="9" cy="10" r="2" fill="currentColor" className="opacity-90" />
    <circle cx="3" cy="16" r="2" fill="currentColor" className="opacity-90" />
  </svg>
);