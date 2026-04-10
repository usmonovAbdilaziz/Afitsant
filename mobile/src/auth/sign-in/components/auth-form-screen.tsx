import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthFormScreenProps = {
  title: string;
  description: string;
  header?: ReactNode;
  children: ReactNode;
  onClose?: ReactNode;
};

export function AuthFormScreen({ title, description, children, onClose }: AuthFormScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"} // Android uchun 'height' ko'p holatlarda yaxshi ishlaydi
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }} // BU JUDA MUHIM: Scroll ichi to'liq flex bo'lishi uchun
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled" // Inputga tegishni osonlashtiradi
          showsVerticalScrollIndicator={false}
        >
          {/* justify-end -> Cardni doim pastda ushlab turadi */}
          <View className="flex-1 justify-end">
            {/* Bo'sh joy tepada */}
            <View className="flex-1" />
            <View className="rounded-t-3xl bg-white p-6 pb-12 shadow-md">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-3xl font-bold text-slate-900">{title}</Text>
                  <Text className="mt-2 text-base text-slate-600">{description}</Text>
                </View>
                {onClose ? <View>{onClose}</View> : null}
              </View>
              <View className="mt-6">{children}</View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: "#020617",
//   },
//   scrollContent: {
//     flexGrow: 1,
//   },
//   content: {
//     flexGrow: 1,
//     paddingHorizontal: 24,
//     paddingTop: 24,
//     paddingBottom: 24, // Optional padding for when the keyboard is open/closed
//   },
//   header: {
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   spacer: {
//     flex: 1,
//   },
//   card: {
//     borderRadius: 28,
//     backgroundColor: "#ffffff",
//     paddingHorizontal: 24,
//     paddingVertical: 32,
//   },
//   title: {
//     fontSize: 30,
//     fontWeight: "700",
//     color: "#0f172a",
//   },
//   description: {
//     marginTop: 8,
//     fontSize: 15,
//     color: "#64748b",
//   },
//   formContent: {
//     marginTop: 24,
//   },
// });


