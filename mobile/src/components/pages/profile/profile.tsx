import { Text, View } from 'react-native';

export default function GlobalProfilePage() {
  return (
    <View className="flex-1 bg-slate-50 px-6 pt-20">
      <Text className="text-xs uppercase tracking-[3px] text-sky-600">Staff panel</Text>
      <Text className="mt-3 text-3xl font-bold text-slate-900">Profile</Text>
      <Text className="mt-4 text-base leading-6 text-slate-500">
        Xodim profili, kontaktlar va ishdagi rol ma&apos;lumotlari shu bo&apos;limda turadi.
      </Text>
    </View>
  );
}