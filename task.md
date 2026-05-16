# 2026-03-12 Kunlik Ishlar Hisoboti

Hisobot holati: 13:16 gacha

Izoh: Quyidagi vaqtlar bugun o'zgartirilgan fayllarning oxirgi saqlangan vaqti va ishlar ketma-ketligiga tayangan holda yozildi.

## 11:58

- Client savatchasi oqimi yaxshilandi.
- Har bir tanlangan zakaz itemi uchun alohida `description` yozish imkoniyati qo'shildi.
- Description yozilmasa `null` holatda o'tkazib yuboriladigan qilib saqlandi.
- Ushbu izoh booking item note oqimiga ulandi.
- Client va business tarafdagi booking ko'rinishlarida item izohlari chiqariladigan qilindi.

Qamrab olingan joylar:
- `shadcn-admin/src/store/use-cart-store.ts`
- `shadcn-admin/src/components/client/Karzinka.tsx`
- `shadcn-admin/src/components/client/client-body.tsx`
- `shadcn-admin/src/components/client/Profile.tsx`
- `shadcn-admin/src/components/business/bookign-component/BookingTabel.tsx`

## 12:14

- Telegram bot ulanishidagi timeout muammosi tahlil qilindi va servis mustahkamlandi.
- Bot ishga tushishda IPv4 agent ishlatadigan qilindi.
- Init yoki polling yiqilib qolsa, qayta urinib ko'radigan retry mexanizmi qo'shildi.
- Bot username va env mosligi bo'yicha ogohlantirish loglari yaxshilandi.

Qamrab olingan joy:
- `src/services/telegram/telegram.service.ts`

## 12:30 - 12:38

- Telegram orqali tasdiqlashdan keyin frontend buyurtma tasdiqlanganini ushlamay qolayotgan oqim tuzatildi.
- Order session holatini tekshiruvchi backend endpoint qo'shildi.
- Frontendga polling fallback qo'shildi, ya'ni socket event o'tib ketsa ham session status tekshirilib oqim davom ettiriladi.
- Socket room join oqimi client tomonda silliqlandi.

Qamrab olingan joylar:
- `src/routes/v1/order.routes.ts`
- `src/controllers/v1/order.controller.ts`
- `src/services/v1/order-session.service.ts`
- `shadcn-admin/src/api/order.ts`
- `shadcn-admin/src/components/client/Karzinka.tsx`
- `shadcn-admin/src/context/socket-context.tsx`

## 12:59 - 13:11

- Booking realtime event oqimi noldan yig'ildi.
- Backendda `booking:changed` eventi qo'shildi.
- Booking yaratilganda yoki status o'zgarganda client va business roomlarga event yuboriladigan qilindi.
- Socket serverga `joinBusinessRoom` va `joinClientRoom` qo'shildi.
- Order orqali yaratiladigan bookinglar ham realtime oqimga ulandi.

Qamrab olingan joylar:
- `src/services/v1/booking-realtime.service.ts`
- `src/controllers/v1/socket.controller.ts`
- `src/services/v1/booking.service.ts`
- `src/services/v1/order.service.ts`

## 13:00 - 13:07

- Frontend uchun umumiy realtime invalidation hook yozildi.
- Business va staff sahifalariga business room join qo'shildi.
- Client tomonda client room join qo'shildi.
- Booking query keylari tartibga keltirildi va realtime invalidate bilan ishlaydigan qilindi.
- Staff API qidiruv va status filterlarini aniq parametr bilan ishlaydigan bo'ldi.
- Client bookinglar `axios + useEffect` oqimidan React Query oqimiga o'tkazildi.

Qamrab olingan joylar:
- `shadcn-admin/src/hooks/booking-realtime.tsx`
- `shadcn-admin/src/context/socket-context.tsx`
- `shadcn-admin/src/hooks/business.tsx`
- `shadcn-admin/src/hooks/staff.tsx`
- `shadcn-admin/src/hooks/booking.tsx`
- `shadcn-admin/src/api/staff.ts`
- `shadcn-admin/src/components/business/booking.tsx`

## 13:01 - 13:04

- Booking status label va ranglari uchun alohida util yozildi.
- `/staff/bookings` cashier sahifasi status bo'yicha 3 bo'limga ajratildi:
  - `PENDING` -> `Kutilmoqda`
  - `CONFIRMED` -> `Tasdiqlanmoqda`
  - `COMPLETED` -> `Tasdiqlangan`
- Cashier qidiruvi `useDeferredValue` bilan silliqlandi.
- Staff booking detail ko'rinishi tozalandi va izohlar, item vaqtlar, status badge'lar yaxshilandi.
- Client profile sahifasi realtime status ko'rsatadigan va query invalidate bilan yangilanadigan qilindi.

Qamrab olingan joylar:
- `shadcn-admin/src/lib/booking-status.ts`
- `shadcn-admin/src/components/staff/bookings.tsx`
- `shadcn-admin/src/components/staff/_components/bookignDetail.tsx`
- `shadcn-admin/src/components/client/Profile.tsx`

## Tekshiruv

- Backend lint tekshirildi:
  - `src/services/v1/booking-realtime.service.ts`
  - `src/controllers/v1/socket.controller.ts`
  - `src/services/v1/order.service.ts`
- Frontend lint tekshirildi:
  - yangi qo'shilgan va o'zgartirilgan staff/client/business realtime fayllari o'tdi
  - `shadcn-admin/src/context/socket-context.tsx` faylida oldindan mavjud `react-refresh/only-export-components` warning qoldi

## Muammolar va eslatmalar

- `src/services/v1/booking.service.ts` faylida oldindan mavjud lint debt ko'p, shu sabab butun backend hali to'liq lint-clean emas.
- Redis uchun lokal ishga tushirish komandasi:

```bash
docker run --name redis -p 6379:6379 -d redis:7-alpine
```

## Yakuniy holat

- Client zakaz item description oqimi ishlaydi.
- Telegram tasdiqlashdan keyin frontend fallback bilan oqimni davom ettiradi.
- Cashier `/staff/bookings` sahifasi 3 status bo'limida ishlaydi.
- Booking status o'zgarishi client, staff va business sahifalarida realtime yangilanadigan holatga keltirildi.

---

# 2026-03-12 Kunlik Ishlar Hisoboti Davomi

Hisobot holati: 17:06 gacha

## 13:20 - 13:28

- Client booking profil sahifasida chiqqan `403 Forbidden` muammosi tahlil qilindi.
- Client booking query'lari noto'g'ri token bilan ketayotgan joylar tozalandi.
- Client profil va cart oqimi bir xil auth manbadan ishlaydigan qilindi.

Qamrab olingan joylar:
- `shadcn-admin/src/api/booking.ts`
- `shadcn-admin/src/hooks/booking.tsx`
- `shadcn-admin/src/components/client/Profile.tsx`
- `shadcn-admin/src/components/client/Karzinka.tsx`

## 13:30 - 13:50

- `/staff/bookings` cashier sahifasi to'liq tab ko'rinishiga o'tkazildi.
- Search yozilganda faqat `PENDING` bookinglar chiqadigan qilindi.
- Staff position bo'yicha alohida route mapping qo'shildi.
- Login va guard oqimi staffni o'z `position` sahifasiga yo'naltiradigan qilindi.
- Sidebar toggle yoniga staff position labeli chiqarildi.

Qamrab olingan joylar:
- `shadcn-admin/src/components/staff/bookings.tsx`
- `shadcn-admin/src/lib/staff-position.ts`
- `shadcn-admin/src/routes/staff/route.tsx`
- `shadcn-admin/src/routes/staff/index.tsx`
- `shadcn-admin/src/routes/staff/$position.tsx`
- `shadcn-admin/src/components/layout/header.tsx`
- `src/controllers/auth/auth.controller.ts`

## 14:17 - 14:52

- `MANAGER` va `CASHIER` bookingni tasdiqlaganda kim tasdiqlagani yozib qoldiriladigan audit oqimi qo'shildi.
- Business owner booking jadvalida ham kim tasdiqlagani ko'rinadigan qilindi.
- Staff role bo'yicha booking scope qayta ko'rib chiqildi:
  - `MANAGER`, `CASHIER` barcha bookinglarni ko'radi
  - qolgan staff faqat o'ziga tegishli item yoki service'larni ko'radi
- Booking confirmer uchun alohida migration qo'shildi.

Qamrab olingan joylar:
- `prisma/schema.prisma`
- `prisma/migrations/20260312093000_add_booking_confirmer`
- `src/services/v1/booking.service.ts`
- `src/types/booking.types.ts`
- `shadcn-admin/src/components/staff/_components/bookignDetail.tsx`
- `shadcn-admin/src/components/business/bookign-component/BookingTabel.tsx`

## 14:52 - 15:35

- Booking/order progress lifecycle production oqimi yig'ildi.
- Item darajasida statuslar qo'shildi:
  - `PENDING`
  - `PREPARING`
  - `READY`
  - `CANCELLED`
- Booking darajasida progress statuslar qo'shildi:
  - `PENDING`
  - `PREPARING`
  - `READY_FOR_DELIVERY`
  - `DELIVERING`
  - `DELIVERED`
  - `CANCELLED`
- Hamma item tayyor bo'lganda `MANAGER`, `WAITER`, `RUNNER` realtime notification oladigan qilindi.
- `WAITER` va `RUNNER` delivery claim qila oladigan oqim qo'shildi.
- 2 daqiqada delivery claim bo'lmasa manager warning oladigan oqim qo'shildi.
- Client progress sahifasi realtime booking lifecycle ko'rsatadigan qilindi.

Qamrab olingan joylar:
- `prisma/schema.prisma`
- `prisma/migrations/20260312114000_add_booking_progress_flow`
- `index.ts`
- `src/services/v1/booking-progress.service.ts`
- `src/services/v1/booking-view.service.ts`
- `src/services/v1/booking-realtime.service.ts`
- `src/services/v1/booking.service.ts`
- `src/controllers/v1/booking.controller.ts`
- `src/routes/v1/booking.routes.ts`
- `src/validators/booking.validators.ts`
- `shadcn-admin/src/components/staff/_components/progress-board.tsx`
- `shadcn-admin/src/lib/booking-progress.ts`

## 15:35 - 16:05

- Runner va waiter sahifasida booking summasi client bilan bir xil bo'lishi tuzatildi.
- Delivery role bookinglari endi faqat ichimlik emas, oshxona itemlarini ham to'liq ko'radi.
- Runner sahifasida `osh` ham ko'rinishi uchun backend scope qayta tekshirildi.
- Eski backend process qayta ishga tushirilib real endpoint bilan tekshirildi.
- Preparation role'lar uchun eski `DELIVERED/COMPLETED` bookinglar aktiv queue'dan chiqarilib `Arxiv`ga ajratildi.

Qamrab olingan joylar:
- `src/services/v1/booking.service.ts`
- `shadcn-admin/src/components/staff/bookings.tsx`
- `shadcn-admin/src/components/staff/_components/progress-board.tsx`

## 16:20 - 16:36

- Staff progress kartalari dropdown/accordion ko'rinishiga o'tkazildi.
- Har bir booking kartasi endi ochilib-yopiladigan qilindi.
- Kunlik filter qo'shildi:
  - sana input
  - `Bugun` tugmasi
  - `Tozalash` tugmasi
- Kunlik jami summa va booking soni ko'rsatkichlari qo'shildi.
- Preparation role'lar uchun `Arxiv` statistikasi alohida va doimiy ko'rinadigan qilindi.
- Summary kartalar active tabga bog'liq bo'lmay qoldi.

Qamrab olingan joylar:
- `shadcn-admin/src/components/staff/bookings.tsx`
- `shadcn-admin/src/components/staff/_components/progress-board.tsx`
- `shadcn-admin/src/components/staff/_components/bookignDetail.tsx`
- `shadcn-admin/src/api/staff.ts`
- `shadcn-admin/src/hooks/staff.tsx`

## Qo'shimcha statistika

- Hisobotning ikkinchi qismida qamrab olingan vaqt oralig'i: taxminan `13:20 - 17:06`
- O'zgartirilgan asosiy backend fayllar: `12` ta
- O'zgartirilgan asosiy frontend fayllar: `11` ta
- Bugun qo'shilgan Prisma migrationlar: `2` ta
- Bugun qo'shilgan asosiy backend servis fayllari: `3` ta
- Bugun qo'shilgan asosiy frontend komponent/util fayllari: `2` ta
- Route bo'yicha boshqarilgan staff positionlar: `7` ta
  - `MANAGER`
  - `CASHIER`
  - `COOK`
  - `BARMEN`
  - `RUNNER`
  - `WAITER`
  - `CLEANER`
- Booking progress statuslari soni: `6` ta
- Booking item statuslari soni: `4` ta
- Realtime qamrab olingan asosiy interfeyslar: `3` ta
  - `client`
  - `staff`
  - `business`

## Davomiy yakuniy holat

- Client, staff va business booking oqimlari bir-biriga moslashtirildi.
- Staff roli bo'yicha alohida sahifalar va booking queue'lar ishlaydi.
- Booking progress lifecycle item darajasidan delivery yakunigacha ishlaydi.
- Staff booking sahifasida accordion, kunlik filter va doimiy arxiv statistikasi ishlaydi.

---

# 2026-05-15 Kunlik Ishlar Hisoboti

## Swagger / OpenAPI komponent merge xatosi tuzatildi

**Muammo:** Swagger UI `booking.yaml` dagi `$ref: '#/components/parameters/BookingStatusQuery'` va boshqa parametrlarga resolver xatosi bermoqda edi.

**Sabab:** `src/app.ts` da `swaggerDocs.components` ni qayta yig'ishda faqat `schemas` alohida merge qilingan, lekin `parameters`, `responses`, `securitySchemes` va boshqa kalitlar `...generatedComponents` spread orqali yozib ketilgan edi.

**Tuzatish:** Barcha standart OpenAPI komponent kalitlari (`schemas`, `parameters`, `responses`, `securitySchemes`, `requestBodies`, `headers`, `examples`) uchun alohida deep-merge qo'shildi.

Qamrab olingan joy:
- `src/app.ts`

---

## PostgreSQL auth va ma'lumotlar bazasi muammosi hal qilindi

**Muammo:** Backend `P1000 AuthenticationFailed` xatosi bilan ishlamay turibdi.

**Sabab:** `.env` dagi `DATABASE_URL` da `postgres` foydalanuvchisi uchun parol noto'g'ri edi (`abudev99`), va `afitsant` ma'lumotlar bazasi mavjud emas edi.

**Tuzatish:**
1. `sudo -u postgres psql` orqali `postgres` foydalanuvchisi paroli `abudev99` ga o'zgartirildi
2. `afitsant` ma'lumotlar bazasi yaratildi
3. Prisma migratsiyalari ishga tushirildi (`prisma migrate deploy`)

Qamrab olingan joylar:
- PostgreSQL server konfiguratsiyasi

---

## Frontend API integratsiyasi kengaytirildi

Loyihada mavjud bo'lmagan API ulanishlari, turlar, hooklar va sahifalar qo'shildi.

### Yangi turlar (types/)

- `src/types/booking.ts` — `Booking`, `BookingItem`, `BookingFilters`, `BookingStatus`, `PriceStatus` turlari
- `src/types/working-hours.ts` — `WorkingHours`, `DayOfWeek`, `DAYS_OF_WEEK`, `DAY_LABELS`, create/update turlari
- `src/types/review.ts` — `Review`, `ReviewStats` turlari

### Yangi API fayllari (api/)

- `shadcn-admin/src/api/booking.ts`
  - `getBusinessBookings(businessId, filters)` — sahifalangan booking ro'yxati
  - `confirmBooking(id)` — PATCH `/:id/confirm`
  - `completeBooking(id)` — PATCH `/:id/complete`
  - `cancelBooking(id)` — PATCH `/:id/staff-cancel`
- `shadcn-admin/src/api/working-hours.ts`
  - `getBusinessWorkingHours(businessId)`
  - `createBusinessWorkingHours(data)`
  - `updateBusinessWorkingHours(id, data)`
  - `deleteBusinessWorkingHours(id)`
- `shadcn-admin/src/api/review.ts`
  - `getBusinessReviews(businessId)`
  - `getBusinessReviewStats(businessId)`

### Yangi hooklar (hooks/)

- `shadcn-admin/src/hooks/booking.tsx`
  - `useGetBusinessBookings`, `useConfirmBooking`, `useCompleteBooking`, `useCancelBooking`
- `shadcn-admin/src/hooks/working-hours.tsx`
  - `useGetBusinessWorkingHours`, `useCreateBusinessWorkingHours`, `useUpdateBusinessWorkingHours`, `useDeleteBusinessWorkingHours`
- `shadcn-admin/src/hooks/review.tsx`
  - `useGetBusinessReviews`, `useGetBusinessReviewStats`

### Yangi komponentlar (components/business/)

- `shadcn-admin/src/components/business/bookings.tsx`
  - Status bo'yicha filter (PENDING / CONFIRMED / COMPLETED / CANCELLED)
  - Statistika kartalar
  - Booking jadvali: mijoz, stol, itemlar soni, jami narx, status, sana
  - Dropdown actions: tasdiqlash, yakunlash, bekor qilish
  - Detail modal: barcha xizmatlar va narxlar
- `shadcn-admin/src/components/business/working-hours.tsx`
  - Har bir hafta kuni uchun ish vaqtlari ko'rsatiladi
  - Inline tahrirlash (vaqt va faollik holati)
  - Zod + `react-hook-form` bilan yangi vaqt qo'shish modal
- `shadcn-admin/src/components/business/reviews.tsx`
  - O'rtacha reyting, jami sharhlar, taqsimot statistikasi
  - Sharhlar ro'yxati: yulduzlar, izoh, sana

### Yangi routelar (routes/_authenticated/business/)

- `shadcn-admin/src/routes/_authenticated/business/bookings.tsx` → `/business/bookings`
- `shadcn-admin/src/routes/_authenticated/business/working-hours.tsx` → `/business/working-hours`
- `shadcn-admin/src/routes/_authenticated/business/reviews.tsx` → `/business/reviews`

### Sidebar yangilandi

- `shadcn-admin/src/components/layout/data/sidebar-business-data.ts`
  - **Bookinglar** (`BookOpen` icon) → `/business/bookings`
  - **Ish vaqtlari** (`Clock` icon) → `/business/working-hours`
  - **Sharhlar** (`Star` icon) → `/business/reviews`

### routeTree.gen.ts yangilandi

`npx @tanstack/router-cli generate` orqali yangi routelar avtomatik ro'yxatga olindi.

## Tekshiruv

- `npx tsc --noEmit` — 0 xato

## Yakuniy holat

- Business panel endi to'liq API bilan ulangan: Staff, Service, Table, **Booking**, **Working Hours**, **Reviews**
- Barcha formalar Zod schema + `react-hook-form` + `zodResolver` bilan boshqariladi
- Frontend `http://localhost:5173` da ishlaydi

---

# 2026-04-09 Kunlik Ishlar Hisoboti

## Mobile Auth & Navigation

- Mobile ilova ishga tushganda doim foydalanuvchiga birinchi marta login oynasi ko'rsatilayotgan mantiqiy xato to'g'rilandi.
- Endi ilova birinchi marta yuklanganda darhol `Home` sahifasiga o'tadi (`mobile/src/app/index.tsx`).
- Foydalanuvchi faqatgina `Profile` sahifasiga kirishga uringandagina, agar tizimga kirmagan bo'lsa (token yo'q bo'lsa), auth/login ekraniga yo'naltiriladigan qilindi.
- `profile.tsx` sahifasida `useFocusEffect` orqali sahifa aktiv bo'lganda silliq tekshiruv o'rnatildi, vizual refresh muammolarni oldini olish uchun `ActivityIndicator` qoshildi.
- **Qo'shimcha tuzatish:** `home.tsx` componentining ichida o'rnatilgan eski auth tekshiruvi (foydalanuvchi tizimga kirmagan bo'lsa darhol login sahifasiga yo'naltiruvchi kod) olib tashlandi. Shunday qilib uy sahifasi hamma uchun to'siqsiz ochiladigan bo'ldi.
- Shuningdek, `home.tsx` dan endilikda keraksiz bo'lib qolgan token va auth importlari tozalandi.

Qamrab olingan joylar:
- `mobile/src/app/index.tsx`
- `mobile/src/app/(tab)/profile.tsx`
- `mobile/src/components/pages/home/home.tsx`

## 17:39 – Mobile Tab Tartib Tuzatishi va Login Keyboard Animatsiya

## 2026-05-16 — MultiServiceModal improvements

- Qo'shildi: `MultiServiceModal` har bir qo'shilgan service name uchun draft (`ServiceDraft`) saqlaydi (name, description, duration, price, photoFile, photoName va boshqalar).
- Qo'shildi: Har bir draft uchun inline maydonlar — `Description`, `Duration`, `Price` va `Photo` (item ostida fayl nomi ko'rsatiladi).
- O'zgartirildi: Top-level `Photo` inputi `ref` orqali boshqariladi va `Add` yoki `Cancel` bosilganda tozalanadi.
- Tuzatildi: oldingi `names` holati olib tashlandi; itemlar `items` massivida saqlanadi.
- Xulosa: `Create Services` bosilganda barcha draftlar bo'yicha FormData yaratiladi va serverga yuboriladi; muvaffaqiyat va xatolik toast'lari qo'shildi.


- **Asosiy muammo aniqlandi:** `sidebar-client.tsx` da `Profile` birinchi tab sifatida turgan, shuning uchun Expo Router `(tab)` guruhini yuklanganda darhol `profile` ekranini render qilgan va u auth tekshiruvini ishga tushirib login'ga yo'naltirgan.
- **Tuzatish:** `sidebarUseClient` massividagi tab tartibini qayta tashkil qilindi: `Home → Booking → Archive → Progress → Profile`. Endi birinchi tab `Home` bo'lib darhol ko'rinadi.
- **Root layout yangilandi:** `_layout.tsx` da `index`, `(tab)` va `auth/sign-in/login` ekranlari to'g'ri tartibda yozildi. Auth ekrani `presentation: 'modal'` sifatida belgilandi.
- **Login keyboard animatsiyasi:** `auth-form-screen.tsx` da eski `KeyboardAvoidingView` + `LayoutAnimation` yondashuvi o'rniga `Animated.Value` + `Animated.spring` ga o'tkazildi. Endi keyboard ochilganda card silliq tarzda tepaga suriladi va keyboard ostidan ko'rinib turadi.

Qamrab olingan joylar:
- `mobile/src/providers/sidebar-client.tsx`
- `mobile/src/app/_layout.tsx`
- `mobile/src/auth/sign-in/components/auth-form-screen.tsx`

## 17:47 – Input Component Refaktoring va Keyboard Muammosi Tuzatildi

- **Muammo:** Login sahifasida faqat password input keyboard ochardi, qolgan inputlarda (email, ism, telefon) keyboard ochilmas edi. Sabab: `auth-form-screen.tsx` dagi `TouchableWithoutFeedback` barcha touch eventlarni ushlayotgan va `Keyboard.dismiss()` ni darhol ishga tushirayotgan edi.
- **Tuzatish 1:** `TouchableWithoutFeedback` butunlay olib tashlandi. O'rniga faqat background (header va spacer) joylariga `Pressable onPress={Keyboard.dismiss}` qo'yildi. Inputlar endi to'siqsiz ishlaydi.
- **Tuzatish 2:** Yangi alohida `Input` component yaratildi (`mobile/src/components/ui/input.tsx`):
  - `forwardRef` bilan ref support
  - `showSoftInputOnFocus={true}` bilan keyboard garantiyalangan ochiladi
  - Password toggle (`eye/eye-off` icon) ichki holat bilan boshqariladi
  - `StyleSheet` asosida professional styling
- **Tozalash:** Eski `Input` componenti `form.tsx` dan olib tashlandi va login fayllaridagi importlar yangilandi.

Qamrab olingan joylar:
- `mobile/src/components/ui/input.tsx` (yangi)
- `mobile/src/components/ui/form.tsx`
- `mobile/src/auth/sign-in/components/auth-form-screen.tsx`
- `mobile/src/auth/sign-in/components/business-login.tsx`
- `mobile/src/auth/sign-in/components/staff-login.tsx`

## 17:50 – form.tsx Clean Code Refaktoring

- `form.tsx` to'liq qayta yozildi: `className` string'lar o'rniga `StyleSheet` ishlatildi.
- `TextArea` ga `showSoftInputOnFocus={true}` qo'shildi — keyboard har doim ochiladi.
- `Label`, `FormError`, `FormField`, `TextArea` komponentlari tartibli section'larga ajratildi.
- Keraksiz importlar (`forwardRef` faqat `TextArea` uchun, `Pressable` olib tashlandi) tozalandi.

Qamrab olingan joy:
- `mobile/src/components/ui/form.tsx`
