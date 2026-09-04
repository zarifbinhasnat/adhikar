import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const LEGAL_AID_ORGS = [
  {
    id: 'nhrc',
    name: 'National Human Rights Commission',
    nameBn: 'জাতীয় মানবাধিকার কমিশন',
    desc: 'Investigates human rights complaints and provides recommendations.',
    descBn: 'মানবাধিকার অভিযোগ তদন্ত করে এবং সুপারিশ প্রদান করে।',
    phone: '16108',
    website: 'http://nhrc.org.bd',
    icon: 'shield',
  },
  {
    id: 'blast',
    name: 'BLAST (Legal Aid Trust)',
    nameBn: 'ব্লাস্ট (আইনগত সহায়তা ট্রাস্ট)',
    desc: 'Free legal aid for disadvantaged citizens, public interest litigation.',
    descBn: 'সুবিধাবঞ্চিত নাগরিকদের জন্য বিনামূল্যে আইনি সহায়তা।',
    phone: '+88028391515',
    website: 'https://blast.org.bd',
    icon: 'briefcase',
  },
  {
    id: 'bela',
    name: 'BELA (Environment Lawyers)',
    nameBn: 'বেলা (পরিবেশ আইনজীবী সমিতি)',
    desc: 'Environmental law, climate rights, and natural resource protection.',
    descBn: 'পরিবেশ আইন, জলবায়ু অধিকার এবং প্রাকৃতিক সম্পদ সুরক্ষা।',
    phone: '+88029571671',
    website: 'https://belabangla.org',
    icon: 'globe',
  },
  {
    id: 'dlac',
    name: 'Government Legal Aid (NLASO)',
    nameBn: 'সরকারি আইনগত সহায়তা (জাতীয় আইনগত সহায়তা প্রদান সংস্থা)',
    desc: 'National legal-aid helpline. Free legal aid is given through the legal aid committee in every district.',
    descBn: 'জাতীয় আইনগত সহায়তা হেল্পলাইন। প্রতিটি জেলার আইনগত সহায়তা কমিটির মাধ্যমে বিনামূল্যে আইনি সহায়তা দেওয়া হয়।',
    phone: '16430',
    website: 'http://nlaso.gov.bd',
    icon: 'home',
  },
  {
    id: 'helpline',
    name: 'National Emergency',
    nameBn: 'জাতীয় জরুরি সেবা',
    desc: 'Police, fire, and ambulance services.',
    descBn: 'পুলিশ, অগ্নিনির্বাপণ এবং অ্যাম্বুলেন্স সেবা।',
    phone: '999',
    website: null,
    icon: 'phone',
  },
  {
    id: 'women-children',
    name: 'Violence Against Women & Children Helpline',
    nameBn: 'নারী ও শিশু নির্যাতন প্রতিরোধ হেল্পলাইন',
    desc: 'Toll-free national helpline for women and children facing violence.',
    descBn: 'নির্যাতনের শিকার নারী ও শিশুদের জন্য টোল-ফ্রি জাতীয় হেল্পলাইন।',
    phone: '109',
    website: null,
    icon: 'heart',
  },
  {
    id: 'child-helpline',
    name: 'Child Helpline',
    nameBn: 'চাইল্ড হেল্পলাইন',
    desc: 'Support and protection for children at risk.',
    descBn: 'ঝুঁকিতে থাকা শিশুদের সহায়তা ও সুরক্ষা।',
    phone: '1098',
    website: null,
    icon: 'smile',
  },
  {
    id: 'govt-info',
    name: 'Government Information & Services',
    nameBn: 'সরকারি তথ্য ও সেবা',
    desc: 'National call centre for government information and services.',
    descBn: 'সরকারি তথ্য ও সেবার জাতীয় কল সেন্টার।',
    phone: '333',
    website: null,
    icon: 'info',
  },
];

export default function LegalAidScreen() {
  const { strings, language } = useLanguage();

  const handleCall = (phone) => Linking.openURL(`tel:${phone}`);
  const handleWeb = (url) => Linking.openURL(url);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{strings.legalAidTitle}</Text>
        <Text style={styles.subtitle}>{strings.legalAidDesc}</Text>

        {LEGAL_AID_ORGS.map((org) => (
          <View key={org.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Feather name={org.icon} size={22} color={COLORS.primaryLight} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.orgName}>
                  {language === 'EN' ? org.name : org.nameBn}
                </Text>
                <Text style={styles.orgDesc}>
                  {language === 'EN' ? org.desc : org.descBn}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => handleCall(org.phone)}
              >
                <Feather name="phone" size={16} color="white" />
                <Text style={styles.callBtnText}>{strings.callNow}</Text>
              </TouchableOpacity>

              {org.website && (
                <TouchableOpacity
                  style={styles.webBtn}
                  onPress={() => handleWeb(org.website)}
                >
                  <Feather name="external-link" size={16} color={COLORS.primaryLight} />
                  <Text style={styles.webBtnText}>{strings.visitWebsite}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  cardInfo: { flex: 1 },
  orgName: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  orgDesc: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
  },
  callBtnText: {
    color: 'white',
    fontWeight: FONTS.weight.bold,
    marginLeft: SPACING.sm,
    fontSize: FONTS.size.sm,
  },
  webBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
  },
  webBtnText: {
    color: COLORS.primaryLight,
    fontWeight: FONTS.weight.bold,
    marginLeft: SPACING.sm,
    fontSize: FONTS.size.sm,
  },
});
