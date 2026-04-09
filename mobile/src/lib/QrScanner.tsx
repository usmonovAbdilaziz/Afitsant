import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";

type QrScannerProps = {
  onScan: (value: string) => void;
};

export default function QrScanner({ onScan }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (!permission?.granted) {
      void requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-white">Camera permission tekshirilmoqda...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-center text-white">
          QR scanner uchun camera ruxsati kerak.
        </Text>
        <Pressable
          onPress={() => void requestPermission()}
          className="mt-4 rounded-xl bg-sky-600 px-5 py-3"
        >
          <Text className="font-semibold text-white">Ruxsat berish</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CameraView
      style={{ flex: 1 }}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      onBarcodeScanned={({ data }) => {
        if (!data || hasScannedRef.current) {
          return;
        }

        hasScannedRef.current = true;
        onScan(data);
      }}
    />
  );
}
