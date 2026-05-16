import React, { forwardRef } from "react";
import {
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
} from "react-native";
import { cn } from "@/lib/utils";

// ─── Label ───────────────────────────────────────────

type LabelProps = TextProps;

export function Label({ className, ...props }: LabelProps) {
  return (
    <Text
      className={cn("mb-1 text-sm font-medium text-slate-900", className)}
      {...props}
    />
  );
}

// ─── FormError ───────────────────────────────────────

type FormErrorProps = {
  message?: string;
  className?: string;
};

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;

  return (
    <Text className={cn("mt-1 text-sm text-red-500", className)}>
      {message}
    </Text>
  );
}

// ─── FormField ───────────────────────────────────────

type FormFieldProps = {
  label?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export function FormField({ label, error, children, className }: FormFieldProps) {
  return (
    <View className={cn("mb-4", className)}>
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
  { hasError, className, ...props },
  ref
) {
  return (
    <View
      className={cn(
        "border rounded-lg bg-white overflow-hidden",
        hasError ? "border-red-500" : "border-slate-300",
      )}
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
        className={cn(
          "flex-1 px-4 py-3 text-base text-slate-900",
          className
        )}
        {...props}
      />
    </View>
  );
});

TextArea.displayName = "TextArea";
