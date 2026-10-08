import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { ask } from '../services/askService';

const SUGGESTIONS = {
  EN: ['Can police arrest me without a warrant?', 'How long can police keep me?', 'How do I file an RTI application?'],
  BN: ['পুলিশ কি ওয়ারেন্ট ছাড়া গ্রেফতার করতে পারে?', 'পুলিশ কতক্ষণ আটক রাখতে পারে?', 'থানায় নির্যাতন করলে কী করব?'],
};

function AnswerText({ text }) {
  // Render [n] markers as small superscript-like chips so the citations stay visible but unobtrusive.
  const parts = text.split(/(\[\d+\])/g);
  return (
    <Text style={styles.answer}>
      {parts.map((p, i) => (/^\[\d+\]$/.test(p)
        ? <Text key={i} style={styles.marker}>{p}</Text>
        : p))}
    </Text>
  );
}

function Sources({ sources, strings }) {
  const [open, setOpen] = useState(null);
  return (
    <View style={styles.sources}>
      <Text style={styles.sectionLabel}>{strings.askLawLabel}</Text>
      {sources.map((s, i) => (
        <Pressable key={`${s.section_id}-${i}`} onPress={() => setOpen(open === i ? null : i)} style={styles.sourceRow}>
          <View style={styles.sourceHead}>
            <Text style={styles.sourceNum}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceCite}>{s.cite}</Text>
              {!!s.title && <Text style={styles.sourceTitle} numberOfLines={open === i ? undefined : 1}>{s.title}</Text>}
            </View>
            <Feather name={open === i ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textLight} />
          </View>
          {open === i && <Text style={styles.sourceText} selectable>{s.text}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

function Turn({ turn, strings }) {
  if (turn.kind === 'emergency') {
    return (
      <View style={[styles.card, styles.emergency]}>
        <Text style={styles.emergencyTitle}>{strings.askEmergencyTitle}</Text>
        <View style={styles.callRow}>
          <Pressable style={styles.callBtn} onPress={() => Linking.openURL('tel:999')}>
            <Feather name="phone-call" size={16} color={COLORS.onAccent} />
            <Text style={styles.callText}>999</Text>
          </Pressable>
          <Pressable style={[styles.callBtn, styles.callBtnAlt]} onPress={() => Linking.openURL('tel:16430')}>
            <Feather name="briefcase" size={16} color={COLORS.dangerDark} />
            <Text style={[styles.callText, { color: COLORS.dangerDark }]}>16430</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      {turn.kind === 'card' && (
        <View style={styles.badge}>
          <Feather name="check-circle" size={13} color={COLORS.successDark} />
          <Text style={styles.badgeText}>{strings.askVerified}</Text>
        </View>
      )}
      {turn.kind === 'ai' && turn.sources && <Sources sources={turn.sources} strings={strings} />}

      {turn.kind === 'ai' && (
        <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>{strings.askExplanationLabel}</Text>
      )}
      {turn.kind === 'ai' && !turn.text && !turn.done && (
        <View style={styles.thinking}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.thinkingText}>{turn.sources ? strings.askWriting : strings.askSearching}</Text>
        </View>
      )}
      {turn.done && turn.kind === 'ai' && !turn.valid ? (
        <Text style={styles.withheld}>{strings.askWithheld}</Text>
      ) : (
        !!turn.text && <AnswerText text={turn.text} />
      )}
      {turn.done && turn.kind === 'ai' && turn.valid && (
        <View style={styles.badge}>
          <Feather name="link" size={13} color={COLORS.successDark} />
          <Text style={styles.badgeText}>{strings.askCitationsChecked}</Text>
        </View>
      )}

      {turn.kind === 'card' && <Sources sources={turn.sources} strings={strings} />}
      {turn.error && <Text style={styles.withheld}>{turn.error}</Text>}
      {turn.timing && <Text style={styles.timing}>{turn.timing}</Text>}
    </View>
  );
}

export default function AskScreen({ route }) {
  const { strings, language } = useLanguage();
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  const update = (id, patch) => setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch(t) } : t)));

  const submit = async (raw) => {
    const question = (raw ?? input).trim();
    if (!question || busy) return;
    setInput('');
    setBusy(true);
    const id = Date.now();
    setTurns((ts) => [...ts, { id, question, kind: 'ai', text: '' }]);
    abortRef.current = new AbortController();
    try {
      await ask(question, (e) => {
        if (e.type === 'emergency') update(id, () => ({ kind: 'emergency', done: true }));
        if (e.type === 'card') {
          update(id, () => ({
            kind: 'card', text: e.answer, sources: e.sources, done: true,
            timing: `${strings.askAnsweredIn} ${e.seconds}s`,
          }));
        }
        if (e.type === 'sources') update(id, () => ({ sources: e.sources, lawSeconds: e.seconds }));
        if (e.type === 'delta') update(id, (t) => ({ text: t.text + e.text }));
        if (e.type === 'done') {
          update(id, (t) => ({
            done: true,
            valid: e.valid,
            timing: `${strings.askLawIn} ${t.lawSeconds}s · ${strings.askAnsweredIn} ${e.seconds}s`,
          }));
        }
      }, abortRef.current.signal);
    } catch {
      update(id, () => ({ done: true, valid: false, error: strings.askHubError }));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [turns]);

  useEffect(() => {
    if (route?.params?.question) submit(route.params.question);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.question]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {turns.length === 0 && (
            <View>
              <Text style={styles.title}>{strings.askTitle}</Text>
              <Text style={styles.subtitle}>{strings.askIntro}</Text>
              {SUGGESTIONS[language].map((q) => (
                <Pressable key={q} style={styles.suggestion} onPress={() => submit(q)}>
                  <Text style={styles.suggestionText}>{q}</Text>
                  <Feather name="arrow-up-right" size={16} color={COLORS.primary} />
                </Pressable>
              ))}
            </View>
          )}
          {turns.map((t) => (
            <View key={t.id}>
              <View style={styles.questionBubble}>
                <Text style={styles.questionText}>{t.question}</Text>
              </View>
              <Turn turn={t} strings={strings} />
            </View>
          ))}
          <Text style={styles.disclaimer}>{strings.askDisclaimer}</Text>
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={strings.askPlaceholder}
            placeholderTextColor={COLORS.textFaint}
            multiline
            onSubmitEditing={() => submit()}
            blurOnSubmit
          />
          <Pressable style={[styles.send, (!input.trim() || busy) && { opacity: 0.4 }]} onPress={() => submit()}>
            {busy ? <ActivityIndicator color={COLORS.onAccent} /> : <Feather name="arrow-up" size={20} color={COLORS.onAccent} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONTS.size.md, color: COLORS.textMuted, lineHeight: 22, marginBottom: SPACING.lg },
  suggestion: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  suggestionText: { flex: 1, fontSize: FONTS.size.md, color: COLORS.textSecondary },
  questionBubble: {
    alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.sm, padding: SPACING.md, marginVertical: SPACING.sm,
  },
  questionText: { color: COLORS.onAccent, fontSize: FONTS.size.md, lineHeight: 22 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.md },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, alignSelf: 'flex-start',
    backgroundColor: COLORS.successSoft, borderRadius: RADIUS.pill, paddingVertical: 3, paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm, marginTop: SPACING.xs,
  },
  badgeText: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold, color: COLORS.successDark },
  sectionLabel: {
    fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold, color: COLORS.textLight,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: SPACING.sm,
  },
  answer: { fontSize: FONTS.size.md, color: COLORS.textPrimary, lineHeight: 24, marginBottom: SPACING.sm },
  marker: { fontSize: FONTS.size.xs, color: COLORS.accentHover, fontWeight: FONTS.weight.bold },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  thinkingText: { fontSize: FONTS.size.sm, color: COLORS.textLight },
  withheld: {
    fontSize: FONTS.size.sm, color: COLORS.warningDark, backgroundColor: COLORS.warningSoft,
    padding: SPACING.md, borderRadius: RADIUS.sm, lineHeight: 20,
  },
  sources: { marginTop: SPACING.sm },
  sourceRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: SPACING.sm },
  sourceHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sourceNum: {
    width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, overflow: 'hidden',
    backgroundColor: COLORS.primarySoft, color: COLORS.accentHover, fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold,
  },
  sourceCite: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold, color: COLORS.textPrimary },
  sourceTitle: { fontSize: FONTS.size.xs, color: COLORS.textMuted },
  sourceText: { fontSize: FONTS.size.sm, color: COLORS.textSecondary, lineHeight: 21, marginTop: SPACING.sm },
  timing: { fontSize: FONTS.size.xs, color: COLORS.textFaint, marginTop: SPACING.sm },
  emergency: { backgroundColor: COLORS.dangerSoft },
  emergencyTitle: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold, color: COLORS.dangerDark, marginBottom: SPACING.md },
  callRow: { flexDirection: 'row', gap: SPACING.sm },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.danger, borderRadius: RADIUS.pill, paddingVertical: SPACING.md,
  },
  callBtnAlt: { backgroundColor: COLORS.surface },
  callText: { color: COLORS.onAccent, fontWeight: FONTS.weight.bold, fontSize: FONTS.size.lg },
  disclaimer: { fontSize: FONTS.size.xs, color: COLORS.textLight, textAlign: 'center', marginTop: SPACING.md, lineHeight: 18 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, padding: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1, maxHeight: 120, backgroundColor: COLORS.surfaceInput, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    fontSize: FONTS.size.md, color: COLORS.textPrimary,
  },
  send: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
