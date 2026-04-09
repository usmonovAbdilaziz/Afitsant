import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type Size = "default" | "sm" | "lg" | "icon";

type ButtonProps = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
};

const variantClassMap: Record<Variant, string> = {
  default: "bg-blue-600",
  destructive: "bg-red-600",
  outline: "bg-white border border-slate-300",
  secondary: "bg-slate-200",
  ghost: "bg-transparent",
  link: "bg-transparent",
};

const textColorMap: Record<Variant, string> = {
  default: "#ffffff",
  destructive: "#ffffff",
  outline: "#000000",
  secondary: "#000000",
  ghost: "#000000",
  link: "#2563eb",
};

const sizeClassMap: Record<Size, string> = {
  default: "h-9 px-4",
  sm: "h-8 px-3",
  lg: "h-10 px-6",
  icon: "w-9 h-9",
};

export function Button({
  children,
  onPress,
  variant = "default",
  size = "default",
  disabled,
  loading,
}: ButtonProps) {
  const textColor = textColorMap[variant];

  const baseClasses =
    "flex-row items-center justify-center rounded-md " + sizeClassMap[size] + " " + variantClassMap[variant];

  const stateClasses = disabled || loading ? " opacity-50" : "";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={baseClasses + stateClasses}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={{ color: textColor, fontWeight: "600" }}>{children}</Text>
      )}
    </Pressable>
  );
}
