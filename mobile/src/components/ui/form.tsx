import React, { forwardRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
} from "react-native";

// ─── Label ───────────────────────────────────────────

type LabelProps = TextProps;

export function Label({ style, ...props }: LabelProps) {
  return <Text style={[styles.label, style]} {...props} />;
}

// ─── FormError ───────────────────────────────────────

type FormErrorProps = {
  message?: string;
};

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return <Text style={styles.error}>{message}</Text>;
}

// ─── FormField ───────────────────────────────────────

type FormFieldProps = {
  label?: string;
  error?: string;
  children: React.ReactNode;
};

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <View style={styles.field}>
      {label ? <Label>{label}</Label> : null}
      {children}
      <FormError message={error} />
    </View>
  );
}

// ─── TextArea ────────────────────────────────────────

type TextAreaProps = TextInputProps & {
  hasError?: boolean;
};

export const TextArea = forwardRef<TextInput, TextAreaProps>(function TextArea(
  { hasError, style, ...props },
  ref
) {
  return (
    <View
      style={[
        styles.textAreaWrapper,
        hasError ? styles.wrapperError : styles.wrapperDefault,
      ]}
    >
      <TextInput
        ref={ref}
        autoCorrect
        cursorColor="#0284c7"
        multiline
        placeholderTextColor="#9ca3af"
        selectionColor="#0284c7"
        spellCheck
        textAlignVertical="top"
        style={[styles.textArea, style]}
        {...props}
      />
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  label: {
    marginBottom: 4,
    fontSize: 14,
    fontWeight: "500",
    color: "#27272a",
  },
  error: {
    marginTop: 4,
    fontSize: 14,
    color: "#ef4444",
  },
  field: {
    marginBottom: 16,
  },
  textAreaWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  wrapperDefault: {
    borderColor: "#d4d4d8",
  },
  wrapperError: {
    borderColor: "#ef4444",
  },
  textArea: {
    minHeight: 100,
    fontSize: 16,
    color: "#0f172a",
  },
});
