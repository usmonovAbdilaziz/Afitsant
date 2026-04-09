import type { BusinessListItem, TableListItem } from '@/api/businessApi';
import { getToken } from '@/components/storage/token';
import { getUserInfo } from '@/components/storage/userInfo';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetAllBusiness, useGetAllTables } from '@/hooks/business';
import QrScanner from '@/lib/QrScanner';
import { useQr } from '@/providers/qr-camera';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type StoredUserInfo = {
  role?: string | null;
  userType?: string | null;
  type?: string | null;
};

function formatDisplayLabel(value?: string | null) {
  if (!value) {
    return '';
  }

  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getTableColumnsLabel(table: TableListItem) {
  if (typeof table.tableColumns === 'number') {
    return `${table.tableColumns} ta ustun`;
  }

  return 'Layout tayyor';
}

export default function GlobalHomePage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [selectedTableId, setSelectedTableId] = useState('');
  const businessQuery = useGetAllBusiness();
  const tableQuery = useGetAllTables(selectedBusinessId);
  const { open, setOpen } = useQr();

  const businesses = businessQuery.data ?? [];
  const tables = tableQuery.data ?? [];

  const selectedBusiness = useMemo(
    () => businesses.find((item) => item.id === selectedBusinessId),
    [businesses, selectedBusinessId],
  );
  const selectedTable = useMemo(
    () => tables.find((item) => item.id === selectedTableId),
    [tables, selectedTableId],
  );

  useEffect(() => {
    if (businesses.length === 0) {
      if (selectedBusinessId) {
        setSelectedBusinessId('');
      }
      return;
    }

    const hasSelectedBusiness = businesses.some(
      (item) => item.id === selectedBusinessId,
    );

    if (!hasSelectedBusiness) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  useEffect(() => {
    setSelectedTableId('');
  }, [selectedBusinessId]);

  useEffect(() => {
    if (tables.length === 0) {
      if (selectedTableId) {
        setSelectedTableId('');
      }
      return;
    }

    const hasSelectedTable = tables.some((item) => item.id === selectedTableId);

    if (!hasSelectedTable) {
      setSelectedTableId(tables[0].id);
    }
  }, [selectedTableId, tables]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const checkAuth = async () => {
        const [token, userInfo] = await Promise.all([
          getToken(),
          getUserInfo(),
        ]);
        const resolvedRole =
          userInfo && typeof userInfo === 'object'
            ? String(
                (userInfo as StoredUserInfo).role ??
                  (userInfo as StoredUserInfo).userType ??
                  (userInfo as StoredUserInfo).type ??
                  '',
              ).trim()
            : '';

        if (!token || !resolvedRole) {
          if (isMounted) {
            router.replace('/auth/sign-in/login');
          }
          return;
        }

        if (isMounted) {
          setCheckingAuth(false);
        }
      };

      setCheckingAuth(true);
      void checkAuth();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  if (checkingAuth) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 mb-20">
      <Modal visible={!!open} animationType="slide">
        <QrScanner
          onScan={(value: unknown) => {
            console.log('SCAN RESULT:', value);
            setOpen(false);
          }}
        />
      </Modal>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.selectionCard}>
          <View style={styles.selectionHeader}>
            <View style={[styles.selectionBadge, styles.businessBadge]}>
              <Ionicons name="business-outline" size={18} color="#0369a1" />
            </View>

            <View style={styles.selectionHeaderContent}>
              <Text style={styles.selectionEyebrow}>Business</Text>
              <Text style={styles.selectionTitle}>
                {selectedBusiness?.businessName ?? 'Businessni tanlang'}
              </Text>
              <Text style={styles.selectionSubtitle}>
                {selectedBusiness
                  ? `${formatDisplayLabel(selectedBusiness.businessType)} | ${selectedBusiness.city}`
                  : 'QR jarayoni uchun kerakli businessni tanlang'}
              </Text>
            </View>
          </View>

          {businessQuery.isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="small" color="#0284c7" />
              <Text style={styles.stateText}>Businesslar yuklanmoqda...</Text>
            </View>
          ) : businessQuery.isError ? (
            <View style={[styles.stateBox, styles.errorBox]}>
              <Text style={styles.errorTitle}>
                Businesslarni yuklab bo&apos;lmadi
              </Text>
              <Text style={styles.errorText}>
                Tarmoqni tekshirib qayta urinib ko&apos;ring.
              </Text>
            </View>
          ) : businesses.length > 0 ? (
            <>
              <Select
                value={selectedBusinessId}
                onValueChange={setSelectedBusinessId}
              >
                <SelectTrigger style={styles.selectionTrigger}>
                  <SelectValue placeholder="Business tanlang" />
                </SelectTrigger>

                <SelectContent title="Businessni tanlang">
                  <SelectGroup>
                    <SelectLabel>Available Businesses</SelectLabel>
                    {businesses.map((item: BusinessListItem) => (
                      <SelectItem
                        key={item.id}
                        label={item.businessName}
                        value={item.id}
                      >
                        {`${item.businessName} | ${item.city}`}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {selectedBusiness ? (
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailTitle}>
                      {selectedBusiness.businessName}
                    </Text>
                    <View style={[styles.detailPill, styles.businessPill]}>
                      <Text style={styles.detailPillText}>
                        {formatDisplayLabel(selectedBusiness.businessType)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.detailBodyText}>
                    {selectedBusiness.city}
                  </Text>
                  <Text style={styles.detailBodyText}>
                    {selectedBusiness.address}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.stateBox}>
              <Text style={styles.emptyTitle}>Business topilmadi</Text>
              <Text style={styles.stateText}>
                Hozircha birorta business mavjud emas.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.selectionCard}>
          <View style={styles.selectionHeader}>
            <View style={[styles.selectionBadge, styles.tableBadge]}>
              <Ionicons name="grid-outline" size={18} color="#92400e" />
            </View>

            <View style={styles.selectionHeaderContent}>
              <Text style={styles.selectionEyebrow}>
                Uz Stolingizni tanlang
              </Text>
              <Text style={styles.selectionTitle}>
                {selectedTable
                  ? `Table ${selectedTable.tableNumber}`
                  : 'Tableni tanlang'}
              </Text>
              <Text style={styles.selectionSubtitle}>
                {selectedTable
                  ? `${formatDisplayLabel(selectedTable.status)} | ${getTableColumnsLabel(selectedTable)}`
                  : selectedBusiness
                    ? 'Tanlangan business ichidagi stolni tanlang'
                    : 'Avval business tanlang'}
              </Text>
            </View>
          </View>

          {!selectedBusiness ? (
            <View style={styles.stateBox}>
              <Text style={styles.emptyTitle}>Business kerak</Text>
              <Text style={styles.stateText}>
                Table ro&apos;yxatini ko&apos;rish uchun avval business tanlang.
              </Text>
            </View>
          ) : tableQuery.isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="small" color="#d97706" />
              <Text style={styles.stateText}>Stollar yuklanmoqda...</Text>
            </View>
          ) : tableQuery.isError ? (
            <View style={[styles.stateBox, styles.errorBox]}>
              <Text style={styles.errorTitle}>
                Stollarni yuklab bo&apos;lmadi
              </Text>
              <Text style={styles.errorText}>
                Tanlangan business uchun table ro&apos;yxatini qayta tekshiring.
              </Text>
            </View>
          ) : tables?.length > 0 ? (
            <>
              <Select
                value={selectedTableId}
                onValueChange={setSelectedTableId}
              >
                <SelectTrigger style={styles.selectionTrigger}>
                  <SelectValue placeholder="Table tanlang" />
                </SelectTrigger>

                <SelectContent title="Tableni tanlang">
                  <SelectGroup>
                    <SelectLabel>Available Tables</SelectLabel>
                    {tables.map((item: TableListItem) => (
                      <SelectItem
                        key={item.id}
                        label={`Table ${item.tableNumber}/${item.tableColumns}`}
                        value={item.id}
                      >
                        {`Table ${item.tableNumber}/${item.tableColumns} | ${formatDisplayLabel(item.status)}`}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {selectedTable ? (
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailTitle}>
                      Table {selectedTable.tableNumber}
                    </Text>
                    <View style={[styles.detailPill, styles.tablePill]}>
                      <Text style={styles.detailPillText}>
                        {formatDisplayLabel(selectedTable.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.detailBodyText}>
                    {selectedBusiness.businessName} ichida faol stol
                  </Text>
                  <Text style={styles.detailBodyText}>
                    {getTableColumnsLabel(selectedTable)}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.stateBox}>
              <Text style={styles.emptyTitle}>Table topilmadi</Text>
              <Text style={styles.stateText}>
                {selectedBusiness.businessName} uchun hozircha stol mavjud emas.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.qrPanel}>
          <View style={styles.qrGlow} />

          <View style={styles.qrBadge}>
            <Ionicons name="scan-circle-outline" size={16} color="#0f172a" />
            <Text style={styles.qrBadgeText}>Quick Access</Text>
          </View>

          <Text style={styles.qrTitle}>
            QR orqali bookingni bir zumda oching
          </Text>
          <Text style={styles.qrDescription}>
            Mijoz yoki xizmat kodini skaner qilib jarayonni tez boshlang.
          </Text>

          <Pressable
            onPress={() => setOpen(true)}
            style={({ pressed }) => [
              styles.qrAction,
              pressed ? styles.qrActionPressed : null,
            ]}
          >
            <View style={styles.qrActionIcon}>
              <Ionicons name="qr-code-outline" size={24} color="#e0f2fe" />
            </View>

            <View style={styles.qrActionContent}>
              <Text style={styles.qrActionTitle}>Open QR Scanner</Text>
              <Text style={styles.qrActionSubtitle}>
                Kamera bilan scan qilish
              </Text>
            </View>

            <View style={styles.qrActionArrow}>
              <Ionicons name="arrow-forward" size={18} color="#082f49" />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  businessBadge: {
    backgroundColor: '#e0f2fe',
  },
  businessPill: {
    backgroundColor: '#e0f2fe',
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 36,
  },
  detailBodyText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  detailCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  detailPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detailPillText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  detailTitle: {
    color: '#0f172a',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fff1f2',
  },
  errorText: {
    color: '#9f1239',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  errorTitle: {
    color: '#881337',
    fontSize: 14,
    fontWeight: '700',
  },
  qrAction: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 22,
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  qrActionArrow: {
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  qrActionContent: {
    flex: 1,
    marginLeft: 14,
  },
  qrActionIcon: {
    alignItems: 'center',
    backgroundColor: '#0369a1',
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  qrActionPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  qrActionSubtitle: {
    color: '#bae6fd',
    fontSize: 13,
    marginTop: 4,
  },
  qrActionTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  qrBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  qrBadgeText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  qrDescription: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  qrGlow: {
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    height: 130,
    position: 'absolute',
    right: -20,
    top: -30,
    width: 130,
  },
  qrPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#dbeafe',
    borderRadius: 28,
    borderWidth: 1,
    elevation: 8,
    marginTop: 28,
    overflow: 'hidden',
    padding: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
  },
  qrTitle: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    marginTop: 16,
  },
  selectionBadge: {
    alignItems: 'center',
    borderRadius: 18,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  selectionCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 28,
    borderWidth: 1,
    elevation: 4,
    marginTop: 22,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  selectionEyebrow: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  selectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  selectionHeaderContent: {
    flex: 1,
    marginLeft: 14,
  },
  selectionSubtitle: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  selectionTitle: {
    color: '#0f172a',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 4,
  },
  selectionTrigger: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    marginTop: 18,
    minHeight: 58,
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    marginTop: 18,
    minHeight: 86,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  stateText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  tableBadge: {
    backgroundColor: '#fef3c7',
  },
  tablePill: {
    backgroundColor: '#fef3c7',
  },
});
