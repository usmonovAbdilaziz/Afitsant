import React, { forwardRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

type InputProps = TextInputProps & {
  hasError?: boolean;
  isPassword?: boolean;
};

const Input = forwardRef<TextInput, InputProps>(function Input(
  { hasError, isPassword, style, ...props },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View
      style={[
        styles.wrapper,
        hasError ? styles.wrapperError : styles.wrapperDefault,
      ]}
    >
      <TextInput
        ref={ref}
        autoCorrect={false}
        cursorColor="#0284c7"
        placeholderTextColor="#9ca3af"
        secureTextEntry={!!isPassword && !showPassword}
        selectionColor="#0284c7"
        spellCheck={false}
        style={[styles.input, style]}
        {...props}
      />
      {isPassword && (
        <Pressable
          hitSlop={8}
          onPress={() => setShowPassword((prev) => !prev)}
          style={styles.toggle}
        >
          <Ionicons
            name={showPassword ? "eye" : "eye-off"}
            size={20}
            color="#9ca3af"
          />
        </Pressable>
      )}
    </View>
  );
});

export default Input;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 12,
    minHeight: 54,
    backgroundColor: "#ffffff",
  },
  wrapperDefault: {
    borderColor: "#d4d4d8",
  },
  wrapperError: {
    borderColor: "#ef4444",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#0f172a",
    paddingVertical: 12,
  },
  toggle: {
    marginLeft: 8,
    padding: 4,
  },
});