import { SVGProps } from 'react'

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'd'> {
  size?: number
  stroke?: string
  sw?: number
}

function Icon({ d, size = 20, stroke = 'currentColor', fill = 'none', sw = 1.6, vb = 24, ...rest }: IconProps & { d: string | string[]; vb?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      fill={fill} stroke={stroke}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      {...rest}
    >
      {Array.isArray(d)
        ? d.map((dd, i) => <path key={i} d={dd} />)
        : <path d={d} />}
    </svg>
  )
}

export const IconHome     = (p: IconProps) => <Icon {...p} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
export const IconStore    = (p: IconProps) => <Icon {...p} d={["M3 9l1.5-5h15L21 9","M3 9v11h18V9","M3 9h18","M9 14h6v6H9z"]} />
export const IconUsers    = (p: IconProps) => <Icon {...p} d={["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M22 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75","M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"]} />
export const IconCash     = (p: IconProps) => <Icon {...p} d={["M2 6h20v12H2z","M2 10h20","M6 14h2","M10 14h4"]} />
export const IconChart    = (p: IconProps) => <Icon {...p} d={["M3 21h18","M6 17v-6","M11 17V8","M16 17v-4","M21 17V5"]} />
export const IconWrench   = (p: IconProps) => <Icon {...p} d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-7 7 2 2 7-7a4 4 0 0 0 5.4-5.4l-2.7 2.7-1.7-1.7z" />
export const IconMap      = (p: IconProps) => <Icon {...p} d={["M2 6l7-3 6 3 7-3v15l-7 3-6-3-7 3z","M9 3v15","M15 6v15"]} />
export const IconSearch   = (p: IconProps) => <Icon {...p} d={["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z","M21 21l-4.3-4.3"]} />
export const IconBell     = (p: IconProps) => <Icon {...p} d={["M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9","M13.7 21a2 2 0 0 1-3.4 0"]} />
export const IconPlus     = (p: IconProps) => <Icon {...p} d={["M12 5v14","M5 12h14"]} />
export const IconArrow    = (p: IconProps) => <Icon {...p} d={["M5 12h14","M13 5l7 7-7 7"]} />
export const IconCheck    = (p: IconProps) => <Icon {...p} d="M5 12l4.5 4.5L20 6" />
export const IconUpload   = (p: IconProps) => <Icon {...p} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M17 8l-5-5-5 5","M12 3v12"]} />
export const IconCalendar = (p: IconProps) => <Icon {...p} d={["M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z","M3 10h18","M8 2v4","M16 2v4"]} />
export const IconSettings = (p: IconProps) => <Icon {...p} d={["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z","M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"]} />
export const IconDots     = (p: IconProps) => <Icon {...p} d={["M5 12h.01","M12 12h.01","M19 12h.01"]} sw={2.4} />
export const IconPrinter  = (p: IconProps) => <Icon {...p} d={["M6 9V2h12v7","M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2","M6 14h12v8H6z"]} />
export const IconMail     = (p: IconProps) => <Icon {...p} d={["M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z","M3 7l9 6 9-6"]} />
export const IconChevron  = (p: IconProps) => <Icon {...p} d="M9 6l6 6-6 6" />
export const IconLogout   = (p: IconProps) => <Icon {...p} d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","M16 17l5-5-5-5","M21 12H9"]} />
export const IconLock     = (p: IconProps) => <Icon {...p} d={["M5 11h14v10H5z","M8 11V7a4 4 0 0 1 8 0v4"]} />
export const IconFile     = (p: IconProps) => <Icon {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6"]} />
export const IconClose    = (p: IconProps) => <Icon {...p} d={["M6 6l12 12","M18 6L6 18"]} />
export const IconClock    = (p: IconProps) => <Icon {...p} d={["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z","M12 7v5l3 2"]} />
export const IconPhone    = (p: IconProps) => <Icon {...p} d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11 18.5 19.5 19.5 0 0 1 5.5 13 19.79 19.79 0 0 1 2.18 4.18 2 2 0 0 1 4.18 2H7.2a2 2 0 0 1 2 1.72c.13 1 .37 1.99.72 2.94a2 2 0 0 1-.45 2.11L8.09 10.1a16 16 0 0 0 6 6l1.34-1.34a2 2 0 0 1 2.11-.45c.95.35 1.94.59 2.94.72A2 2 0 0 1 22 16.92z" />
export const IconEye      = (p: IconProps) => <Icon {...p} d={["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"]} />
export const IconEyeOff   = (p: IconProps) => <Icon {...p} d={["M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24","M1 1l22 22"]} />
export const IconCopy     = (p: IconProps) => <Icon {...p} d={["M8 8H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2","M8 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"]} />
export const IconAlert    = (p: IconProps) => <Icon {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />
export const IconRefresh  = (p: IconProps) => <Icon {...p} d={["M23 4v6h-6","M1 20v-6h6","M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"]} />
export const IconDownload = (p: IconProps) => <Icon {...p} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} />
export const IconUserPlus = (p: IconProps) => <Icon {...p} d={["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z","M19 8v6","M22 11h-6"]} />
