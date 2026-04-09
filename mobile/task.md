# NativeWind va Expo sozlamalari bo'yicha bajarilgan ishlar

## Muammo

`npx expo start --clear` ishga tushganda quyidagi xato chiqayotgan edi:

- `ERR_UNSUPPORTED_ESM_URL_SCHEME`
- Metro `mobile/metro.config.js` faylini Windows muhitida noto'g'ri yuklayotgan edi
- `className` TypeScript tomonidan to'liq tanilmayotgan edi

## Qilingan o'zgarishlar

### 1. `package.json` tozalandi

- `"type": "module"` olib tashlandi
- `nativewind` qo'shildi
- `react-native-reanimated` qo'shildi
- `react-native-safe-area-context` qo'shildi
- `babel-preset-expo` devDependency sifatida qo'shildi
- `tailwindcss` `4.x` dan `3.4.x` ga tushirildi, chunki `nativewind@4` stable shu liniya bilan ishlaydi

### 2. NativeWind uchun TypeScript typing yoqildi

Yangi fayl yaratildi:

- `mobile/nativewind-env.d.ts`

Ichiga quyidagisi yozildi:

```ts
/// <reference types="nativewind/types" />
```

Bu `className` propini TypeScript va editor tomonidan tanilishi uchun kerak.

### 3. `tsconfig.json` yangilandi

- `baseUrl: "."` qo'shildi
- `include` ichida `nativewind-env.d.ts` qoldirildi

Bu alias va typing resolutionni barqaror qiladi.

### 4. `tailwind.config.js` moslashtirildi

- `nativewind/preset` ishlatildi
- `content` ichiga `js`, `jsx`, `ts`, `tsx` patternlari qo'shildi

Bu Tailwind klasslari skan qilinishi uchun kerak.

### 5. `App.tsx` soddalashtirildi

- keraksiz `StatusBar` va `StyleSheet` importlari olib tashlandi
- `global.css` importi normal formatga keltirildi
- `className` bilan ishlaydigan test UI qoldirildi

## Tekshiruv

Quyidagilar tekshirildi:

- `npx tsc --noEmit` muvaffaqiyatli o'tdi
- `metro.config.js` va `babel.config.js` Node tomonidan yuklanishi tasdiqlandi
- Expo start avvalgi Metro config xatosidan o'tdi

## Hozirgi holat

Asosiy muammo hal qilindi:

- Metro config endi Windows'da qulamaydi
- NativeWind stable konfiguratsiyada ishlashga tayyor
- `className` TypeScript tomonidan taniladi

Qolgan yagona amaliy muammo:

- `expo start` paytida ba'zi portlar (`8081`, `8082`) band edi

Ishga tushirish uchun tavsiya qilingan buyruq:

```bash
npx expo start --clear --port 8091
```
