import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { borderWidth, colors, fonts, radius, touch } from './theme';

/** A text field, 64 pt high */
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
    height: touch,
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
