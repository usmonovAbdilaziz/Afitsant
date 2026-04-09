import { useEffect, useState, type ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEvent,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthFormScreenProps = {
  title: string;
  description: string;
  header?: ReactNode;
  children: ReactNode;
};

export function AuthFormScreen({
  title,
  description,
  header,
  children,
}: AuthFormScreenProps) {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const runKeyboardAnimation = (event: KeyboardEvent) => {
      if (Platform.OS === "ios") {
        Keyboard.scheduleLayoutAnimation(event);
        return;
      }

      LayoutAnimation.configureNext({
        duration: event.duration > 0 ? event.duration : 220,
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        delete: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
      });
    };

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      runKeyboardAnimation(event);
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      runKeyboardAnimation(event);
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.content,
                isKeyboardVisible
                  ? styles.contentWithKeyboard
                  : styles.contentWithoutKeyboard,
              ]}
            >
              {header ? <View style={styles.header}>{header}</View> : null}

              <View style={styles.cardWrapper}>
                <View style={styles.card}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.description}>{description}</Text>

                  <View style={styles.formContent}>{children}</View>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  contentWithoutKeyboard: {
    paddingBottom: 24,
  },
  contentWithKeyboard: {
    paddingBottom: 3,
  },
  header: {
    alignItems: "center",
  },
  cardWrapper: {
    flex: 1,
    justifyContent: "flex-end",
    paddingTop: 24,
  },
  card: {
    borderRadius: 28,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0f172a",
  },
  description: {
    marginTop: 8,
    fontSize: 15,
    color: "#64748b",
  },
  formContent: {
    marginTop: 24,
  },
});
