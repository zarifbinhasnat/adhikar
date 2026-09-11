import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import {
  fetchCatalog, getInstalled, downloadPack, removePack, verifyInstalledPack, exportPack,
} from '../services/packService';

export default function OfflinePacksScreen({ navigation }) {
  const { strings, language } = useLanguage();
  const bn = language === 'BN';
  const [catalog, setCatalog] = useState(null);
  const [hubOnline, setHubOnline] = useState(null);
  const [installed, setInstalled] = useState({});
  const [busy, setBusy] = useState({});
  const [checks, setChecks] = useState({});

  const load = useCallback(async () => {
    const local = await getInstalled();
    setInstalled(local);
    const results = await Promise.all(
      Object.keys(local).map(async (id) => [id, await verifyInstalledPack(id)]),
    );
    setChecks(Object.fromEntries(results));
    try {
      setCatalog(await fetchCatalog());
      setHubOnline(true);
    } catch {
      setHubOnline(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const withBusy = async (id, fn) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await fn();
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const handleDownload = (meta) => withBusy(meta.id, async () => {
    try {
      setInstalled(await downloadPack(meta));
      setChecks((c) => ({ ...c, [meta.id]: true }));
    } catch (e) {
      Alert.alert(strings.downloadFailed, e.message);
    }
  });

  const handleRemove = (id) => withBusy(id, async () => setInstalled(await removePack(id)));

  const handleExport = (id) => withBusy(id, async () => {
    try {
      await exportPack(id);
    } catch (e) {
      Alert.alert(strings.exportText, e.message);
    }
  });

  // Hub catalogue first; packs only on the phone are still listed when the hub is unreachable.
  const packs = [
    ...(catalog || []),
    ...Object.values(installed).filter((p) => !(catalog || []).some((c) => c.id === p.id)),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{strings.packsTitle}</Text>
        <Text style={styles.subtitle}>{strings.packsDesc}</Text>

        <View style={[styles.hubBadge, hubOnline === false && styles.hubBadgeOff]}>
          {hubOnline === null ? (
            <ActivityIndicator size="small" color={COLORS.textLight} />
          ) : (
            <Feather
              name={hubOnline ? 'wifi' : 'wifi-off'}
              size={14}
              color={hubOnline ? COLORS.successDark : COLORS.warningDark}
            />
          )}
          <Text style={[styles.hubText, hubOnline === false && styles.hubTextOff]}>
            {hubOnline === false ? strings.hubOffline : strings.hubOnline}
          </Text>
        </View>

        {packs.length === 0 && hubOnline === false && (
          <Text style={styles.empty}>{strings.noPacks}</Text>
        )}

        {packs.map((pack) => {
          const local = installed[pack.id];
          const remote = (catalog || []).find((c) => c.id === pack.id);
          const outdated = local && remote && local.sha256 !== remote.sha256;
          return (
            <View key={pack.id} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.iconWrap}>
                  <Feather name="book-open" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{bn ? pack.title_bn : pack.title_en}</Text>
                  <Text style={styles.meta}>
                    {pack.sections} {strings.sectionsCount} · {Math.round(pack.bytes / 1024)} KB
                  </Text>
                </View>
              </View>
              <Text style={styles.desc}>{bn ? pack.desc_bn : pack.desc_en}</Text>

              {local && (
                <View style={styles.statusRow}>
                  <Feather
                    name={checks[pack.id] ? 'check-circle' : 'alert-triangle'}
                    size={13}
                    color={checks[pack.id] ? COLORS.success : COLORS.danger}
                  />
                  <Text style={[styles.status, !checks[pack.id] && { color: COLORS.danger }]}>
                    {strings.installed} · {checks[pack.id] ? strings.checksumOk : strings.checksumFailed}
                  </Text>
                </View>
              )}

              <View style={styles.actions}>
                {busy[pack.id] ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <>
                    {local && (
                      <Pressable
                        style={styles.primaryBtn}
                        onPress={() => navigation.navigate('PackReader', { packId: pack.id })}
                      >
                        <Text style={styles.primaryBtnText}>{strings.open}</Text>
                      </Pressable>
                    )}
                    {remote && (!local || outdated || !checks[pack.id]) && (
                      <Pressable
                        style={local ? styles.secondaryBtn : styles.primaryBtn}
                        onPress={() => handleDownload(remote)}
                      >
                        <Feather name="download" size={14} color={local ? COLORS.primary : COLORS.onAccent} />
                        <Text style={local ? styles.secondaryBtnText : styles.primaryBtnText}>
                          {local ? strings.updatePack : strings.download}
                        </Text>
                      </Pressable>
                    )}
                    {local && (
                      <>
                        <Pressable style={styles.secondaryBtn} onPress={() => handleExport(pack.id)}>
                          <Feather name="share" size={14} color={COLORS.primary} />
                          <Text style={styles.secondaryBtnText}>{strings.exportText}</Text>
                        </Pressable>
                        <Pressable style={styles.ghostBtn} onPress={() => handleRemove(pack.id)}>
                          <Text style={styles.ghostBtnText}>{strings.remove}</Text>
                        </Pressable>
                      </>
                    )}
                  </>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: 48 },
  title: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONTS.size.md, color: COLORS.textMuted, lineHeight: 22, marginBottom: SPACING.lg },
  hubBadge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, alignSelf: 'flex-start',
    backgroundColor: COLORS.successSoft, borderRadius: RADIUS.pill,
    paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md, marginBottom: SPACING.xl,
  },
  hubBadgeOff: { backgroundColor: COLORS.warningSoft },
  hubText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.semibold, color: COLORS.successDark },
  hubTextOff: { color: COLORS.warningDark },
  empty: { fontSize: FONTS.size.md, color: COLORS.textLight, textAlign: 'center', marginTop: SPACING.xxl },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.lg,
    marginBottom: SPACING.lg, ...SHADOWS.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  iconWrap: {
    width: 38, height: 38, borderRadius: RADIUS.sm, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold, color: COLORS.textPrimary },
  meta: { fontSize: FONTS.size.xs, color: COLORS.textLight, marginTop: 2 },
  desc: { fontSize: FONTS.size.sm, color: COLORS.textMuted, lineHeight: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.sm },
  status: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold, color: COLORS.success },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg,
  },
  primaryBtnText: { color: COLORS.onAccent, fontWeight: FONTS.weight.semibold, fontSize: FONTS.size.sm },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.pill, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: COLORS.surface,
  },
  secondaryBtnText: { color: COLORS.primary, fontWeight: FONTS.weight.semibold, fontSize: FONTS.size.sm },
  ghostBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm },
  ghostBtnText: { color: COLORS.textLight, fontSize: FONTS.size.sm, fontWeight: FONTS.weight.medium },
});
