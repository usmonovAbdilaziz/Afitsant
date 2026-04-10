import { useState } from "react";
import { Keyboard, Text, TouchableOpacity, View } from "react-native";
import StaffLogin from "./components/staff-login";

import { AuthFormScreen } from "./components/auth-form-screen";
import BusinessLogin from "./components/business-login";
import { useRouter } from "expo-router";

export default function LoginChoicePage() {
  const [staff, setStaff] = useState(true);
  const isStaffLogin = staff;
  const router = useRouter();

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
          ? "Login uchun ismingiz va telefon raqamingizni kiriting"
          : "Business account orqali tizimga kiring"
      }
      onClose={
        <View>
          <TouchableOpacity
            onPress={() => router.replace('/(tab)/home')}
            style={{ padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 18, color: '#475569', fontWeight: 'bold' }}>✕</Text>
          </TouchableOpacity>
        </View>
      }
    // header={
    //   <View style={styles.switcher}>
    //     {/* <Button
    //       variant={isStaffLogin ? "outline" : "default"}
    //       onPress={handleSelectBusiness}
    //     >
    //       Business
    //     </Button> */}
    //     <Button
    //       variant={isStaffLogin ? "default" : "outline"}
    //       onPress={handleSelectStaff}
    //     >
    //       Staff
    //     </Button>
    //   </View>
    // }
    >
      {isStaffLogin ? <StaffLogin /> : <BusinessLogin />}
    </AuthFormScreen>
  );
}

// const styles = StyleSheet.create({
//   switcher: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 12,
//   },
// });
