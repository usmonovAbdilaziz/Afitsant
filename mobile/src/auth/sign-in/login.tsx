import { useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import StaffLogin from "./components/staff-login";
import BusinessLogin from "./components/business-login";
import { Button } from "@/components/ui/button";
import { AuthFormScreen } from "./components/auth-form-screen";


export default function LoginChoicePage() {
  const [staff, setStaff] = useState(false);
  const isStaffLogin = staff;

  const handleSelectBusiness = () => {
    Keyboard.dismiss();
    setStaff(false);
  };

  const handleSelectStaff = () => {
    Keyboard.dismiss();
    setStaff(true);
  };

  return (
    <AuthFormScreen
      title="Login"
      description={
        isStaffLogin
          ? "Staff sifatida tizimga kiring"
          : "Business account orqali tizimga kiring"
      }
      header={
        <View style={styles.switcher}>
          <Button
            variant={isStaffLogin ? "outline" : "default"}
            onPress={handleSelectBusiness}
          >
            Business
          </Button>
          <Button
            variant={isStaffLogin ? "default" : "outline"}
            onPress={handleSelectStaff}
          >
            Staff
          </Button>
        </View>
      }
    >
      {isStaffLogin ? <StaffLogin /> : <BusinessLogin />}
    </AuthFormScreen>
  );
}

const styles = StyleSheet.create({
  switcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
});
