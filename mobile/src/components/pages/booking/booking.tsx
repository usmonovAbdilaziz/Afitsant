import { Text, View } from "react-native";

export const GlobalBookingPage=()=>{
     return (
        <View className="flex-1 bg-slate-50 px-6 pt-20">
          <Text className="text-xs uppercase tracking-[3px] text-sky-600">Staff panel</Text>
          <Text className="mt-3 text-3xl font-bold text-slate-900">Booking</Text>
          <Text className="mt-4 text-base leading-6 text-slate-500">
            Yangi buyurtmalar, tasdiqlash va mijoz bilan ishlash jarayoni shu yerda boshqariladi.
          </Text>
        </View>
      );
}