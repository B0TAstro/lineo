import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LinkSummary } from '@/features/session';
import { Icon } from '@/shared/ui/Icon';
import { StatusDot } from '@/shared/ui/StatusDot';
import { colors, fonts } from '@/shared/ui/theme';

/** What the phone is doing, always visible and always small: recording, and the state of the link */
export function StatusPill({ recording, link }: { recording: boolean; link: LinkSummary }) {
  const [open, setOpen] = useState(true);
  return (
    <Pressable
      onPress={() => setOpen(!open)}
      accessibilityRole="button"
      accessibilityLabel={open ? 'Replier le statut' : 'Déplier le statut'}
      style={styles.pill}
    >
      <View style={styles.group}>
        <View style={[styles.recDot, !recording && styles.recOff]} />
        <Text style={styles.rec}>{recording ? 'REC' : 'PAUSE'}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.group}>
        <Icon name="bluetooth" size={16} />
        {open && <Text style={styles.link}>{link.text}</Text>}
        <StatusDot state={link.state} size={6} />
      </View>
      <Icon name={open ? 'chevronRight' : 'chevronLeft'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 36,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: colors.card,
  },
  group: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  recOff: { backgroundColor: colors.textDim },
  rec: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 0.72, color: colors.text },
  divider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.15)' },
  link: { fontFamily: fonts.light, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
});
