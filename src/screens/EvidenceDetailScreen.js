/**
 * EvidenceDetailScreen.js
 * ------------------------
 * Full-detail view for a single evidence record, including video playback.
 *
 * FEATURES:
 *   - expo-av Video component for in-app playback of recorded evidence.
 *   - Copyable integrity hash for chain-of-custody verification.
 *   - Share and delete actions.
 *   - Premium card-based layout with clear visual hierarchy.
 *
 * BACKEND CONTRACT (future):
 *   GET    /api/evidence/:id       → full record + signed streaming URL
 *   DELETE /api/evidence/:id       → soft-delete
 *   POST   /api/evidence/:id/verify → re-hash and compare with stored hash
 */

import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { deleteEvidence } from '../services/storageService';

export default function EvidenceDetailScreen({ route, navigation }) {
  const { strings = {} } = useLanguage();
  const evidence = route?.params?.evidence || null;
  const videoRef = useRef(null);
  const [videoStatus, setVideoStatus] = useState({});

  /* ---- Share ---- */
  const handleShare = async () => {
    if (!evidence?.fileUri) {
      Alert.alert('Unable to Share', 'No file available.');
      return;
    }
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(evidence.fileUri);
    } catch (error) {
      console.error('Share failed', error);
      Alert.alert('Error', 'Could not share right now.');
    }
  };

  /* ---- Delete ---- */
  const handleDelete = () => {
    Alert.alert(
      strings.deleteEvidence || 'Delete Evidence',
      strings.confirmDelete || 'Are you sure?',
      [
        { text: strings.cancel || 'Cancel', style: 'cancel' },
        {
          text: strings.delete || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvidence(evidence.id);
              navigation.goBack();
            } catch (error) {
              console.error('Delete failed', error);
            }
          },
        },
      ],
    );
  };

  /* ---- Empty state ---- */
  if (!evidence) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={48} color={COLORS.textFaint} />
          <Text style={styles.emptyText}>{strings.noEvidenceFound || 'No evidence selected.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* ---- Video Player Section ---- */}
        {evidence.type === 'video' && evidence.fileUri ? (
          <View style={styles.playerSection}>
            <Video
              ref={videoRef}
              source={{ uri: evidence.fileUri }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              onPlaybackStatusUpdate={(status) => setVideoStatus(status)}
              shouldPlay={false}
            />
            <View style={styles.playerControls}>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => {
                  if (videoStatus.isPlaying) {
                    videoRef.current?.pauseAsync();
                  } else {
                    videoRef.current?.playAsync();
                  }
                }}
              >
                <Feather
                  name={videoStatus.isPlaying ? 'pause' : 'play'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.playBtnText}>
                  {videoStatus.isPlaying ? 'Pause' : (strings.playEvidence || 'Play Evidence')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noVideoSection}>
            <Feather
              name={evidence.type === 'audio' ? 'mic' : 'file'}
              size={40}
              color={COLORS.textLight}
            />
            <Text style={styles.noVideoText}>
              {evidence.type === 'audio' ? 'Audio Evidence' : 'File Evidence'}
            </Text>
          </View>
        )}

        {/* ---- Metadata Card ---- */}
        <View style={styles.metaCard}>
          <View style={styles.metaHeader}>
            <MaterialCommunityIcons name="shield-check" size={22} color={COLORS.success} />
            <Text style={styles.metaTitle}>{strings.evidenceDetails || 'Evidence Details'}</Text>
          </View>

          <MetaRow label={strings.typeLabel || 'Type'} value={evidence.type?.toUpperCase() || 'Unknown'} />
          <MetaRow
            label={strings.dateLabel || 'Date'}
            value={evidence.createdAt ? new Date(evidence.createdAt).toLocaleString() : 'Unknown'}
          />
          <MetaRow
            label={strings.latitudeLabel || 'Latitude'}
            value={evidence.latitude != null ? String(evidence.latitude) : 'Not available'}
          />
          <MetaRow
            label={strings.longitudeLabel || 'Longitude'}
            value={evidence.longitude != null ? String(evidence.longitude) : 'Not available'}
          />
          <MetaRow label={strings.noteLabel || 'Note'} value={evidence.note || 'No note'} />
        </View>

        {/* ---- Integrity Hash Card ---- */}
        <View style={styles.hashCard}>
          <View style={styles.hashHeader}>
            <Feather name="lock" size={16} color={COLORS.successDark} />
            <Text style={styles.hashTitle}>{strings.hashLabel || 'Integrity Hash'}</Text>
          </View>
          <Text style={styles.hashValue} selectable>
            {evidence.hash || 'Not available'}
          </Text>
          <Text style={styles.hashHint}>
            This hash can be used to verify the evidence has not been tampered with.
          </Text>
        </View>

        {/* ---- Action Buttons ---- */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Feather name="share-2" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>{strings.shareEvidence || 'Share'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
            <Feather name="trash-2" size={18} color={COLORS.danger} />
            <Text style={styles.deleteBtnText}>{strings.deleteEvidence || 'Delete'}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ---- Reusable metadata row ---- */
function MetaRow({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

/* ---- Styles ---- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: 60 },

  /* Video player */
  playerSection: {
    backgroundColor: '#000',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    ...SHADOWS.lg,
  },
  videoPlayer: {
    width: '100%',
    height: 220,
  },
  playerControls: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.pill,
  },
  playBtnText: {
    color: '#fff',
    fontWeight: FONTS.weight.bold,
    marginLeft: SPACING.sm,
    fontSize: FONTS.size.md,
  },

  /* No video placeholder */
  noVideoSection: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  noVideoText: {
    marginTop: SPACING.md,
    color: COLORS.textMuted,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.semibold,
  },

  /* Metadata card */
  metaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  metaTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  metaLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    flex: 1,
  },
  metaValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
    flex: 1.5,
    textAlign: 'right',
  },

  /* Hash card */
  hashCard: {
    backgroundColor: COLORS.successSoft,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },
  hashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  hashTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.successDark,
    marginLeft: SPACING.xs,
  },
  hashValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  hashHint: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

  /* Action buttons */
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.pill,
    ...SHADOWS.sm,
  },
  shareBtnText: {
    color: '#fff',
    fontWeight: FONTS.weight.bold,
    marginLeft: SPACING.sm,
    fontSize: FONTS.size.md,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerSoft,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.pill,
  },
  deleteBtnText: {
    color: COLORS.danger,
    fontWeight: FONTS.weight.bold,
    marginLeft: SPACING.sm,
    fontSize: FONTS.size.md,
  },

  /* Empty state */
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.md,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});