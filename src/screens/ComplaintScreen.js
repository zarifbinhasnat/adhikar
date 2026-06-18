import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, TextInput, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import ActionButton from '../components/ActionButton';

const DRAFT_KEY = 'complaint_draft';

export default function ComplaintScreen() {
  const { strings } = useLanguage();
  const [issueType, setIssueType] = useState('Service delay');
  const [route, setRoute] = useState('GRS');
  const [details, setDetails] = useState('');

  // Load saved draft on mount
  useEffect(() => {
    (async () => {
      try {
        const draft = await AsyncStorage.getItem(DRAFT_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          setIssueType(parsed.issueType || 'Service delay');
          setRoute(parsed.route || 'GRS');
          setDetails(parsed.details || '');
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const handleSaveDraft = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ issueType, route, details }),
      );
      Alert.alert('✓', strings.draftSaved);
    } catch {
      Alert.alert('Error', 'Could not save draft');
    }
  }, [issueType, route, details, strings]);

  const handleSubmit = () => {
    Alert.alert(strings.submit, 'Complaint submitted (demo mode)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{strings.fileComplaint}</Text>

          {/* Issue Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{strings.issueType}</Text>
            <View style={styles.selector}>
              <Text style={styles.selectorText}>{issueType}</Text>
            </View>
          </View>

          {/* Best Route */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{strings.bestRoute}</Text>
            <View style={[styles.selector, styles.highlightSelector]}>
              <Text style={styles.highlightText}>{route}</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{strings.details}</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder={strings.detailsPlaceholder}
              textAlignVertical="top"
              value={details}
              onChangeText={setDetails}
            />
          </View>

          {/* Attachments */}
          <Text style={styles.label}>{strings.attachments}</Text>
          <View style={styles.attachmentRow}>
            <TouchableOpacity style={styles.attachBtn}>
              <Text style={styles.attachBtnText}>{strings.photo}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn}>
              <Text style={styles.attachBtnText}>{strings.audio}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn}>
              <Text style={styles.attachBtnText}>{strings.note}</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <ActionButton
              label={strings.saveDraft}
              icon={<Feather name="save" size={18} color={COLORS.textMuted} />}
              variant="secondary"
              onPress={handleSaveDraft}
              style={styles.halfBtn}
            />
            <ActionButton
              label={strings.submit}
              icon={<Feather name="send" size={18} color="white" />}
              variant="primary"
              onPress={handleSubmit}
              style={styles.halfBtn}
            />
          </View>
        </View>

        {/* Tracking Cards */}
        <Text style={styles.sectionTitle}>{strings.myTrackingCards}</Text>

        <View style={styles.trackingCard}>
          <View style={styles.trackHeader}>
            <Text style={styles.trackId}>GRS-24-XXXX</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{strings.inReview}</Text>
            </View>
          </View>
          <Text style={styles.trackDesc}>Delay in municipal water connection</Text>
          <View style={styles.trackFooter}>
            <Feather name="activity" size={14} color={COLORS.textLight} />
            <Text style={styles.lastUpdated}>Updated 2 days ago</Text>
          </View>
        </View>

        <View style={styles.trackingCard}>
          <View style={styles.trackHeader}>
            <Text style={styles.trackId}>DNCC-000123</Text>
            <View style={[styles.statusBadge, styles.statusSuccess]}>
              <Text style={[styles.statusText, styles.statusTextSuccess]}>
                {strings.assigned}
              </Text>
            </View>
          </View>
          <Text style={styles.trackDesc}>Waste clearance request - Ward 12</Text>
          <View style={styles.trackFooter}>
            <Feather name="activity" size={14} color={COLORS.textLight} />
            <Text style={styles.lastUpdated}>Officer assigned today</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xxxl,
    ...SHADOWS.md,
  },
  cardTitle: {
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
  },
  inputGroup: { marginBottom: SPACING.lg },
  label: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  selector: {
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorText: { fontSize: FONTS.size.md, color: COLORS.textSecondary },
  highlightSelector: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primaryBorder,
  },
  highlightText: {
    fontSize: FONTS.size.md,
    color: COLORS.accent,
    fontWeight: FONTS.weight.bold,
  },
  textArea: {
    backgroundColor: COLORS.surfaceInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    fontSize: FONTS.size.md,
    minHeight: 100,
  },
  attachmentRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xxl,
  },
  attachBtn: {
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginRight: SPACING.sm,
  },
  attachBtnText: {
    color: COLORS.textMuted,
    fontWeight: FONTS.weight.semibold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfBtn: { flex: 1 },
  sectionTitle: {
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  trackingCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryLight,
    ...SHADOWS.sm,
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  trackId: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    backgroundColor: COLORS.warningSoft,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  statusText: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: COLORS.warningDark,
  },
  statusSuccess: { backgroundColor: COLORS.successBorder },
  statusTextSuccess: { color: '#22543D' },
  trackDesc: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  trackFooter: { flexDirection: 'row', alignItems: 'center' },
  lastUpdated: {
    marginLeft: SPACING.sm,
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
  },
});
