import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/user.service';
import { geocodingService } from '../services/geocoding.service';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../constants/theme';
import { User } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Time options ─────────────────────────────────────────────────────────────
const MORNING_TIMES = [
  '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
];
const EVENING_TIMES = [
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM',
];

// ─── Step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  {
    step: 1,
    icon: '💼',
    title: 'Where do you work?',
    subtitle: 'Save your work location for one-tap commute booking every morning.',
    placeholder: 'e.g. Connaught Place, Delhi',
    type: 'location' as const,
  },
  {
    step: 2,
    icon: '🏠',
    title: 'Where do you live?',
    subtitle: 'Save your home address to book rides back home with a single tap.',
    placeholder: 'e.g. Dwarka Sector 12, Delhi',
    type: 'location' as const,
  },
  {
    step: 3,
    icon: '🌅',
    title: 'When do you leave for work?',
    subtitle: 'Your typical morning departure time helps us show the fastest route options.',
    type: 'time' as const,
    times: MORNING_TIMES,
  },
  {
    step: 4,
    icon: '🌆',
    title: 'When do you head home?',
    subtitle: 'Know your return time? We\'ll make sure a ride is always ready for you.',
    type: 'time' as const,
    times: EVENING_TIMES,
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const OnboardingSetupModal: React.FC<Props> = ({ visible, onClose }) => {
  const { user, updateProfile } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(0); // 0-indexed
  const [workAddress, setWorkAddress] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [morningTime, setMorningTime] = useState('');
  const [eveningTime, setEveningTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  // ─── Animate step transition ─────────────────────────────────────────────
  const animateNext = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  // ─── Save collected data & close ────────────────────────────────────────
  const saveAndClose = async () => {
    setIsSaving(true);
    try {
      const existingAddresses = user?.savedAddresses ? [...user.savedAddresses] : [];

      // ── Geocode work address (step 1) ──────────────────────────────────
      if (workAddress.trim()) {
        const trimmed = workAddress.trim();
        let coords = { latitude: 28.6139, longitude: 77.2090 }; // Delhi fallback
        try {
          const geo = await geocodingService.geocode(trimmed);
          if (geo?.latitude && geo?.longitude) coords = geo;
        } catch {}

        const alreadyHasWork = existingAddresses.some(
          a => a.label.toLowerCase() === 'work'
        );
        if (!alreadyHasWork) {
          existingAddresses.push({
            id: Date.now().toString(),
            label: 'Work',
            address: trimmed,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        }
      }

      // ── Geocode home address (step 2) ──────────────────────────────────
      if (homeAddress.trim()) {
        const trimmed = homeAddress.trim();
        let coords = { latitude: 28.6139, longitude: 77.2090 };
        try {
          const geo = await geocodingService.geocode(trimmed);
          if (geo?.latitude && geo?.longitude) coords = geo;
        } catch {}

        const alreadyHasHome = existingAddresses.some(
          a => a.label.toLowerCase() === 'home'
        );
        if (!alreadyHasHome) {
          existingAddresses.push({
            id: (Date.now() + 1).toString(),
            label: 'Home',
            address: trimmed,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        }
      }

      // ── Build commute timings object ───────────────────────────────────
      // Always construct commuteTimings object so user.commuteTimings becomes defined in DB
      const commuteTimings = {
        ...(user?.commuteTimings || {}),
        ...(morningTime ? { morningDeparture: morningTime } : {}),
        ...(eveningTime ? { eveningDeparture: eveningTime } : {}),
      };

      // ── Persist to backend + store ─────────────────────────────────────
      const updates: Partial<User> = {
        commuteTimings,
      };
      if (existingAddresses.length > 0) {
        updates.savedAddresses = existingAddresses;
      }

      updateProfile(updates);
      await userService.updateProfile(updates);
    } catch (err) {
      console.warn('OnboardingSetupModal save error:', err);
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  // ─── Navigation ──────────────────────────────────────────────────────────
  const handleContinue = () => {
    if (isLastStep) {
      saveAndClose();
    } else {
      animateNext();
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    if (isLastStep) {
      saveAndClose();
    } else {
      animateNext();
      setCurrentStep(prev => prev + 1);
    }
  };

  // ─── Current input value ──────────────────────────────────────────────
  const currentValue = currentStep === 0 ? workAddress : homeAddress;
  const setCurrentValue = currentStep === 0 ? setWorkAddress : setHomeAddress;
  const currentTime = currentStep === 2 ? morningTime : eveningTime;
  const setCurrentTime = currentStep === 2 ? setMorningTime : setEveningTime;

  const hasFilled = step.type === 'location'
    ? currentValue.trim().length > 0
    : currentTime.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {/* prevent back dismiss */}}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Tappable dark overlay — no dismiss on tap */}
        <View style={styles.overlayBackdrop} />

        {/* Sheet card */}
        <View style={styles.sheet}>
          {/* Header gradient bar */}
          <LinearGradient
            colors={[Colors.primaryDark, Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerBar}
          >
            <View style={styles.headerTopRow}>
              {/* Step dots */}
              <View style={styles.dotsRow}>
                {STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === currentStep
                        ? styles.dotActive
                        : i < currentStep
                        ? styles.dotDone
                        : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>

              {/* Skip All button */}
              <TouchableOpacity
                onPress={saveAndClose}
                disabled={isSaving}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.skipAllHeaderBtn}>Skip All ✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.stepCounter}>
              Step {currentStep + 1} of {STEPS.length}
            </Text>
          </LinearGradient>

          {/* Body */}
          <Animated.View
            style={[styles.body, { transform: [{ translateX: slideAnim }] }]}
          >
            {/* Icon */}
            <Text style={styles.stepIcon}>{step.icon}</Text>

            {/* Title + subtitle */}
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.subtitle}>{step.subtitle}</Text>

            {/* Hint tag */}
            <View style={styles.hintTag}>
              <Text style={styles.hintText}>
                ✨ This will help you book rides faster every day
              </Text>
            </View>

            {/* ── Input: location ── */}
            {step.type === 'location' && (
              <TextInput
                style={styles.input}
                placeholder={step.placeholder}
                placeholderTextColor={Colors.textMuted}
                value={currentValue}
                onChangeText={setCurrentValue}
                returnKeyType="done"
                autoCapitalize="words"
              />
            )}

            {/* ── Input: time chips ── */}
            {step.type === 'time' && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeChipsContainer}
                style={styles.timeChipsScroll}
              >
                {step.times!.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeChip,
                      currentTime === time && styles.timeChipSelected,
                    ]}
                    onPress={() => setCurrentTime(time)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.timeChipText,
                        currentTime === time && styles.timeChipTextSelected,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Animated.View>

          {/* Actions */}
          <View style={styles.actions}>
            {/* Continue / Done button */}
            <TouchableOpacity
              style={[styles.continueBtn, !hasFilled && styles.continueBtnDisabled]}
              onPress={handleContinue}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <LinearGradient
                  colors={
                    hasFilled
                      ? [Colors.primaryLight, Colors.primary]
                      : [Colors.surfaceElevated, Colors.surface]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueBtnGrad}
                >
                  <Text
                    style={[
                      styles.continueBtnText,
                      !hasFilled && styles.continueBtnTextDisabled,
                    ]}
                  >
                    {isLastStep ? '🎉 All Done!' : 'Continue →'}
                  </Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            {/* Skip */}
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>
                {isLastStep ? 'Skip & Finish' : 'Skip this step'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: SCREEN_HEIGHT * 0.82,
    ...Shadow.lg,
  },
  headerBar: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipAllHeaderBtn: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: FontWeight.semiBold,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.white,
  },
  dotDone: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  stepCounter: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FontWeight.semiBold,
    letterSpacing: 0.5,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  stepIcon: {
    fontSize: 44,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  hintTag: {
    backgroundColor: 'rgba(255,90,31,0.10)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,90,31,0.22)',
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
  },
  hintText: {
    fontSize: FontSize.xs,
    color: Colors.primaryLight,
    fontWeight: FontWeight.medium,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  timeChipsScroll: {
    marginBottom: Spacing.sm,
  },
  timeChipsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.xl,
  },
  timeChip: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
  },
  timeChipSelected: {
    backgroundColor: 'rgba(255,90,31,0.15)',
    borderColor: Colors.primary,
  },
  timeChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  timeChipTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  actions: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  continueBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueBtnGrad: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  continueBtnTextDisabled: {
    color: Colors.textMuted,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
});
