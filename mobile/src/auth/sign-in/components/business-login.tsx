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
import { useBusiness } from "@/hooks/business";
import { replaceAuthStorage } from "@/components/storage/auth";
import { router } from "expo-router";

// ------------------ SCHEMA ------------------

const businessSchema = z.object({
  email: z.string().trim().email("Email noto'g'ri"),
  password: z.string().min(6, "Kamida 6 ta belgi"),
});

type BusinessType = z.infer<typeof businessSchema>;

// ------------------ COMPONENT ------------------

export default function BusinessLogin() {
  const [isSavingSession, setIsSavingSession] = useState(false);
  const businessLogin = useBusiness();
  const passwordRef = useRef<TextInput>(null);
  const businessForm = useForm<BusinessType>({
    resolver: zodResolver(businessSchema),
    defaultValues: { email: "", password: "" },
  });
  const isSubmitting = businessLogin.isPending || isSavingSession;

  const onSubmitBusiness = async (data: BusinessType) => {
    Keyboard.dismiss();
    setIsSavingSession(true);

    try {
      const res = await businessLogin.mutateAsync(data);
      await replaceAuthStorage(res.token, res.user);
      router.replace("/(tab)/home");
    } catch (error) {
      console.log("Business login error:", error);
    } finally {
      setIsSavingSession(false);
    }
  };

  const submitBusiness = businessForm.handleSubmit(
    onSubmitBusiness,
    (errors) =>
      console.log(
        "Business login validation errors:",
        JSON.stringify(errors)
      )
  );

  return (
    <View>
      <FormField
        label="Email"
        error={businessForm.formState.errors.email?.message}
      >
        <Controller
          control={businessForm.control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              hasError={!!businessForm.formState.errors.email}
              importantForAutofill="yes"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder="Email"
              returnKeyType="next"
              submitBehavior="submit"
              textContentType="emailAddress"
              value={value}
            />
          )}
        />
      </FormField>

      <FormField
        label="Parol"
        error={businessForm.formState.errors.password?.message}
      >
        <Controller
          control={businessForm.control}
          name="password"
          render={({ field: { onBlur, onChange, value } }) => (
            <Input
              ref={passwordRef}
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect={false}
              hasError={!!businessForm.formState.errors.password}
              importantForAutofill="yes"
              isPassword
              onBlur={onBlur}
              onChangeText={onChange}
              onSubmitEditing={submitBusiness}
              placeholder="Parol"
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              textContentType="password"
              value={value}
            />
          )}
        />
      </FormField>

      <TouchableOpacity
        activeOpacity={0.85}
        className="mt-4 rounded-xl bg-sky-600 py-3"
        disabled={isSubmitting}
        onPress={submitBusiness}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center font-semibold text-white">
            Business login
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
