import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, type CameraDevice, type CameraSessionConfig } from 'react-native-vision-camera';

import type { ClipStats, MatchCamera } from '@/features/recording';
import type { LinkSummary } from '@/features/session';
import type { VoiceStatus } from '@/features/voice';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { IconButton } from '@/shared/ui/IconButton';
import { type LinkState, StatusDot } from '@/shared/ui/StatusDot';
import { colors, fonts, radiusCard, space, type } from '@/shared/ui/theme';

const VOICE: Record<VoiceStatus, { word: string; state: LinkState | undefined }> = {
  listening: { word: 'Activée', state: 'ok' },
  starting: { word: 'Chargement', state: 'unstable' },
  error: { word: 'Indisponible', state: 'lost' },
  off: { word: 'Coupée', state: undefined },
};

/**
 * The info panel over the score: the camera image (what the phone films), the links and the
 * recording figures. The camera lives here even when the panel is closed: it then shrinks to one
 * pixel but stays mounted, so closing the panel never stops the recording
 */
export function MatchInfo({
  open,
  onClose,
  camera,
  device,
  cameraActive,
  recording,
  link,
  voiceStatus,
  voiceOn,
  onToggleVoice,
  stats,
  targetFps,
  savedPoints,
  previewOverlay,
  dev,
}: {
  open: boolean;
  onClose: () => void;
  camera: MatchCamera;
  device: CameraDevice;
  cameraActive: boolean;
  recording: boolean;
  link: LinkSummary;
  voiceStatus: VoiceStatus;
  voiceOn: boolean;
  onToggleVoice: () => void;
  stats: ClipStats;
  /** From the settings, read when the match started */
  targetFps: number;
  savedPoints: number;
  /** Drawn over the camera image (dev: the live ball tracking) */
  previewOverlay?: ReactNode;
  /** Dev builds only: the measures, under the configuration */
  dev?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const voice = VOICE[voiceStatus];
  const pointMB = stats.savedCount > 0 ? stats.totalMB / (stats.savedCount + 1) : undefined;

  return (
    <View
      pointerEvents={open ? 'auto' : 'none'}
      style={
        open
          ? [styles.panel, { paddingLeft: insets.left + 36, paddingRight: insets.right + 28 }]
          : styles.closed
      }
    >
      {open ? (
        <View style={styles.links}>
          <IconButton icon="close" label="Fermer" variant="plain" onPress={onClose} />
          <View style={styles.linkList}>
            <Text style={styles.section}>Liaison</Text>
            <LinkRow icon="bluetooth" name="Bluetooth" word={link.word} state={link.state} />
            {/* UI only: the Wi-Fi fallback arrives with v0.6 */}
            <LinkRow icon="wifi" name="Wi-Fi" word="Bientôt" state={undefined} />
            <LinkRow icon="mic" name="Voix" word={voice.word} state={voice.state} />
          </View>
        </View>
      ) : null}

      <View style={open ? styles.image : styles.imageClosed}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={cameraActive}
          outputs={[camera.videoOutput, camera.frameOutput]}
          constraints={[{ fps: targetFps }, { resolutionBias: camera.videoOutput }]}
          // The replay shows the court as it is: a mirrored clip would swap the lines
          mirrorMode="off"
          onStarted={() => camera.setRunning(true)}
          onStopped={() => camera.setRunning(false)}
          onSessionConfigSelected={(config: CameraSessionConfig) =>
            camera.setSelectedFps(config.selectedFPS)
          }
          resizeMode="cover"
        />
        {open ? (
          <>
            {previewOverlay}
            <View style={[styles.badge, styles.badgeRec]}>
              <View style={[styles.recDot, !recording && styles.recOff]} />
              <Text style={styles.badgeText}>
                {recording ? 'REC' : 'PAUSE'} · {camera.fps.toFixed(0)} i/s
              </Text>
            </View>
            {/* UI only: tapping the 4 corners of the court arrives with v0.7 */}
            <Pressable disabled style={[styles.calibrate, styles.disabled]}>
              <Icon name="calibrate" color={colors.onAccent} />
              <Text style={styles.calibrateText}>Calibrer</Text>
            </Pressable>
            <View style={styles.imageTools}>
              <IconButton
                icon="cameraSwitch"
                label={
                  camera.facing === 'back'
                    ? 'Passer à la caméra avant'
                    : 'Passer à la caméra arrière'
                }
                variant="overlay"
                onPress={camera.flip}
              />
              <IconButton
                icon={voiceOn ? 'mic' : 'micOff'}
                label={voiceOn ? 'Couper la voix' : 'Activer la voix'}
                variant="overlay"
                onPress={onToggleVoice}
              />
            </View>
          </>
        ) : null}
      </View>

      {open ? (
        <ScrollView style={styles.config} contentContainerStyle={styles.configContent}>
          <Text style={styles.section}>Configuration</Text>
          <Figure label="Points en mémoire" value={`${stats.savedCount} / ${savedPoints}`} />
          <Figure
            label="Taille d’un point"
            value={pointMB === undefined ? '—' : `≈ ${pointMB.toFixed(0)} Mo`}
          />
          <Figure label="Stockage utilisé" value={`${stats.totalMB.toFixed(0)} Mo`} />
          <Figure label="Cadence" value={`${camera.selectedFps ?? '—'} i/s`} />
          {dev}
        </ScrollView>
      ) : null}
    </View>
  );
}

function LinkRow({
  icon,
  name,
  word,
  state,
}: {
  icon: IconName;
  name: string;
  word: string;
  state: LinkState | undefined;
}) {
  return (
    <View style={styles.linkRow}>
      <Icon name={icon} />
      <View>
        <Text style={styles.linkName}>{name}</Text>
        <View style={styles.linkState}>
          {state ? <StatusDot state={state} size={6} /> : <View style={styles.dotOff} />}
          <Text style={styles.linkWord}>{word}</Text>
        </View>
      </View>
    </View>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={styles.figureValue}>{value}</Text>
    </View>
  );
}

const overlay = 'rgba(10,10,10,0.7)';

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    gap: 24,
    paddingVertical: 16,
    backgroundColor: colors.bg,
  },
  // Closed: one pixel in a corner, so the camera keeps running behind the score
  closed: { position: 'absolute', top: 0, left: 0, width: 1, height: 1, overflow: 'hidden' },
  links: { width: 110 },
  linkList: { gap: 18, paddingLeft: 12, paddingTop: 16 },
  section: { ...type.section, color: colors.textDim },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkName: { fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  linkState: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkWord: { fontFamily: fonts.light, fontSize: 13, color: colors.textDim },
  dotOff: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textDim },
  image: {
    flex: 1,
    borderRadius: radiusCard,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  imageClosed: { width: 1, height: 1 },
  badge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: overlay,
  },
  badgeRec: { top: 16, left: 16 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  recOff: { backgroundColor: colors.textDim },
  badgeText: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: 0.78, color: colors.text },
  calibrate: {
    position: 'absolute',
    top: 14,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  calibrateText: { fontFamily: fonts.medium, fontSize: 13, color: colors.onAccent },
  disabled: { opacity: 0.5 },
  imageTools: { position: 'absolute', right: 16, bottom: 16, flexDirection: 'row', gap: space.s },
  config: { width: 130, flexGrow: 0 },
  configContent: { gap: 14, paddingTop: 10 },
  figure: { gap: 2 },
  figureLabel: { fontFamily: fonts.light, fontSize: 13, color: colors.textDim },
  figureValue: { fontFamily: fonts.light, fontSize: 22, color: colors.text },
});
