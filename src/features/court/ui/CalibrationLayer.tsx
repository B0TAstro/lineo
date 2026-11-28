import { type ReactNode, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polygon, Polyline } from 'react-native-svg';

import { Icon, type IconName } from '@/shared/ui/Icon';
import { IconButton } from '@/shared/ui/IconButton';
import { colors, fonts, type } from '@/shared/ui/theme';

import { CourtLinesOverlay, PICTURE_16_9 } from './CourtLinesOverlay';
import { type Calibration, courtGeometry, type CourtGeometry } from '../logic/courtGeometry';
import { fit } from '../logic/fit';
import type { Point } from '../logic/homography';
import { orderCorners } from '../logic/orderCorners';

/** A finger this close to a point (in pt) takes it, instead of placing a new one */
const GRAB = 44;
/** Holding a point this long brings up the loupe (moving it does too) */
const HOLD_MS = 200;
const LOUPE = 120;
const ZOOM = 3;
/** The loupe sits beside the point, up and to the left: the finger hides what is under it */
const LOUPE_GAP = 16;
const POINT = 26;

/**
 * Placing the court, full screen over the live camera image (design: Match · Calibrer). The image
 * shows whole (`contain`), as the recorded clip, so a point here is a point of the clip.
 * - Touch a corner to place a point (4, any order); touch a point and slide to move it. Holding
 *   it brings up a loupe beside it, with the live image magnified, to put it on the line.
 * - From the 4th point, the court's lines show where they would be.
 * - ✕ leaves without changing anything; « Annuler » takes the last point back; « Pivoter » turns
 *   the court a quarter (its symmetry cannot be told from the image); « Valider » keeps it. These
 *   two only show once the 4 points are down: a corner may lie right under them.
 *
 * `live`: the live image for the loupe (the camera draws into it while `onMagnify(true)`).
 */
export function CalibrationLayer({
  initial,
  live,
  onMagnify,
  onValidate,
  onCancel,
}: {
  initial: Calibration | undefined;
  live: ReactNode;
  onMagnify: (on: boolean) => void;
  onValidate: (calibration: Calibration) => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState({ width: 0, height: 0 });
  const [points, setPoints] = useState<Point[]>(initial ? [...initial.corners] : []);
  const [turns, setTurns] = useState(initial?.turns ?? 0);
  const [active, setActive] = useState<number>();
  const [loupe, setLoupe] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout>>(undefined);
  const picture = fit(view, PICTURE_16_9, 'contain');
  const { toView, toPicture } = picture;

  const calibration: Calibration | undefined =
    points.length === 4
      ? { corners: orderCorners(points), reference: 'doubles', turns }
      : undefined;
  const geometry = calibration && courtGeometry(calibration);

  const showLoupe = (on: boolean) => {
    setLoupe(on);
    onMagnify(on);
  };

  const touch = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    onBegin: (e) => {
      const at = { x: e.x, y: e.y };
      let index = nearest(points.map(toView), at);
      if (index === undefined && points.length < 4) {
        index = points.length;
        setPoints([...points, clamp(toPicture(at))]);
      }
      if (index === undefined) return;
      setActive(index);
      clearTimeout(hold.current);
      hold.current = setTimeout(() => showLoupe(true), HOLD_MS);
    },
    onUpdate: (e) => {
      if (active === undefined) return;
      const moved = clamp(toPicture({ x: e.x, y: e.y }));
      setPoints((current) => current.map((p, i) => (i === active ? moved : p)));
      if (!loupe) showLoupe(true);
    },
    onFinalize: () => {
      clearTimeout(hold.current);
      setActive(undefined);
      showLoupe(false);
    },
  });

  const shown = points.map(toView);
  const activePoint = active !== undefined ? shown[active] : undefined;

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={touch}>
        <View style={StyleSheet.absoluteFill} onLayout={(e) => setView(e.nativeEvent.layout)}>
          <Drawing points={shown} calibration={calibration} geometry={geometry} toView={toView} />
          {shown.map((p, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={[
                styles.point,
                i === active && styles.pointActive,
                { left: p.x - POINT / 2, top: p.y - POINT / 2 },
              ]}
            >
              <View style={styles.pointDot} />
            </View>
          ))}
        </View>
      </GestureDetector>

      {loupe && activePoint && (
        <Loupe
          point={activePoint}
          view={view}
          picture={picture}
          live={live}
          points={points}
          geometry={geometry}
        />
      )}

      <View
        pointerEvents="box-none"
        style={[styles.top, { paddingTop: insets.top + 12, paddingLeft: insets.left + 16 }]}
      >
        <IconButton icon="close" label="Fermer le calibrage" variant="overlay" onPress={onCancel} />
      </View>
      <View pointerEvents="none" style={[styles.instructionRow, { top: insets.top + 18 }]}>
        <View style={styles.instruction}>
          <Text style={styles.instructionTitle}>Calibrage manuel</Text>
          <View style={styles.divider} />
          <Text style={styles.instructionText}>
            {points.length < 4
              ? 'Touchez les 4 coins du court'
              : 'Glissez chaque coin sur l’angle des lignes'}
          </Text>
          <Text style={styles.count}>{points.length} / 4</Text>
        </View>
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.bottom,
          {
            paddingBottom: insets.bottom + 16,
            paddingLeft: insets.left + 16,
            paddingRight: insets.right + 16,
          },
        ]}
      >
        {points.length > 0 ? (
          <Pill icon="rewind" label="Annuler" onPress={() => setPoints(points.slice(0, -1))} />
        ) : (
          <View />
        )}
        {/* Only once the 4 points are down: before, a corner may lie right under these buttons */}
        {calibration && (
          <View style={styles.actions}>
            <Pill label="Pivoter" onPress={() => setTurns((turns + 1) % 4)} />
            <Pill
              icon="check"
              label="Valider"
              primary
              disabled={!geometry}
              onPress={() => onValidate(calibration)}
            />
          </View>
        )}
      </View>
    </View>
  );
}

/** The points joined in the order they were placed; from 4, the court's area and its lines */
function Drawing({
  points,
  calibration,
  geometry,
  toView,
}: {
  points: Point[];
  calibration: Calibration | undefined;
  geometry: CourtGeometry | undefined;
  toView: (p: Point) => Point;
}) {
  return (
    <>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {calibration ? (
          <Polygon
            points={path(calibration.corners.map(toView))}
            fill={colors.accent}
            fillOpacity={0.12}
          />
        ) : (
          <Polyline points={path(points)} fill="none" stroke={colors.accent} strokeWidth={2} />
        )}
      </Svg>
      {geometry && <CourtLinesOverlay geometry={geometry} mode="contain" />}
    </>
  );
}

/**
 * The live image around the point being placed, magnified, beside it: a cross on the point, and
 * the lines as they stand, to put the corner exactly on the angle of the court's lines
 */
function Loupe({
  point,
  view,
  picture,
  live,
  points,
  geometry,
}: {
  point: Point;
  view: { width: number; height: number };
  picture: ReturnType<typeof fit>;
  live: ReactNode;
  points: Point[];
  geometry: CourtGeometry | undefined;
}) {
  const origin = picture.toView({ x: 0, y: 0 });
  const corner = picture.toView({ x: 1, y: 1 });
  const width = (corner.x - origin.x) * ZOOM;
  const height = (corner.y - origin.y) * ZOOM;
  // The magnified picture, placed so the point falls in the loupe's centre
  const left = LOUPE / 2 - (point.x - origin.x) * ZOOM;
  const top = LOUPE / 2 - (point.y - origin.y) * ZOOM;
  const zoomed = (p: Point) => ({ x: p.x * width, y: p.y * height });

  // Up and to the left of the point, unless the screen's edge is there
  const beside = (position: number, size: number) =>
    Math.min(
      position - LOUPE - LOUPE_GAP >= 0 ? position - LOUPE - LOUPE_GAP : position + LOUPE_GAP,
      size - LOUPE,
    );

  return (
    <View
      pointerEvents="none"
      style={[
        styles.loupe,
        { left: beside(point.x, view.width), top: beside(point.y, view.height) },
      ]}
    >
      <View style={{ position: 'absolute', left, top, width, height }}>
        {live}
        <Svg style={StyleSheet.absoluteFill}>
          {geometry ? (
            geometry.lines.map((line, i) => {
              const from = zoomed(line.from);
              const to = zoomed(line.to);
              return (
                <Line
                  key={i}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={colors.accent}
                  strokeWidth={2}
                />
              );
            })
          ) : (
            <Polyline
              points={path(points.map(zoomed))}
              fill="none"
              stroke={colors.accent}
              strokeWidth={2}
            />
          )}
        </Svg>
      </View>
      <View style={styles.crossH} />
      <View style={styles.crossV} />
    </View>
  );
}

/** A small button over the image (design: dark pill, lemon for « Valider ») */
function Pill({
  icon,
  label,
  primary,
  disabled,
  onPress,
}: {
  icon?: IconName;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled ?? false }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.pill,
        primary && styles.pillPrimary,
        disabled && styles.pillDisabled,
        pressed && styles.pressed,
      ]}
    >
      {icon && <Icon name={icon} size={18} color={primary ? colors.onAccent : colors.text} />}
      <Text style={[styles.pillText, primary && styles.pillTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const path = (list: Point[]) => list.map(({ x, y }) => `${x},${y}`).join(' ');

/** The point the finger is on, if one is within reach */
function nearest(points: Point[], at: Point): number | undefined {
  let best: number | undefined;
  let bestDistance = GRAB;
  points.forEach((p, i) => {
    const d = Math.hypot(p.x - at.x, p.y - at.y);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

const clamp = ({ x, y }: Point): Point => ({
  x: Math.min(Math.max(x, 0), 1),
  y: Math.min(Math.max(y, 0), 1),
});

const overlay = 'rgba(10,10,10,0.72)';

const styles = StyleSheet.create({
  point: {
    position: 'absolute',
    width: POINT,
    height: POINT,
    borderRadius: POINT / 2,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: 'rgba(212,245,60,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointActive: { backgroundColor: colors.accent },
  pointDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text },
  top: { position: 'absolute', top: 0, left: 0 },
  instructionRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: overlay,
  },
  instructionTitle: { ...type.section, fontSize: 11, color: colors.accent },
  divider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.25)' },
  instructionText: { fontFamily: fonts.regular, fontSize: 13, color: colors.text },
  count: { fontFamily: fonts.medium, fontSize: 13, color: colors.accent },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: { flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: overlay,
  },
  pillPrimary: { backgroundColor: colors.accent },
  pillDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.6 },
  pillText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  pillTextPrimary: { color: colors.onAccent },
  loupe: {
    position: 'absolute',
    width: LOUPE,
    height: LOUPE,
    borderRadius: LOUPE / 2,
    borderWidth: 2,
    borderColor: colors.text,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  crossH: {
    position: 'absolute',
    left: LOUPE / 2 - 8,
    top: LOUPE / 2 - 1,
    width: 16,
    height: 2,
    backgroundColor: colors.text,
  },
  crossV: {
    position: 'absolute',
    left: LOUPE / 2 - 1,
    top: LOUPE / 2 - 8,
    width: 2,
    height: 16,
    backgroundColor: colors.text,
  },
});
