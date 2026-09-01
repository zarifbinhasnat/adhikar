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
    descEn: 'Apply in writing, or by e-mail or other electronic means (§8(1)). Give your name and address, a precise description of the information, and how you want to receive it: inspection, copy, notes or another way (§8(2)). Use the authority\'s printed form if it has one; otherwise plain paper is accepted (§8(3)).',
    descBn: 'লিখিতভাবে, অথবা ই-মেইল বা অন্য ইলেকট্রনিক মাধ্যমে আবেদন করুন (ধারা ৮(১))। আপনার নাম-ঠিকানা, চাওয়া তথ্যের নির্ভুল বর্ণনা এবং কীভাবে তথ্য পেতে চান (পরিদর্শন, অনুলিপি, নোট বা অন্য উপায়) উল্লেখ করুন (ধারা ৮(২))। কর্তৃপক্ষের মুদ্রিত ফরম থাকলে সেটি ব্যবহার করুন; না থাকলে সাদা কাগজেও চলবে (ধারা ৮(৩))।',
  },
  {
    titleEn: 'Submit and keep proof',
    titleBn: 'জমা দিন এবং প্রমাণ রাখুন',
    descEn: 'Submit to the Designated Officer. Any fee is set by rules under the Act, so ask the officer for the amount. Keep a copy and the receipt.',
    descBn: 'দায়িত্বপ্রাপ্ত কর্মকর্তার কাছে জমা দিন। কোনো ফি থাকলে তা আইনের অধীন বিধিমালায় নির্ধারিত, তাই কর্মকর্তার কাছে পরিমাণ জেনে নিন। কপি ও রসিদ রাখুন।',
  },
  {
    titleEn: 'Deadlines for the authority',
    titleBn: 'কর্তৃপক্ষের সময়সীমা',
    descEn: 'Information is due within 20 working days (§9(1)), or 30 working days if more than one unit or authority is involved (§9(2)). If it concerns someone\'s life or death, arrest, or release from jail, initial information is due within 24 hours (§9(4)). A refusal must be sent with reasons within 10 working days (§9(3)).',
    descBn: '২০ কার্যদিবসের মধ্যে তথ্য দিতে হবে (ধারা ৯(১)); একাধিক ইউনিট বা কর্তৃপক্ষ জড়িত থাকলে ৩০ কার্যদিবস (ধারা ৯(২))। কারও জীবন-মৃত্যু, গ্রেপ্তার বা কারাগার থেকে মুক্তি সম্পর্কিত হলে ২৪ ঘণ্টার মধ্যে প্রাথমিক তথ্য দিতে হবে (ধারা ৯(৪))। তথ্য দিতে অপারগ হলে ১০ কার্যদিবসের মধ্যে কারণসহ জানাতে হবে (ধারা ৯(৩))।',
  },
  {
    titleEn: 'Appeal, then complain',
    titleBn: 'আপিল, তারপর অভিযোগ',
    descEn: 'If you get no answer in time or disagree with the decision, appeal to the Appeal Authority within 30 days; it must decide within 15 days (§24). If that fails, complain to the Information Commission within 30 days (§25).',
    descBn: 'সময়মতো তথ্য না পেলে বা সিদ্ধান্তে সংক্ষুব্ধ হলে ৩০ দিনের মধ্যে আপিল কর্তৃপক্ষের কাছে আপিল করুন; তাঁকে ১৫ দিনের মধ্যে সিদ্ধান্ত দিতে হবে (ধারা ২৪)। তাতেও সমাধান না হলে ৩০ দিনের মধ্যে তথ্য কমিশনে অভিযোগ করুন (ধারা ২৫)।',
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
2. [Any detail that helps locate the information]

I wish to receive the information by: [inspection / copy / taking notes / other]

I am willing to pay the prescribed fee.

Applicant Details:
Name: [Your Name]
Address: [Your Address]
Contact: [Your Phone Number]
E-mail: [if any]

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
