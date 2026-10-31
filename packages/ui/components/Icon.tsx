import type { ColorValue } from "react-native";
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from "react-native-svg";
import { colors } from "../tokens";

/* Feather-style line icons — the same shapes the web draws inline */
const ICONS = {
  home: <><Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><Polyline points="9 22 9 12 15 12 15 22" /></>,
  user: <><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><Circle cx="12" cy="7" r="4" /></>,
  eye: <><Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><Circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><Line x1="1" y1="1" x2="23" y2="23" /></>,
  back: <Polyline points="15 18 9 12 15 6" />,
  chevronRight: <Polyline points="9 18 15 12 9 6" />,
  clock: <><Circle cx="12" cy="12" r="10" /><Polyline points="12 6 12 12 16 14" /></>,
  alert: <><Circle cx="12" cy="12" r="10" /><Line x1="12" y1="8" x2="12" y2="12" /><Line x1="12" y1="16" x2="12.01" y2="16" /></>,
  check: <Polyline points="20 6 9 17 4 12" />,
  logOut: <><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><Polyline points="16 17 21 12 16 7" /><Line x1="21" y1="12" x2="9" y2="12" /></>,
  trash: <><Polyline points="3 6 5 6 21 6" /><Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><Path d="M10 11v6M14 11v6" /><Path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
  wallet: <><Rect x="2" y="5" width="20" height="14" rx="2" /><Path d="M16 12h2" /><Path d="M2 9h20" /></>,
  list: <><Line x1="8" y1="6" x2="21" y2="6" /><Line x1="8" y1="12" x2="21" y2="12" /><Line x1="8" y1="18" x2="21" y2="18" /><Line x1="3" y1="6" x2="3.01" y2="6" /><Line x1="3" y1="12" x2="3.01" y2="12" /><Line x1="3" y1="18" x2="3.01" y2="18" /></>,
  mail: <><Path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><Polyline points="22,6 12,13 2,6" /></>,
  bell: <><Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><Path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
  message: <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  send: <><Line x1="22" y1="2" x2="11" y2="13" /><Polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
  navigation: <Polygon points="3 11 22 2 13 21 11 13 3 11" />,
  phone: <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />,
  star: <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color = colors.navy, strokeWidth = 2, fill = "none" }: {
  name: IconName; size?: number; color?: ColorValue; strokeWidth?: number; fill?: ColorValue;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </Svg>
  );
}
