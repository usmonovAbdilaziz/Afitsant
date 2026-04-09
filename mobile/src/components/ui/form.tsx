import React, { forwardRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
} from "react-native";

type InputProps = Omit<TextInputProps, "showSoftInputOnFocus"> & {
  hasError?: boolean;
  isPassword?: boolean;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    autoCorrect = false,
    hasError,
    isPassword,
    spellCheck = false,
    style,
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View
      className={`flex-row items-center border rounded-xl pl-4 pr-3 min-h-[54px] bg-white ${
        hasError ? "border-red-500" : "border-neutral-300"
      }`}
    >
      <TextInput
        ref={ref}
        autoCorrect={autoCorrect}
        cursorColor="#0284c7"
        placeholderTextColor="#9ca3af"
        secureTextEntry={!!isPassword && !showPassword}
        selectionColor="#0284c7"
        spellCheck={spellCheck}
        className="flex-1 text-base text-black py-3"
        style={style}
        {...props}
      />
      {isPassword && (
        <Pressable
          hitSlop={8}
          onPress={() => setShowPassword((currentValue) => !currentValue)}
          className="ml-2 p-1"
        >
          <Ionicons
            name={showPassword ? "eye" : "eye-off"}
            size={20}
            color="gray"
          />
        </Pressable>
      )}
    </View>
  );
});

export function Label({ className = "", ...props }: TextProps) {
  return (
    <Text className={`mb-1 text-sm font-medium text-zinc-800 ${className}`} {...props} />
  );
}
type FormErrorProps = {
  message?: string
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return <Text className="mt-1 text-sm text-red-500">{message}</Text>;
}
type FormFieldProps ={
    label?:string
    error?:string
    children:React.ReactNode
}
export function FormField({label,error,children}:FormFieldProps){
     return (
    <View className="mb-4">
      {label ? <Label>{label}</Label> : null}
      {children}
      <FormError message={error} />
    </View>
  )
}
type TextAreaProps = Omit<TextInputProps, "showSoftInputOnFocus"> & {
  hasError?: boolean;
};


export const TextArea = forwardRef<TextInput, TextAreaProps>(function TextArea(
  {
    autoCorrect = true,
    hasError,
    spellCheck = true,
    style,
    ...props
  },
  ref
) {
  return (
    <View
      className={`border rounded-xl px-4 py-3 bg-white ${
        hasError ? "border-red-500" : "border-zinc-300"
      }`}
    >
      <TextInput
        ref={ref}
        autoCorrect={autoCorrect}
        cursorColor="#0284c7"
        multiline
        placeholderTextColor="#9ca3af"
        selectionColor="#0284c7"
        spellCheck={spellCheck}
        className="min-h-[100px] text-base text-black"
        style={style}
        textAlignVertical="top"
        {...props}
      />
    </View>
  );
});
