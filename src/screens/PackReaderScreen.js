import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { readPack, exportPack } from '../services/packService';

export default function PackReaderScreen({ route }) {
  const { strings, language } = useLanguage();
  const { packId } = route.params;
  const [pack, setPack] = useState(null);
  const [actIndex, setActIndex] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    readPack(packId).then(setPack);
  }, [packId]);

  const act = pack?.acts[actIndex];
  const sections = useMemo(() => {
    if (!act) return [];
    const q = query.trim().toLowerCase();
    if (!q) return act.sections;
    return act.sections.filter((s) =>
      `${s.section_label} ${s.title} ${s.text}`.toLowerCase().includes(q));
  }, [act, query]);

  if (!pack) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const snapshot = act.snapshot.startsWith('wayback:')
    ? `${act.snapshot.slice(8, 12)}-${act.snapshot.slice(12, 14)}-${act.snapshot.slice(14, 16)}`
    : act.snapshot;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(s) => `${act.key}-${s.section_label}`}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={(
          <View>
            <View style={styles.headRow}>
              <Text style={styles.title}>{language === 'BN' ? pack.title_bn : pack.title_en}</Text>
              <Pressable
                style={styles.exportBtn}
                onPress={() => exportPack(packId).catch((e) => Alert.alert(strings.exportText, e.message))}
              >
                <Feather name="share" size={16} color={COLORS.primary} />
              </Pressable>
            </View>

            {pack.acts.length > 1 && (
              <View style={styles.chips}>
                {pack.acts.map((a, i) => (
                  <Pressable
                    key={a.key}
                    onPress={() => setActIndex(i)}
                    style={[styles.chip, i === actIndex && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, i === actIndex && styles.chipTextActive]} numberOfLines={1}>
                      {a.name} · {a.lang.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.source}>
              {strings.sourceLabel}: {act.source_url.replace('https://', '')} · {snapshot}
            </Text>

            <View style={styles.searchBox}>
              <Feather name="search" size={16} color={COLORS.textLight} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={strings.searchSections}
                placeholderTextColor={COLORS.textFaint}
              />
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.section}>
            <Text style={styles.label}>
              {act.lang === 'bn' ? 'ধারা/অনুচ্ছেদ' : 'Section'} {item.section_label}
              {item.repealed ? '  ·  REPEALED' : ''}
            </Text>
            {!!item.title && <Text style={styles.sectionTitle}>{item.title}</Text>}
            <Text style={styles.body} selectable>{item.text}</Text>
            {(item.amendments || []).map((note) => (
              <Text key={note} style={styles.note}>{note}</Text>
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.xl, paddingBottom: 48 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.md },
  title: { flex: 1, fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.bold, color: COLORS.textPrimary },
  exportBtn: {
    width: 38, height: 38, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.primaryBorder,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  chip: {
    maxWidth: '100%', borderRadius: RADIUS.pill, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: FONTS.size.xs, color: COLORS.textSecondary, fontWeight: FONTS.weight.medium },
  chipTextActive: { color: COLORS.onAccent },
  source: { fontSize: FONTS.size.xs, color: COLORS.textLight, marginBottom: SPACING.md },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surfaceInput,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  searchInput: { flex: 1, paddingVertical: SPACING.md, fontSize: FONTS.size.md, color: COLORS.textPrimary },
  section: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.lg,
    marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  label: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold, color: COLORS.accentHover, marginBottom: 2 },
  sectionTitle: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  body: { fontSize: FONTS.size.md, color: COLORS.textSecondary, lineHeight: 24 },
  note: { fontSize: FONTS.size.xs, color: COLORS.textLight, fontStyle: 'italic', marginTop: SPACING.sm },
});
