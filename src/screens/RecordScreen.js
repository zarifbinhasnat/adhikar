/**
 * RecordScreen.js
 * ---------------
 * Camera-based evidence recording screen.
 *
 * KEY FIXES vs previous version:
 *   1. Requests BOTH camera AND microphone permissions (legally admissible audio).
 *   2. Sets CameraView mode="video" — prevents "Camera is not in video mode" crash.
 *   3. Persists evidence to AsyncStorage via storageService so data survives
 *      navigation / app restarts.
 *   4. Correctly reads location from `coords` sub-object (was using wrong keys).
 *
 * BACKEND CONTRACT (future):
 *   POST /api/evidence/upload  — multipart form: { file, metadata JSON }
 *   Response: { id, cloudUrl, verifiedHash }
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, TextInput, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import ActionButton from '../components/ActionButton';
import { Directory, File, Paths } from 'expo-file-system';
import { getAllEvidence, addEvidence } from '../services/storageService';
import { sealEvidence } from '../services/integrityService';

// The camera writes to the cache, which iOS may purge; evidence must live in documents.
function moveToVault(tempUri, id) {
  const vault = new Directory(Paths.document, 'evidence');
  if (!vault.exists) vault.create();
  const ext = tempUri.split('.').pop() || 'mov';
  const dest = new File(vault, `${id}.${ext}`);
  new File(tempUri).move(dest);
  return dest.uri;
}

export default function RecordScreen({ navigation }) {
  const { strings } = useLanguage();

  /* ---- Permissions ---- */
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();

  /* ---- State ---- */
  const [isRecording, setIsRecording] = useState(false);
  const [note, setNote] = useState('');
  const [witnesses, setWitnesses] = useState('');
  const [location, setLocation] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [timer, setTimer] = useState(0);
  const [evidenceList, setEvidenceList] = useState([]);
  const cameraRef = useRef(null);

  /* ---- Load persisted evidence on mount ---- */
  useEffect(() => {
    (async () => {
      const saved = await getAllEvidence();
      setEvidenceList(saved);
    })();
  }, []);

  /* ---- Request location on mount ---- */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      } else {
        setLocationDenied(true);
      }
    })();
  }, []);

  /* ---- Timer for recording duration ---- */
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  /* ---- Helpers ---- */
  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const permissionsGranted = camPerm?.granted && micPerm?.granted;

  const requestAllPermissions = useCallback(async () => {
    if (!camPerm?.granted) await requestCamPerm();
    if (!micPerm?.granted) await requestMicPerm();
  }, [camPerm, micPerm, requestCamPerm, requestMicPerm]);

  /* ---- Recording ---- */
  const startRecording = async () => {
    if (!permissionsGranted || !cameraRef.current) return;

    try {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync();

      // Grab fresh location at the moment recording finishes
      let coords = location;
      try {
        const freshLoc = await Location.getCurrentPositionAsync({});
        coords = freshLoc.coords;
      } catch { /* keep cached coords */ }

      const id = Date.now().toString();
      const createdAt = new Date().toISOString();
      const latitude = coords?.latitude ?? null;
      const longitude = coords?.longitude ?? null;
      const fileUri = moveToVault(video.uri, id);
      const seal = await sealEvidence({ fileUri, latitude, longitude, createdAt });

      const evidence = {
        id,
        type: 'video',
        fileUri,
        note: note || 'Untitled recording',
        witnesses: witnesses.trim(),
        latitude,
        longitude,
        hash: seal.contentHash,
        ...seal,
        createdAt,
      };

      const updatedList = await addEvidence(evidence);
      setEvidenceList(updatedList);
      setNote('');
      setWitnesses('');
      Alert.alert('✅', strings.recordingSaved);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('❌', strings.recordingError);
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }
  };

  /* ---- Render ---- */
  const renderPermissionGate = () => {
    if (!camPerm || !micPerm) {
      return (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{strings.requestingPermission}</Text>
        </View>
      );
    }
    if (!permissionsGranted) {
      return (
        <View style={styles.placeholder}>
          <Ionicons name="camera-reverse-outline" size={48} color={COLORS.textFaint} style={{ marginBottom: SPACING.md }} />
          <Text style={styles.placeholderText}>{strings.cameraPermission}</Text>
          {!micPerm?.granted && (
            <Text style={[styles.placeholderText, { fontSize: FONTS.size.sm, marginTop: SPACING.xs }]}>
              {strings.microphonePermission}
            </Text>
          )}
          <TouchableOpacity onPress={requestAllPermissions} style={styles.permBtn}>
            <Text style={styles.permBtnText}>{strings.grantPermission}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Camera Preview */}
      <View style={styles.cameraContainer}>
        {!permissionsGranted ? (
          renderPermissionGate()
        ) : (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            mode="video"
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.recordingIndicator}>
                {isRecording && <View style={styles.redDot} />}
                <Text style={styles.timerText}>{formatTime(timer)}</Text>
              </View>
            </View>
          </CameraView>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.metadataSection}>
          <Text style={styles.metaLabel}>
            {strings.gps}:{' '}
            <Text style={styles.metaValue}>
              {location
                ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                : (locationDenied ? strings.gpsDenied : strings.gpsLocating)}
            </Text>
          </Text>
        </View>

        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={strings.incidentNote}
          placeholderTextColor={COLORS.textLight}
        />
        <TextInput
          style={styles.noteInput}
          value={witnesses}
          onChangeText={setWitnesses}
          placeholder={`${strings.witnesses}: ${strings.witnessesPlaceholder}`}
          placeholderTextColor={COLORS.textLight}
        />

        <View style={styles.hashSection}>
          <MaterialCommunityIcons name="shield-check" size={20} color={COLORS.success} />
          <Text style={styles.hashText}>{strings.hashVerified}</Text>
        </View>

        <ActionButton
          label={isRecording ? strings.stopBtn : strings.recordBtn}
          icon={<Ionicons name={isRecording ? "stop" : "videocam"} size={24} color="white" />}
          variant={isRecording ? 'danger' : 'primary'}
          onPress={isRecording ? stopRecording : startRecording}
          style={styles.mainAction}
        />

        <Text style={styles.savedHint}>{strings.savedToPhone}</Text>

        <TouchableOpacity
          style={styles.openVaultBtn}
          onPress={() => navigation.navigate('EvidenceVault')}
        >
          <Ionicons name="archive" size={18} color={COLORS.white} style={{ marginRight: SPACING.sm }} />
          <Text style={styles.openVaultText}>
            {strings.openEvidenceVault} ({evidenceList.length})
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.textPrimary },
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.textSecondary,
    paddingHorizontal: SPACING.xl,
  },
  placeholderText: {
    color: '#fff',
    marginBottom: SPACING.md,
    textAlign: 'center',
    fontSize: FONTS.size.md,
  },
  permBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  permBtnText: { color: '#fff', fontWeight: FONTS.weight.bold },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: SPACING.xl,
    alignItems: 'flex-end',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31,27,22,0.55)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
    marginRight: SPACING.sm,
  },
  timerText: { color: 'white', fontWeight: FONTS.weight.bold },
  controlsContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xxl,
    paddingBottom: 40,
  },
  metadataSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  metaLabel: { fontSize: FONTS.size.sm, color: COLORS.textLight },
  metaValue: { fontWeight: FONTS.weight.bold, color: COLORS.textSecondary },
  noteInput: {
    backgroundColor: COLORS.surfaceInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    fontSize: FONTS.size.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  hashSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successSoft,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xxl,
  },
  hashText: {
    marginLeft: SPACING.sm,
    color: COLORS.successDark,
    fontWeight: FONTS.weight.semibold,
  },
  mainAction: {
    borderRadius: RADIUS.pill,
    marginBottom: SPACING.xxl,
  },
  savedHint: {
    fontSize: FONTS.size.xs,
    color: 'rgba(251,248,243,0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
  openVaultBtn: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
  },
  openVaultText: {
    color: COLORS.white,
    fontWeight: FONTS.weight.bold,
    fontSize: FONTS.size.md,
  },
});
