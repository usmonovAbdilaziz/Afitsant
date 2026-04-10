import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/ui/form";
import Input from "@/components/ui/input";
import { useStaffLogin } from "@/hooks/staff";
import { replaceAuthStorage } from "@/components/storage/auth";
import { router } from "expo-router";


// ------------------ SCHEMA ------------------

const staffSchema = z.object({
  fullName: z.string().min(3, "Kamida 3 ta harf"),
  phoneNumber: z
    .string()
    .min(9, "Telefon qisqa")
    .regex(/^\+?\d+$/, "Faqat raqam"),
});

type StaffType = z.infer<typeof staffSchema>;

// ------------------ COMPONENT ------------------

export default function StaffLogin() {
  const [isSavingSession, setIsSavingSession] = useState(false);
  const staffLogin = useStaffLogin();
  const phoneRef = useRef<TextInput>(null);

  const staffForm = useForm<StaffType>({
    resolver: zodResolver(staffSchema),
    defaultValues: { fullName: "", phoneNumber: "" },
  });
  const isSubmitting = staffLogin.isPending || isSavingSession;

  const onSubmitStaff = async (data: StaffType) => {
    Keyboard.dismiss();
    setIsSavingSession(true);

    try {
      const res = await staffLogin.mutateAsync(data);

      await replaceAuthStorage(res.token, res.user);
      router.replace("/(tab)/home");
    } catch (error) {
      console.log("Staff login error:", error);
    } finally {
      setIsSavingSession(false);
    }
  };

  const submitStaff = staffForm.handleSubmit(onSubmitStaff);

  return (
    <View>
      <FormField
        label="To'liq ism"
        error={staffForm.formState.errors.fullName?.message}
      >
        <Controller
          control={staffForm.control}
          name="fullName"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              autoCapitalize="words"
              autoComplete="name"
              hasError={!!staffForm.formState.errors.fullName}
              onBlur={onBlur}
              onChangeText={onChange}
              onSubmitEditing={() => phoneRef.current?.focus()}
              placeholder="Ism"
              returnKeyType="next"
              submitBehavior="submit"
              textContentType="name"
              value={value}
            />
          )}
        />
      </FormField>

      <FormField
        label="Telefon"
        error={staffForm.formState.errors.phoneNumber?.message}
      >
        <Controller
          control={staffForm.control}
          name="phoneNumber"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              ref={phoneRef}
              autoCapitalize="none"
              autoComplete="tel"
              hasError={!!staffForm.formState.errors.phoneNumber}
              inputMode="tel"
              keyboardType="phone-pad"
              onBlur={onBlur}
              onChangeText={onChange}
              onSubmitEditing={submitStaff}
              placeholder="+998..."
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              textContentType="telephoneNumber"
              value={value}
            />
          )}
        />
      </FormField>
      <TouchableOpacity
        activeOpacity={0.85}
        className="mt-4 rounded-xl bg-emerald-600 py-3"
        disabled={isSubmitting}
        onPress={submitStaff}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center font-semibold text-white">
            Staff login
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
