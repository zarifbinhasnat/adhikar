import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import RIGHTS_DATA from '../data/rightsData';
import ActionButton from '../components/ActionButton';

const TABS = ['sourceText', 'bangla', 'english'];

export default function RightsLibraryScreen({ route }) {
  const { strings, language } = useLanguage();
  const articleId = route?.params?.articleId || 'art33';
  const article = RIGHTS_DATA.find((r) => r.id === articleId) || RIGHTS_DATA[3];
  const [activeTab, setActiveTab] = useState('sourceText');

  const getTabContent = () => {
    switch (activeTab) {
      case 'bangla':
        return article.sourceBn;
      case 'english':
        return article.sourceEn;
      default:
        return language === 'BN' ? article.sourceBn : article.sourceEn;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.articleTitle}>
            {language === 'EN' ? `Article ${article.articleNumber}` : `অনুচ্ছেদ ${article.articleNumber}`}
          </Text>
          <Text style={styles.articleSubtitle}>
            {language === 'EN' ? article.titleEn : article.titleBn}
          </Text>
        </View>

        {/* Plain Language Card */}
        <View style={styles.plainCard}>
          <Text style={styles.sectionHeader}>{strings.plainLanguage}</Text>
          <Text style={styles.plainText}>
            {language === 'EN' ? article.plainEn : article.plainBn}
          </Text>
        </View>

        {/* Source Tabs */}
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {strings[tab]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Source Content */}
        <View style={styles.sourceContent}>
          <Text style={styles.sourceText}>{getTabContent()}</Text>
        </View>

        {/* Verification Badge */}
        {article.verified && (
          <View style={styles.verificationBadge}>
            <Feather name="check-circle" size={16} color={COLORS.success} />
            <Text style={styles.verificationText}>{strings.verifiedAgainst}</Text>
          </View>
        )}

        <Text style={styles.lastVerified}>
          {strings.lastVerified}: {article.lastVerified}
        </Text>

        {/* Actions */}
        <View style={styles.actionRow}>
          <ActionButton
            label={strings.copy}
            icon={<Feather name="copy" size={18} color={COLORS.textMuted} />}
            variant="secondary"
            style={styles.actionBtn}
          />
          <ActionButton
            label={strings.save}
            icon={<Feather name="bookmark" size={18} color={COLORS.textMuted} />}
            variant="secondary"
            style={styles.actionBtn}
          />
          <ActionButton
            label={strings.share}
            icon={<Feather name="share-2" size={18} color={COLORS.textMuted} />}
            variant="secondary"
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl },
  header: { marginBottom: SPACING.xl },
  articleTitle: {
    fontSize: FONTS.size.title,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
  },
  articleSubtitle: {
    fontSize: FONTS.size.lg,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  plainCard: {
    backgroundColor: COLORS.primarySoft,
    padding: SPACING.xl,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  sectionHeader: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.accent,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  plainText: {
    fontSize: FONTS.size.lg,
    color: COLORS.accentSoft,
    lineHeight: 28,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginRight: SPACING.sm,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryLight,
  },
  tabText: {
    fontSize: FONTS.size.md,
    color: COLORS.textLight,
    fontWeight: FONTS.weight.semibold,
  },
  activeTabText: { color: COLORS.primaryLight },
  sourceContent: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  sourceText: {
    fontSize: FONTS.size.md,
    color: COLORS.textMuted,
    lineHeight: 24,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successSoft,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  verificationText: {
    marginLeft: SPACING.sm,
    color: COLORS.successDark,
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
  },
  lastVerified: {
    fontSize: FONTS.size.xs,
    color: COLORS.textFaint,
    marginBottom: SPACING.xxl,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionBtn: { flex: 1, paddingVertical: SPACING.md },
});
