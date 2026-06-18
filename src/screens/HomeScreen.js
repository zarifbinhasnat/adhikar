import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  ScrollView, SafeAreaView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import RIGHTS_DATA from '../data/rightsData';

const F = FONTS.family;

const NAV_CARDS = [
  { key: 'policeStop',    iconName: 'shield-checkmark', label: 'Police stop',    route: null },
  { key: 'record',        iconName: 'mic',               label: 'Record',         route: 'Record' },
  { key: 'myRights',      iconName: 'book',              label: 'My rights',      route: 'Rights' },
  { key: 'complain',      iconName: 'document-text',     label: 'Complain',       route: 'Complaint' },
  { key: 'legalAid',      iconName: 'briefcase',         label: 'Legal aid',      route: 'LegalAid' },
  { key: 'rti',           iconName: 'information-circle',label: 'RTI',            route: 'RTI' },
  { key: 'evidenceVault', iconName: 'archive',           label: 'Evidence vault', route: 'EvidenceVault' },
];

export default function HomeScreen({ navigation }) {
  const { language, strings, toggleLanguage } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return RIGHTS_DATA.filter(
      (r) =>
        r.titleEn.toLowerCase().includes(q) ||
        r.titleBn.includes(q) ||
        r.plainEn.toLowerCase().includes(q) ||
        r.articleNumber.includes(q),
    );
  }, [searchQuery]);

  const handleNavPress = (card) => {
    if (card.key === 'policeStop') {
      navigation.navigate('PoliceStop');
    } else if (card.route) {
      navigation.navigate(card.route);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder={strings.searchPlaceholder}
              placeholderTextColor={COLORS.textFaint}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable
            style={({ pressed }) => [styles.langToggle, pressed && { opacity: 0.75 }]}
            onPress={toggleLanguage}
          >
            <Text style={styles.langText}>{language}</Text>
          </Pressable>
        </View>

        {/* ── Search Results ── */}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.searchResultItem,
                  pressed && { backgroundColor: COLORS.surfaceAlt },
                ]}
                onPress={() => {
                  setSearchQuery('');
                  navigation.navigate('RightsDetail', { articleId: item.id });
                }}
              >
                <Ionicons name="document-text-outline" size={16} color={COLORS.textLight} />
                <Text style={styles.searchResultText}>
                  Art. {item.articleNumber} — {language === 'EN' ? item.titleEn : item.titleBn}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Emergency Button ── */}
        <Pressable
          style={({ pressed }) => [
            styles.emergencyBtn,
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
          ]}
          onPress={() => navigation.navigate('PoliceStop')}
        >
          <Ionicons name="shield-checkmark" size={22} color={COLORS.onAccent} />
          <Text style={styles.emergencyText}>{strings.emergencyButton}</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(251,248,243,0.7)" />
        </Pressable>

        {/* ── Section Title ── */}
        <Text style={styles.sectionTitle}>{strings.whatDoYouNeed}</Text>

        {/* ── Action Grid ── */}
        <View style={styles.grid}>
          {NAV_CARDS.map((card) => (
            <Pressable
              key={card.key}
              onPress={() => handleNavPress(card)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              {({ pressed }) => (
                <>
                  <View style={[styles.iconWrap, pressed && styles.iconWrapPressed]}>
                    <Ionicons
                      name={pressed ? card.iconName : `${card.iconName}-outline`}
                      size={22}
                      color={pressed ? COLORS.onAccent : COLORS.textSecondary}
                    />
                  </View>
                  <Text style={styles.cardText}>{strings[card.key] ?? card.label}</Text>
                </>
              )}
            </Pressable>
          ))}
        </View>

        {/* ── Offline Packs ── */}
        <View style={styles.offlineSection}>
          <View style={styles.offlineHeader}>
            <Ionicons name="cloud-offline-outline" size={18} color={COLORS.textLight} />
            <Text style={styles.offlineTitle}>{strings.offlinePacks}</Text>
          </View>
          <View style={styles.offlineItem}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineItemText}>{strings.arrestDetention}</Text>
          </View>
          <View style={styles.offlineItem}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineItemText}>{strings.grsGuide}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Styles ── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingBottom: 40,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    height: 46,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.size.md,
    fontFamily: F.normal,
    color: COLORS.textPrimary,
  },
  langToggle: {
    backgroundColor: COLORS.primary,
    width: 46,
    height: 46,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langText: {
    fontFamily: F.bold,
    color: COLORS.onAccent,
    fontSize: 12,
    letterSpacing: 0.5,
  },

  /* Search Results */
  searchResults: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchResultText: {
    flex: 1,
    fontSize: FONTS.size.sm,
    fontFamily: F.medium,
    color: COLORS.textSecondary,
  },

  /* Emergency */
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.xxl,
    paddingVertical: 18,
    paddingHorizontal: SPACING.xxl,
    marginBottom: SPACING.xxxl,
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  emergencyText: {
    flex: 1,
    color: COLORS.onAccent,
    fontSize: FONTS.size.lg,
    fontFamily: F.semibold,
  },

  /* Section */
  sectionTitle: {
    fontSize: FONTS.size.xl,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    letterSpacing: -0.3,
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.xxxl,
  },
  card: {
    width: '31%',
    backgroundColor: COLORS.surface,
    paddingVertical: 20,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardPressed: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 0.98 }],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  iconWrapPressed: {
    backgroundColor: 'rgba(251,248,243,0.15)',
  },
  cardText: {
    fontSize: 11,
    fontFamily: F.semibold,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  /* Offline Packs */
  offlineSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  offlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  offlineTitle: {
    fontSize: FONTS.size.md,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  offlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  offlineItemText: {
    fontSize: FONTS.size.sm,
    fontFamily: F.normal,
    color: COLORS.textMuted,
  },
});
