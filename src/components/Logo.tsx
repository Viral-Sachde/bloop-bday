import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { colors } from '../theme';

interface Props {
  size?: number;
  /** The cone outline and the sparkle. */
  color?: string;
  /** The burst: streamer, dashes and dots. */
  accent?: string;
  /**
   * Background colour behind the mark. The streamer gets a halo in this colour where it
   * crosses the rim. Leave it out on busy or gradient backgrounds.
   */
  halo?: string;
}

const STROKE = 6;
const STREAMER = 'M5 1C15 -4 18 -12 28 -8C37 -4.5 38 5 47 3.5C52 2.6 55 -1.5 57 -6';
const SPARK = 'M0 -7C.9 -1.4 1.4 -.9 7 0C1.4 .9 .9 1.4 0 7C-.9 1.4 -1.4 .9 -7 0C-1.4 -.9 -.9 -1.4 0 -7Z';

/**
 * The Bloop mark ("Line, duo"): a monoline party popper, lime cone and butter burst.
 * Drawn around the cone's mouth at (0, 0): the cone is tilted 45° to the lower left and
 * the burst fans out to the upper right. The viewBox is centred on the mark's visual bounds.
 * Defaults suit the forest background; on light screens pass forest tones.
 */
export function Logo({ size = 96, color = colors.lime, accent = colors.butter, halo = colors.forest }: Props) {
  const line = { fill: 'none', strokeWidth: STROKE, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg width={size} height={size} viewBox="-71.7 -69.25 136 136">
      <G rotation={45}>
        <Path d="M-23 0L0 60L23 0" stroke={color} {...line} />
        <Ellipse rx={23} ry={7.5} stroke={color} {...line} />
        <Path d="M-14.57 22A14.57 4.75 0 0 0 14.57 22" stroke={color} {...line} />
        <Path d="M-7.67 40A7.67 2.5 0 0 0 7.67 40" stroke={color} {...line} />
      </G>
      <G rotation={-45}>
        {halo ? <Path d={STREAMER} stroke={halo} {...line} strokeWidth={STROKE + 3.5} /> : null}
        <Path d={STREAMER} stroke={accent} {...line} />
      </G>
      <Path d="M2.61 -29.89L3.49 -39.85" stroke={accent} {...line} />
      <Path d="M29.89 -2.61L39.85 -3.49" stroke={accent} {...line} />
      <Circle cx={22.37} cy={-50.25} r={4} fill={accent} />
      <Circle cx={47.29} cy={-19.1} r={4} fill={accent} />
      <Path d={SPARK} fill={color} transform="translate(-6.82 -55.58) scale(0.8)" />
    </Svg>
  );
}

/** The mark on its forest tile, exactly like the app icon. Use this on light backgrounds. */
export function LogoTile({ size = 96 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        backgroundColor: colors.forest,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Logo size={size * 0.78} />
    </View>
  );
}
