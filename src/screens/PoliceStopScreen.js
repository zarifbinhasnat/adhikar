import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Linking from 'expo-linking';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import ActionButton from '../components/ActionButton';

const EMERGENCY_NUMBER = 'tel:999';

export default function PoliceStopScreen({ navigation }) {
  const { strings, language } = useLanguage();

  const rightsText = [
    strings.rightToKnow,
    strings.rightToLawyer,
    strings.rightToFamily,
  ].join('. ');

  const handleReadAloud = () => {
    const textToRead = language === 'BN'
      ? `${strings.stayCalmMessage}. ${strings.yourRights}: ${rightsText}`
      : `${strings.stayCalmMessage}. ${strings.yourRights}: ${rightsText}`;

    Speech.speak(textToRead, {
      language: language === 'BN' ? 'bn-BD' : 'en-US',
      rate: 0.9,
    });
  };

  const handleCallContact = () => {
    Alert.alert(
      strings.callContact,
      'Call 999 (National Emergency)?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL(EMERGENCY_NUMBER) },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Alert Box */}
        <View style={styles.alertBox}>
          <Text style={styles.alertTitle}>{strings.policeStopTitle}</Text>
          <Text style={styles.alertText}>{strings.stayCalmMessage}</Text>
        </View>

        {/* Suggested Questions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{strings.youMayAsk}</Text>
          <Text style={styles.listItem}>{strings.askArrest}</Text>
          <Text style={styles.listItem}>{strings.askReason}</Text>
        </View>

        {/* Your Rights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{strings.yourRights}</Text>
          <Text style={styles.bulletItem}>• {strings.rightToKnow}</Text>
          <Text style={styles.bulletItem}>• {strings.rightToLawyer}</Text>
          <Text style={styles.bulletItem}>• {strings.rightToFamily}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <ActionButton
            label={strings.readAloud}
            icon={<Feather name="volume-2" size={20} color={COLORS.textMuted} />}
            variant="secondary"
            onPress={handleReadAloud}
            style={styles.halfBtn}
          />
          <ActionButton
            label={strings.callContact}
            icon={<Feather name="phone-call" size={20} color={COLORS.textMuted} />}
            variant="secondary"
            onPress={handleCallContact}
            style={styles.halfBtn}
          />
        </View>

        <ActionButton
          label={strings.startRecording}
          icon={<Feather name="mic" size={24} color="white" />}
          variant="danger"
          onPress={() => navigation.navigate('Record')}
          style={styles.recordBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl },
  alertBox: {
    backgroundColor: COLORS.warningSoft,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    padding: SPACING.lg,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xxl,
  },
  alertTitle: {
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
    color: COLORS.warningDark,
    marginBottom: SPACING.xs,
  },
  alertText: {
    fontSize: FONTS.size.md,
    color: COLORS.warningMid,
  },
  section: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  sectionTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  listItem: {
    fontSize: FONTS.size.md,
    color: COLORS.accent,
    fontWeight: FONTS.weight.medium,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.primarySoft,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  bulletItem: {
    fontSize: FONTS.size.md,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    lineHeight: 24,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  halfBtn: { flex: 1 },
  recordBtn: { borderRadius: RADIUS.md },
});
