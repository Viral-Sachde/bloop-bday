import React from 'react';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

export type IconName =
  | 'plus' | 'x' | 'chevron-right' | 'chevron-left' | 'search' | 'bell' | 'gift' | 'users'
  | 'sliders' | 'image' | 'share' | 'copy' | 'trash' | 'edit' | 'check' | 'calendar'
  | 'clock' | 'upload' | 'message' | 'star' | 'play' | 'lock' | 'filter' | 'home';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Feather-style 24px stroke icons, drawn inline so there is no icon font to link. */
export function Icon({ name, size = 22, color = '#12261A', strokeWidth = 2 }: Props) {
  const p = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  let body: React.ReactNode;
  switch (name) {
    case 'plus':
      body = <Path d="M12 5v14M5 12h14" {...p} />;
      break;
    case 'x':
      body = <Path d="M18 6 6 18M6 6l12 12" {...p} />;
      break;
    case 'chevron-right':
      body = <Path d="M9 18l6-6-6-6" {...p} />;
      break;
    case 'chevron-left':
      body = <Path d="M15 18l-6-6 6-6" {...p} />;
      break;
    case 'search':
      body = (
        <>
          <Circle cx={11} cy={11} r={8} {...p} />
          <Path d="M21 21l-4.35-4.35" {...p} />
        </>
      );
      break;
    case 'bell':
      body = (
        <>
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...p} />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" {...p} />
        </>
      );
      break;
    case 'gift':
      body = (
        <>
          <Polyline points="20 12 20 22 4 22 4 12" {...p} />
          <Rect x={2} y={7} width={20} height={5} {...p} />
          <Line x1={12} y1={22} x2={12} y2={7} {...p} />
          <Path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" {...p} />
          <Path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" {...p} />
        </>
      );
      break;
    case 'users':
      body = (
        <>
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx={9} cy={7} r={4} {...p} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" {...p} />
        </>
      );
      break;
    case 'sliders':
      body = (
        <Path
          d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
          {...p}
        />
      );
      break;
    case 'image':
      body = (
        <>
          <Rect x={3} y={3} width={18} height={18} rx={2} {...p} />
          <Circle cx={8.5} cy={8.5} r={1.5} {...p} />
          <Polyline points="21 15 16 10 5 21" {...p} />
        </>
      );
      break;
    case 'share':
      body = (
        <>
          <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" {...p} />
          <Polyline points="16 6 12 2 8 6" {...p} />
          <Line x1={12} y1={2} x2={12} y2={15} {...p} />
        </>
      );
      break;
    case 'copy':
      body = (
        <>
          <Rect x={9} y={9} width={13} height={13} rx={2} {...p} />
          <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" {...p} />
        </>
      );
      break;
    case 'trash':
      body = (
        <>
          <Polyline points="3 6 5 6 21 6" {...p} />
          <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" {...p} />
          <Path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" {...p} />
        </>
      );
      break;
    case 'edit':
      body = (
        <>
          <Path d="M12 20h9" {...p} />
          <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" {...p} />
        </>
      );
      break;
    case 'check':
      body = <Polyline points="20 6 9 17 4 12" {...p} />;
      break;
    case 'calendar':
      body = (
        <>
          <Rect x={3} y={4} width={18} height={18} rx={2} {...p} />
          <Path d="M16 2v4M8 2v4M3 10h18" {...p} />
        </>
      );
      break;
    case 'clock':
      body = (
        <>
          <Circle cx={12} cy={12} r={10} {...p} />
          <Polyline points="12 6 12 12 16 14" {...p} />
        </>
      );
      break;
    case 'upload':
      body = (
        <>
          <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...p} />
          <Polyline points="17 8 12 3 7 8" {...p} />
          <Line x1={12} y1={3} x2={12} y2={15} {...p} />
        </>
      );
      break;
    case 'message':
      body = (
        <Path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
          {...p}
        />
      );
      break;
    case 'star':
      body = (
        <Polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          {...p}
        />
      );
      break;
    case 'play':
      body = <Polygon points="6 3 20 12 6 21 6 3" {...p} />;
      break;
    case 'lock':
      body = (
        <>
          <Rect x={3} y={11} width={18} height={11} rx={2} {...p} />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" {...p} />
        </>
      );
      break;
    case 'filter':
      body = <Polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" {...p} />;
      break;
    case 'home':
      body = (
        <>
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...p} />
          <Polyline points="9 22 9 12 15 12 15 22" {...p} />
        </>
      );
      break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
