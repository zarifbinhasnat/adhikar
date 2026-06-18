import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import RIGHTS_DATA from '../data/rightsData';

export default function RightsListScreen({ navigation }) {
  const { strings, language } = useLanguage();
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? RIGHTS_DATA.filter((r) => {
        const q = query.toLowerCase();
        return (
          r.titleEn.toLowerCase().includes(q) ||
          r.titleBn.includes(q) ||
          r.articleNumber.includes(q)
        );
      })
    : RIGHTS_DATA;

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('RightsDetail', { articleId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.articleBadge}>
          <Text style={styles.articleBadgeText}>Art. {item.articleNumber}</Text>
        </View>
        {item.verified && (
          <Feather name="check-circle" size={16} color={COLORS.success} />
        )}
      </View>
      <Text style={styles.cardTitle}>
        {language === 'EN' ? item.titleEn : item.titleBn}
      </Text>
      <Text style={styles.cardDesc} numberOfLines={2}>
        {language === 'EN' ? item.plainEn : item.plainBn}
      </Text>
      <View style={styles.cardFooter}>
        <Feather name="chevron-right" size={16} color={COLORS.textLight} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Feather name="search" size={18} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder={strings.searchRights}
          placeholderTextColor={COLORS.textLight}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No articles found</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONTS.size.md,
    color: COLORS.textPrimary,
  },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  articleBadge: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  articleBadgeText: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primaryLight,
  },
  cardTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cardDesc: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  cardFooter: { alignItems: 'flex-end', marginTop: SPACING.sm },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textLight,
    marginTop: SPACING.xxxl,
    fontSize: FONTS.size.md,
  },
});
