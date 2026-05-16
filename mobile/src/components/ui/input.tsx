import React, { forwardRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { cn } from "@/lib/utils";

type InputProps = TextInputProps & {
  hasError?: boolean;
  isPassword?: boolean;
};

const Input = forwardRef<TextInput, InputProps>(function Input(
  { hasError, isPassword, className, ...props },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View
      className={cn(
        "flex-row items-center border rounded-lg px-4 py-3 bg-white",
        hasError ? "border-red-500" : "border-slate-300",
        className
      )}
    >
      <TextInput
        ref={ref}
        autoCorrect={false}
        cursorColor="#0284c7"
        placeholderTextColor="#9ca3af"
        secureTextEntry={!!isPassword && !showPassword}
        selectionColor="#0284c7"
        spellCheck={false}
        className="flex-1 text-base text-slate-900"
        {...props}
      />
      {isPassword && (
        <Pressable
          hitSlop={8}
          onPress={() => setShowPassword((prev) => !prev)}
          className="pl-2"
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

Input.displayName = "Input";