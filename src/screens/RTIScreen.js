import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const RTI_STEPS = [
  {
    titleEn: 'Identify the authority',
    titleBn: 'কর্তৃপক্ষ চিহ্নিত করুন',
    descEn: 'Determine which government office holds the information you need. Every public authority must have a Designated Officer (DO).',
    descBn: 'আপনার প্রয়োজনীয় তথ্য কোন সরকারি অফিসে আছে তা নির্ধারণ করুন। প্রতিটি সরকারি কর্তৃপক্ষে একজন দায়িত্বপ্রাপ্ত কর্মকর্তা (DO) থাকতে হবে।',
  },
  {
    titleEn: 'Write your application',
    titleBn: 'আবেদন লিখুন',
    descEn: 'Write a clear application in Bangla or English specifying exactly what information you want. Use the template below.',
    descBn: 'বাংলা বা ইংরেজিতে একটি স্পষ্ট আবেদন লিখুন যেখানে আপনি ঠিক কী তথ্য চান তা উল্লেখ করুন। নিচের টেমপ্লেট ব্যবহার করুন।',
  },
  {
    titleEn: 'Submit and pay fee',
    titleBn: 'জমা দিন এবং ফি প্রদান করুন',
    descEn: 'Submit your application to the Designated Officer. The fee is nominal (typically BDT 5). Keep a copy and receipt.',
    descBn: 'দায়িত্বপ্রাপ্ত কর্মকর্তার কাছে আবেদন জমা দিন। ফি সাধারণত ৫ টাকা। কপি ও রসিদ রাখুন।',
  },
  {
    titleEn: 'Wait for response',
    titleBn: 'উত্তরের জন্য অপেক্ষা করুন',
    descEn: 'The authority must respond within 20 working days (30 days if multiple authorities involved). If refused, you can appeal.',
    descBn: 'কর্তৃপক্ষকে ২০ কার্যদিবসের মধ্যে উত্তর দিতে হবে। প্রত্যাখ্যাত হলে আপিল করতে পারবেন।',
  },
  {
    titleEn: 'Appeal if needed',
    titleBn: 'প্রয়োজনে আপিল করুন',
    descEn: 'If denied, appeal to the Appeal Authority within the same office. If still denied, complain to the Information Commission.',
    descBn: 'প্রত্যাখ্যাত হলে একই অফিসের আপিল কর্তৃপক্ষের কাছে আপিল করুন। তারপরও প্রত্যাখ্যাত হলে তথ্য কমিশনে অভিযোগ করুন।',
  },
];

const RTI_TEMPLATE = `To
The Designated Officer
[Name of the Public Authority]
[Address]

Subject: Application for Information under the Right to Information Act, 2009

Dear Sir/Madam,

Under Section 8 of the Right to Information Act, 2009, I am requesting the following information:

1. [Describe the information you need clearly]
2. [Additional information if any]

I am willing to pay the prescribed fee.

Applicant Details:
Name: [Your Name]
Address: [Your Address]
Contact: [Your Phone Number]

Date: [Date]
Signature: ___________`;

export default function RTIScreen() {
  const { strings, language } = useLanguage();

  const handleCopyTemplate = async () => {
    try {
      await Clipboard.setStringAsync(RTI_TEMPLATE);
      Alert.alert('✓', strings.templateCopied);
    } catch {
      Alert.alert('Error', 'Could not copy template');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{strings.rtiTitle}</Text>
        <Text style={styles.subtitle}>{strings.rtiDesc}</Text>

        {/* Steps */}
        {RTI_STEPS.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                {language === 'EN' ? step.titleEn : step.titleBn}
              </Text>
              <Text style={styles.stepDesc}>
                {language === 'EN' ? step.descEn : step.descBn}
              </Text>
            </View>
          </View>
        ))}

        {/* Template */}
        <View style={styles.templateSection}>
          <Text style={styles.templateTitle}>{strings.rtiTemplate}</Text>
          <View style={styles.templateBox}>
            <Text style={styles.templateText}>{RTI_TEMPLATE}</Text>
          </View>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyTemplate}>
            <Feather name="copy" size={18} color="white" />
            <Text style={styles.copyBtnText}>{strings.copyTemplate}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl },
  title: {
    fontSize: FONTS.size.title,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.size.md,
    color: COLORS.textMuted,
    marginBottom: SPACING.xxl,
    lineHeight: 22,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  stepNumber: {
    color: 'white',
    fontWeight: FONTS.weight.bold,
    fontSize: FONTS.size.md,
  },
  stepContent: { flex: 1 },
  stepTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  stepDesc: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  templateSection: { marginTop: SPACING.lg },
  templateTitle: {
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  templateBox: {
    backgroundColor: COLORS.surfaceInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  templateText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  copyBtnText: {
    color: 'white',
    fontWeight: FONTS.weight.bold,
    marginLeft: SPACING.sm,
    fontSize: FONTS.size.md,
  },
});
