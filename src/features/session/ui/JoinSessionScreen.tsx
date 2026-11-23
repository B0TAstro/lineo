import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  isScannedCode,
  type ScannedObject,
  type ScannedObjectType,
  useCameraPermission,
  useObjectOutput,
} from 'react-native-vision-camera';

import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { IconButton } from '@/shared/ui/IconButton';
import { ScreenTitle } from '@/shared/ui/ScreenTitle';
import { TextField } from '@/shared/ui/TextField';
import { colors, fonts, radiusCard, space, type } from '@/shared/ui/theme';

import ScanCorner from '../../../../assets/images/scan-corner.svg';
import { type Join, parseJoinLink, toJoin } from '../logic/joinLink';

const QR_TYPES: ScannedObjectType[] = ['qr'];

function openMatch({ sessionId, key }: Join) {
  // replace: the scanner unmounts and frees the camera for the match screen.
  router.replace({ pathname: '/match', params: { role: 'guest', s: sessionId, k: key } });
}

/** Scans the host's QR code (design.md §5.3). Also reached through the lineo://join link. */
export function JoinSessionScreen() {
  const params = useLocalSearchParams<{ s?: string; k?: string; v?: string }>();
  const linked = toJoin(params);
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const [invalid, setInvalid] = useState(false);
  const [phrase, setPhrase] = useState('');
  const done = useRef(false);

  // Opened from the iPhone Camera app: the link already carries the session.
  const linkedId = linked?.sessionId;
  const linkedKey = linked?.key;
  useEffect(() => {
    if (linkedId && linkedKey && !done.current) {
      done.current = true;
      openMatch({ sessionId: linkedId, key: linkedKey });
    }
  }, [linkedId, linkedKey]);

  useEffect(() => {
    if (!hasPermission && canRequestPermission) requestPermission();
  }, [hasPermission, canRequestPermission, requestPermission]);

  const objectOutput = useObjectOutput({
    types: QR_TYPES,
    onObjectsScanned: (objects: ScannedObject[]) => {
      if (done.current) return;
      for (const object of objects) {
        const join = isScannedCode(object) && object.value ? parseJoinLink(object.value) : null;
        if (join) {
          done.current = true;
          openMatch(join);
          return;
        }
      }
      setInvalid(true);
    },
  });

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="close" label="Fermer" plain onPress={() => router.back()} />
      </View>
      <View style={styles.content}>
        <ScreenTitle section="Session" title="Rejoindre" />

        <View style={styles.scanner}>
          {hasPermission ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device="back"
              isActive
              outputs={[objectOutput]}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder}>
              <Icon name="qr" size={36} color={colors.textSoft} />
              <Text style={styles.aim}>Visez le QR code du téléphone hôte</Text>
            </View>
          )}
          {CORNERS.map((corner) => (
            <View key={corner.rotate} style={[styles.corner, corner.place]}>
              <ScanCorner style={{ transform: [{ rotate: corner.rotate }] }} />
            </View>
          ))}
        </View>

        {invalid && <Text style={styles.invalid}>Ce n’est pas un code de session Lineo.</Text>}

        {/* UI only: joining by phrase needs a way to share the session key without the QR code */}
        <View style={styles.field}>
          <Text style={styles.label}>Ou saisissez la phrase de session</Text>
          <TextField
            value={phrase}
            onChangeText={setPhrase}
            placeholder="balle-filet-orange"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            La phrase s’affiche sous le QR code, sur le téléphone hôte.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button label="Rejoindre" disabled onPress={() => {}} />
      </View>
    </SafeAreaView>
  );
}

/** The same lemon corner, turned for each corner of the viewfinder (Figma) */
const CORNERS = [
  { rotate: '0deg', place: { top: 39, left: 47 } },
  { rotate: '90deg', place: { top: 39, right: 47 } },
  { rotate: '180deg', place: { bottom: 39, right: 47 } },
  { rotate: '270deg', place: { bottom: 39, left: 47 } },
] as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', paddingHorizontal: 12 },
  content: { flex: 1, paddingHorizontal: space.l, paddingTop: space.l, gap: space.l },
  scanner: {
    height: 320,
    borderRadius: radiusCard,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  aim: { fontFamily: fonts.light, fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  corner: { position: 'absolute' },
  invalid: { fontFamily: fonts.light, fontSize: 15, color: colors.text },
  field: { gap: 12 },
  label: { ...type.section, color: colors.textDim },
  hint: { fontFamily: fonts.light, fontSize: 14, lineHeight: 21, color: colors.textSoft },
  footer: { paddingHorizontal: space.l, paddingBottom: space.l },
});
