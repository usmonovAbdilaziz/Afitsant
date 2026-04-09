import { View,Text } from "react-native"

export const GlobalArchivePages=()=>{
    return(
        <View className="flex-1 bg-slate-50 px-6 pt-20">
              <Text className="text-xs uppercase tracking-[3px] text-sky-600">Staff panel</Text>
              <Text className="mt-3 text-3xl font-bold text-slate-900">Archive</Text>
              <Text className="mt-4 text-base leading-6 text-slate-500">
                Yakunlangan ishlar va saqlangan yozuvlar keyinroq ko&apos;rish uchun shu bo&apos;limda jamlanadi.
              </Text>
        </View>
    )
}