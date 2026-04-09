import { Ionicons } from "@expo/vector-icons";
import React, {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SelectRootProps = PropsWithChildren<{
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}>;

type SelectTriggerProps = Omit<PressableProps, "style"> & {
  children: ReactNode;
  hasError?: boolean;
  style?: StyleProp<ViewStyle>;
};

type SelectValueProps = {
  placeholder?: string;
  style?: StyleProp<TextStyle>;
};

type SelectContentProps = {
  children: ReactNode;
  title?: string;
  style?: StyleProp<ViewStyle>;
  viewportStyle?: StyleProp<ViewStyle>;
  maxHeight?: number;
};

type SelectItemProps = {
  value: string;
  label?: string;
  disabled?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

type SelectGroupProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

type SelectLabelProps = PropsWithChildren<{
  style?: StyleProp<TextStyle>;
}>;

type SelectSeparatorProps = {
  style?: StyleProp<ViewStyle>;
};

type SelectContextValue = {
  disabled: boolean;
  itemMap: Map<string, string>;
  open: boolean;
  selectedLabel?: string;
  selectedValue?: string;
  setOpen: (open: boolean) => void;
  setSelectedValue: (value: string) => void;
};

const SelectContext = createContext<SelectContextValue | null>(null);
const SELECT_ITEM_MARKER = "__AFITSANT_SELECT_ITEM__";

function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}) {
  const [internalValue, setInternalValue] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const setValue = (nextValue: T) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
  };

  return [currentValue, setValue] as const;
}

function extractTextLabel(children: ReactNode): string | undefined {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  let resolvedLabel: string | undefined;

  Children.forEach(children, (child) => {
    if (resolvedLabel) {
      return;
    }

    if (typeof child === "string" || typeof child === "number") {
      resolvedLabel = String(child);
      return;
    }

    if (isValidElement(child)) {
      resolvedLabel = extractTextLabel(
        (child as ReactElement<{ children?: ReactNode }>).props.children
      );
    }
  });

  return resolvedLabel;
}

function collectSelectItems(children: ReactNode, itemMap = new Map<string, string>()) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    const element = child as ReactElement<SelectItemProps>;
    const elementType = element.type as typeof element.type & {
      [SELECT_ITEM_MARKER]?: boolean;
    };

    if (elementType?.[SELECT_ITEM_MARKER]) {
      const label =
        element.props.label ??
        extractTextLabel(element.props.children) ??
        element.props.value;

      itemMap.set(element.props.value, label);
    }

    if (element.props.children) {
      collectSelectItems(element.props.children, itemMap);
    }
  });

  return itemMap;
}

function useSelectContext(componentName: string) {
  const context = useContext(SelectContext);

  if (!context) {
    throw new Error(`${componentName} must be used inside Select`);
  }

  return context;
}

export function Select({
  children,
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
}: SelectRootProps) {
  const [selectedValue, setSelectedValue] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: (nextValue) => {
      if (nextValue !== undefined) {
        onValueChange?.(nextValue);
      }
    },
  });
  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const itemMap = useMemo(() => collectSelectItems(children), [children]);
  const selectedLabel = selectedValue
    ? itemMap.get(selectedValue) ?? selectedValue
    : undefined;

  return (
    <SelectContext.Provider
      value={{
        disabled,
        itemMap,
        open: isOpen,
        selectedLabel,
        selectedValue,
        setOpen: setIsOpen,
        setSelectedValue,
      }}
    >
      {children}
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  children,
  disabled,
  hasError,
  style,
  ...props
}: SelectTriggerProps) {
  const context = useSelectContext("SelectTrigger");
  const isDisabled = Boolean(context.disabled || disabled);

  const baseClasses =
    "flex-row items-center justify-between min-h-[54px] rounded-xl border bg-white px-3.5 pl-4";
  const errorClasses = hasError ? " border-red-500" : " border-neutral-300";
  const disabledClasses = isDisabled ? " bg-slate-50 opacity-75" : "";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, expanded: context.open }}
      disabled={isDisabled}
      onPress={() => context.setOpen(!context.open)}
      style={style}
      className={`${baseClasses}${errorClasses}${disabledClasses}`}
      {...props}
    >
      <View className="flex-1 pr-3 py-3">
        {children}
      </View>
      <Ionicons
        name={context.open ? "chevron-up" : "chevron-down"}
        size={18}
        color={isDisabled ? "#94a3b8" : "#475569"}
      />
    </Pressable>
  );
}

export function SelectValue({
  placeholder = "Select an option",
  style,
}: SelectValueProps) {
  const context = useSelectContext("SelectValue");
  const hasValue = Boolean(context.selectedLabel);

  return (
    <Text
      numberOfLines={1}
      style={style}
      className={`text-base ${hasValue ? "text-slate-900 font-medium" : "text-slate-400"}`}
    >
      {context.selectedLabel ?? placeholder}
    </Text>
  );
}

export function SelectContent({
  children,
  title = "Select an option",
  style,
  viewportStyle,
  maxHeight = 320,
}: SelectContentProps) {
  const context = useSelectContext("SelectContent");

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => context.setOpen(false)}
      transparent
      visible={context.open}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-slate-900/40" onPress={() => context.setOpen(false)} />

        <SafeAreaView edges={["bottom"]} className="justify-end">
          <View
            style={style}
            className="bg-slate-50 rounded-t-[32px] px-[18px] pt-3 pb-[14px] shadow-lg"
          >
            <View className="items-center mb-[14px]">
              <View className="w-14 h-[5px] rounded-full bg-slate-300" />
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[17px] font-extrabold text-slate-900">{title}</Text>
              <Pressable
                hitSlop={8}
                onPress={() => context.setOpen(false)}
                className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>

            <ScrollView
              bounces={false}
              contentContainerStyle={viewportStyle}
              contentContainerClassName="flex-row flex-wrap gap-y-3 gap-x-3 pb-3"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight }}
            >
              {children}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function SelectGroup({ children, style }: SelectGroupProps) {
  return (
    <View style={style}>
      {children}
    </View>
  );
}

export function SelectLabel({ children, style }: SelectLabelProps) {
  return (
    <Text
      style={style}
      className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.9px] mb-2.5 px-1.5"
    >
      {children}
    </Text>
  );
}

export function SelectSeparator({ style }: SelectSeparatorProps) {
  return <View style={style} className="h-px my-3 bg-slate-200" />;
}

export function SelectItem({
  children,
  disabled = false,
  label,
  style,
  textStyle,
  value,
}: SelectItemProps) {
  const context = useSelectContext("SelectItem");
  const isSelected = context.selectedValue === value;
  const displayLabel = label ?? extractTextLabel(children) ?? value;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: isSelected }}
      disabled={disabled}
      onPress={() => {
        if (disabled) {
          return;
        }

        context.setSelectedValue(value);
        context.setOpen(false);
      }}
      style={style}
      className={`flex-row items-center justify-between min-h-[58px] rounded-[18px] border px-4 py-[14px] bg-white ${
        isSelected ? "border-sky-300 bg-sky-50" : "border-slate-200"
      } ${disabled ? "opacity-45" : ""} flex-shrink`}
    >
      <View className="flex-1 min-w-0 pr-3">
        <Text
          numberOfLines={1}
          style={textStyle}
          className={`text-[15px] font-semibold ${
            isSelected ? "text-slate-950" : disabled ? "text-slate-400" : "text-slate-900"
          }`}
        >
          {children ?? displayLabel}
        </Text>
      </View>

      <View
        className={`h-7 w-7 rounded-full items-center justify-center ${
          isSelected ? "bg-slate-900 border border-slate-900" : "bg-white border border-slate-300"
        }`}
      >
        {isSelected ? <Ionicons name="checkmark" size={16} color="#ffffff" /> : null}
      </View>
    </Pressable>
  );
}

(SelectItem as typeof SelectItem & {
  [SELECT_ITEM_MARKER]?: boolean;
})[SELECT_ITEM_MARKER] = true;
