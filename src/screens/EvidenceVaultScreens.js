import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { getAllEvidence, deleteEvidence } from '../services/storageService';

const F = FONTS.family;

export default function EvidenceVaultScreen({ navigation }) {
  const { strings = {} } = useLanguage();
  const [evidenceList, setEvidenceList] = useState([]);
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const loadEvidence = useCallback(async () => {
    const saved = await getAllEvidence();
    setEvidenceList(saved);
    if (saved.length > 0 && !selectedEvidence) {
      setSelectedEvidence(saved[0]);
    }
  }, [selectedEvidence]);

  useEffect(() => { loadEvidence(); }, [loadEvidence]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => loadEvidence());
    return unsubscribe;
  }, [navigation, loadEvidence]);

  const shareEvidence = async () => {
    if (!selectedEvidence?.fileUri) return;
    try {
      if (!(await Sharing.isAvailableAsync())) return;
      await Sharing.shareAsync(selectedEvidence.fileUri);
    } catch (e) { console.error('Share failed', e); }
  };

  const handleDelete = () => {
    if (!selectedEvidence) return;
    Alert.alert(
      strings.deleteEvidence || 'Delete Evidence',
      strings.confirmDelete || 'Are you sure you want to delete this evidence permanently?',
      [
        { text: strings.cancel || 'Cancel', style: 'cancel' },
        {
          text: strings.delete || 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteEvidence(selectedEvidence.id);
            setEvidenceList(updated);
            setSelectedEvidence(updated.length > 0 ? updated[0] : null);
          },
        },
      ],
    );
  };

  const getTypeIcon = (type) => {
    if (type === 'video') return 'videocam';
    if (type === 'audio') return 'mic';
    return 'image';
  };

  const renderEvidenceItem = ({ item }) => {
    const isSelected = selectedEvidence?.id === item.id;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.evidenceCard,
          isSelected && styles.selectedCard,
          pressed && { transform: [{ scale: 0.97 }] },
        ]}
        onPress={() => setSelectedEvidence(item)}
      >
        <View style={styles.cardRow}>
          <View style={[styles.typeIcon, isSelected && styles.typeIconSelected]}>
            <Ionicons
              name={getTypeIcon(item.type)}
              size={18}
              color={isSelected ? '#fff' : COLORS.textLight}
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardNote} numberOfLines={1}>
              {item.note || 'Untitled recording'}
            </Text>
            <Text style={styles.cardDate}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
            </Text>
          </View>
          <View style={styles.cardTypeChip}>
            <Text style={styles.cardTypeText}>{item.type?.toUpperCase() || 'FILE'}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.title}>{strings.evidenceVaultTitle || 'Evidence Vault'}</Text>
        <Text style={styles.subtitle}>
          {strings.evidenceVaultDesc || 'Review saved records, inspect hashes, and share files securely.'}
        </Text>

        {/* Empty State */}
        {evidenceList.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="archive-outline" size={36} color="#CCC" />
            </View>
            <Text style={styles.emptyTitle}>No evidence yet</Text>
            <Text style={styles.emptyText}>
              {strings.noEvidenceFound || 'Recordings you capture will appear here.'}
            </Text>
          </View>
        ) : (
          <>
            {/* Count Header */}
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{strings.savedEvidence || 'Saved Evidence'}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{evidenceList.length}</Text>
              </View>
            </View>

            {/* Evidence List */}
            <FlatList
              data={evidenceList}
              renderItem={renderEvidenceItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </>
        )}

        {/* Selected Evidence Detail */}
        {selectedEvidence && (
          <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#22C55E" />
              <Text style={styles.detailTitle}>{strings.evidenceDetails || 'Evidence Details'}</Text>
            </View>

            <MetaRow label={strings.typeLabel || 'Type'} value={(selectedEvidence.type || 'Unknown').toUpperCase()} />
            <MetaRow
              label={strings.dateLabel || 'Date'}
              value={selectedEvidence.createdAt ? new Date(selectedEvidence.createdAt).toLocaleString() : '—'}
            />
            <MetaRow
              label={strings.latitudeLabel || 'Latitude'}
              value={selectedEvidence.latitude != null ? String(selectedEvidence.latitude) : '—'}
            />
            <MetaRow
              label={strings.longitudeLabel || 'Longitude'}
              value={selectedEvidence.longitude != null ? String(selectedEvidence.longitude) : '—'}
            />
            <MetaRow label={strings.noteLabel || 'Note'} value={selectedEvidence.note || 'No note'} />

            {/* Hash */}
            <View style={styles.hashCard}>
              <View style={styles.hashHeader}>
                <Ionicons name="lock-closed" size={14} color="#16A34A" />
                <Text style={styles.hashLabel}>{strings.hashLabel || 'Integrity Hash'}</Text>
              </View>
              <Text style={styles.hashValue} selectable>
                {selectedEvidence.hash || 'Not available'}
              </Text>
            </View>

            {/* Actions */}
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              onPress={() => navigation.navigate('EvidenceDetail', { evidence: selectedEvidence })}
            >
              <Ionicons name="play-circle" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>{strings.viewFullDetails || 'View Full Details & Play'}</Text>
            </Pressable>

            <View style={styles.secondaryRow}>
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}
                onPress={shareEvidence}
              >
                <Ionicons name="share-social-outline" size={18} color="#111" />
                <Text style={styles.secondaryBtnText}>{strings.shareEvidence || 'Share'}</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.8 }]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 50 },

  /* Header */
  title: {
    fontSize: 26,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: F.normal,
    color: COLORS.textLight,
    lineHeight: 21,
    marginBottom: 28,
  },

  /* List header */
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  listTitle: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },
  countBadge: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  countText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: F.bold,
  },

  /* Evidence Cards */
  evidenceCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedCard: {
    borderColor: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  typeIconSelected: {
    backgroundColor: COLORS.textPrimary,
  },
  cardContent: {
    flex: 1,
  },
  cardNote: {
    fontSize: 14,
    fontFamily: F.semibold,
    color: '#222',
    marginBottom: 3,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: F.normal,
    color: '#AAA',
  },
  cardTypeChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  cardTypeText: {
    fontSize: 10,
    fontFamily: F.bold,
    color: COLORS.textLight,
    letterSpacing: 0.5,
  },

  /* Detail Section */
  detailSection: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    marginTop: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailTitle: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
  },

  /* Meta Rows */
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  metaLabel: {
    fontSize: 13,
    fontFamily: F.medium,
    color: COLORS.textFaint,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: F.semibold,
    color: '#222',
    maxWidth: '60%',
    textAlign: 'right',
  },

  /* Hash Card */
  hashCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  hashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  hashLabel: {
    fontSize: 12,
    fontFamily: F.semibold,
    color: '#16A34A',
  },
  hashValue: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#444',
    lineHeight: 20,
  },

  /* Primary Action */
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.textPrimary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 18,
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontFamily: F.bold,
    fontSize: 14,
  },

  /* Secondary Actions */
  secondaryRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  secondaryBtnText: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: F.normal,
    color: COLORS.textFaint,
    textAlign: 'center',
    maxWidth: 240,
  },
});