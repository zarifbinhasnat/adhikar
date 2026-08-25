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

// Checked against the CrPC as amended by Act XI of 2026 and the Constitution (bdlaws text).
const ARREST_RIGHTS = [
  {
    en: 'The officer must wear a clear name badge and, if you ask, show their identity card.',
    bn: 'গ্রেপ্তারকারী কর্মকর্তাকে স্পষ্ট নামফলক পরতে হবে এবং আপনি চাইলে পরিচয়পত্র দেখাতে হবে।',
    cite: 'CrPC §46A(a)–(b)',
  },
  {
    en: 'You must be told why you are being arrested.',
    bn: 'কেন গ্রেপ্তার করা হচ্ছে তা আপনাকে জানাতে হবে।',
    cite: 'CrPC §54A · Const. Art. 33(1)',
  },
  {
    en: 'You may consult, and be defended by, a lawyer of your choice.',
    bn: 'আপনার পছন্দের আইনজীবীর সাথে পরামর্শ করার এবং তাঁর মাধ্যমে আত্মপক্ষ সমর্থনের অধিকার আছে।',
    cite: 'Const. Art. 33(1)',
  },
  {
    en: 'You must be taken before a magistrate within 24 hours (travel time excluded). Longer custody needs a magistrate\'s order.',
    bn: '২৪ ঘণ্টার মধ্যে (যাতায়াতের সময় বাদে) ম্যাজিস্ট্রেটের সামনে হাজির করতে হবে। এর বেশি আটক রাখতে ম্যাজিস্ট্রেটের আদেশ লাগবে।',
    cite: 'Const. Art. 33(2) · CrPC §61',
  },
  {
    en: 'If arrested away from home, a family member, relative or friend you name must be told when and where you were arrested and where you are held, within 24 hours.',
    bn: 'বাড়ির বাইরে গ্রেপ্তার হলে ২৪ ঘণ্টার মধ্যে আপনার মনোনীত পরিবারের সদস্য, আত্মীয় বা বন্ধুকে গ্রেপ্তারের সময়, স্থান ও আটক রাখার জায়গা জানাতে হবে।',
    cite: 'CrPC §46A(d)',
  },
  {
    en: 'A memorandum of arrest must be prepared, witnessed by a family member or local resident. You may sign it.',
    bn: 'গ্রেপ্তারের একটি স্মারক তৈরি করতে হবে, যাতে পরিবারের সদস্য বা এলাকার একজন সম্মানিত বাসিন্দা সাক্ষী থাকবেন। আপনি তাতে স্বাক্ষর করতে পারেন।',
    cite: 'CrPC §46A(c)',
  },
  {
    en: 'If you are sick or injured, a doctor must examine you and give first aid. A woman is examined by or in the presence of a female doctor, nurse or attendant where practicable.',
    bn: 'অসুস্থ বা আহত হলে চিকিৎসককে পরীক্ষা করে প্রাথমিক চিকিৎসা দিতে হবে। নারীর ক্ষেত্রে সম্ভব হলে নারী চিকিৎসক, নার্স বা পরিচারিকার উপস্থিতিতে পরীক্ষা হবে।',
    cite: 'CrPC §46E',
  },
  {
    en: 'You cannot be forced to be a witness against yourself.',
    bn: 'নিজের বিরুদ্ধে সাক্ষ্য দিতে আপনাকে বাধ্য করা যাবে না।',
    cite: 'Const. Art. 35(4)',
  },
  {
    en: 'No one may torture you or treat you in a cruel, inhuman or degrading way.',
    bn: 'আপনাকে নির্যাতন বা নিষ্ঠুর, অমানুষিক বা লাঞ্ছনাকর আচরণ করা যাবে না।',
    cite: 'Const. Art. 35(5) · Torture & Custodial Death Act 2013',
  },
];

const PREVENTIVE_DETENTION_NOTE = {
  en: 'Exception: the 24-hour and lawyer safeguards in Art. 33(1)–(2) do not apply to a person held under a preventive-detention law (Art. 33(3)).',
  bn: 'ব্যতিক্রম: নিবর্তনমূলক আটক আইনে আটক ব্যক্তির ক্ষেত্রে অনুচ্ছেদ ৩৩(১)–(২)-এর ২৪ ঘণ্টা ও আইনজীবী-সংক্রান্ত রক্ষাকবচ প্রযোজ্য নয় (অনুচ্ছেদ ৩৩(৩))।',
};

export default function PoliceStopScreen({ navigation }) {
  const { strings, language } = useLanguage();
  const lang = language === 'BN' ? 'bn' : 'en';

  const rightsText = ARREST_RIGHTS.map((r) => r[lang]).join(' ');

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
          {ARREST_RIGHTS.map((right) => (
            <View key={right.cite} style={styles.rightRow}>
              <Text style={styles.bulletItem}>• {right[lang]}</Text>
              <Text style={styles.citeText}>{right.cite}</Text>
            </View>
          ))}
          <Text style={styles.noteText}>{PREVENTIVE_DETENTION_NOTE[lang]}</Text>
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
  rightRow: { marginBottom: SPACING.md },
  bulletItem: {
    fontSize: FONTS.size.md,
    color: COLORS.textMuted,
    lineHeight: 24,
  },
  citeText: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.accentHover,
    marginTop: 2,
    marginLeft: SPACING.md,
  },
  noteText: {
    fontSize: FONTS.size.sm,
    color: COLORS.warningDark,
    backgroundColor: COLORS.warningSoft,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    lineHeight: 20,
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
