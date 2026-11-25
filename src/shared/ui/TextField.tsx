import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { borderWidth, colors, fonts, radius } from './theme';

/** A text field, 56 pt high as in every screen of the mockup */
export function TextField(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textSoft}
      selectionColor={colors.accent}
      {...props}
      style={[styles.field, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    height: 56,
    paddingHorizontal: 20,
    borderRadius: radius,
    borderWidth,
    borderColor: colors.borderField,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 18,
  },
});
