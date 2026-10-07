import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { userService } from '../../services/user.service';

const MORNING_TIMES = [
  '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
];

const EVENING_TIMES = [
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM',
];

export const SavedTimingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuthStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [morningTime, setMorningTime] = useState<string>('');
  const [eveningTime, setEveningTime] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with store on load / update
  useEffect(() => {
    setMorningTime(user?.commuteTimings?.morningDeparture || '');
    setEveningTime(user?.commuteTimings?.eveningDeparture || '');
  }, [user?.commuteTimings]);

  const handleOpenEditModal = () => {
    setMorningTime(user?.commuteTimings?.morningDeparture || '');
    setEveningTime(user?.commuteTimings?.eveningDeparture || '');
    setModalVisible(true);
  };

  const handleSaveTimings = async () => {
    setIsSaving(true);
    try {
      const updatedTimings = {
        morningDeparture: morningTime.trim() || undefined,
        eveningDeparture: eveningTime.trim() || undefined,
      };

      // 1. Update store in memory
      updateProfile({ commuteTimings: updatedTimings });

      // 2. Persist to MongoDB backend database
      await userService.updateProfile({ commuteTimings: updatedTimings });

      setModalVisible(false);
      Alert.alert('Timings Updated', 'Your commute departure timings have been updated successfully.');
    } catch (err) {
      console.error('Failed to update commute timings:', err);
      Alert.alert('Error', 'Failed to save timings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentMorning = user?.commuteTimings?.morningDeparture;
  const currentEvening = user?.commuteTimings?.eveningDeparture;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Saved Timings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <LinearGradient
          colors={['rgba(255,90,31,0.15)', 'rgba(255,90,31,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.infoBanner}
        >
          <Text style={s.infoIcon}>⏰</Text>
          <View style={s.infoTextContent}>
            <Text style={s.infoTitle}>Commute Timings</Text>
            <Text style={s.infoSubtitle}>
              Setting your departure times helps us send ride reminders and show instant route matches for your daily commute.
            </Text>
          </View>
        </LinearGradient>

        {/* Timings Cards */}
        <View style={s.cardsContainer}>
          {/* Morning Departure Card */}
          <View style={s.timingCard}>
            <View style={s.cardHeader}>
              <View style={s.iconWrapper}>
                <Text style={s.cardIcon}>🌅</Text>
              </View>
              <View style={s.cardTitleBlock}>
                <Text style={s.cardLabel}>Morning Commute</Text>
                <Text style={s.cardDesc}>Leaving for work in the morning</Text>
              </View>
            </View>

            <View style={s.timeDisplayRow}>
              <Text style={s.timeLabel}>Scheduled Time:</Text>
              <View style={[s.timeBadge, !currentMorning && s.timeBadgeUnset]}>
                <Text style={[s.timeBadgeText, !currentMorning && s.timeBadgeTextUnset]}>
                  {currentMorning || 'Not Set'}
                </Text>
              </View>
            </View>
          </View>

          {/* Evening Return Card */}
          <View style={s.timingCard}>
            <View style={s.cardHeader}>
              <View style={s.iconWrapper}>
                <Text style={s.cardIcon}>🌆</Text>
              </View>
              <View style={s.cardTitleBlock}>
                <Text style={s.cardLabel}>Evening Return</Text>
                <Text style={s.cardDesc}>Heading back home in the evening</Text>
              </View>
            </View>

            <View style={s.timeDisplayRow}>
              <Text style={s.timeLabel}>Scheduled Time:</Text>
              <View style={[s.timeBadge, !currentEvening && s.timeBadgeUnset]}>
                <Text style={[s.timeBadgeText, !currentEvening && s.timeBadgeTextUnset]}>
                  {currentEvening || 'Not Set'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Update Button */}
      <View style={s.footer}>
        <TouchableOpacity style={s.updateBtn} onPress={handleOpenEditModal} activeOpacity={0.85}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.updateBtnGrad}
          >
            <Text style={s.updateBtnText}>✏️ Update Timings</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Edit Timings Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Update Commute Timings</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={s.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Morning Timing Selector */}
              <View style={s.selectorSection}>
                <Text style={s.sectionTitle}>🌅 Morning Work Departure</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
                  {MORNING_TIMES.map((time) => {
                    const isSelected = morningTime === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[s.chip, isSelected && s.chipSelected]}
                        onPress={() => setMorningTime(isSelected ? '' : time)}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.chipText, isSelected && s.chipTextSelected]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Evening Timing Selector */}
              <View style={s.selectorSection}>
                <Text style={s.sectionTitle}>🌆 Evening Home Returning</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
                  {EVENING_TIMES.map((time) => {
                    const isSelected = eveningTime === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[s.chip, isSelected && s.chipSelected]}
                        onPress={() => setEveningTime(isSelected ? '' : time)}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.chipText, isSelected && s.chipTextSelected]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.saveBtn}
                onPress={handleSaveTimings}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  style={s.saveBtnGrad}
                >
                  {isSaving ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={s.saveBtnText}>Save Timings</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 54 : 34,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  backBtnText: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['5xl'],
    gap: Spacing.xl,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,90,31,0.3)',
    gap: Spacing.md,
  },
  infoIcon: {
    fontSize: 28,
  },
  infoTextContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primaryLight,
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cardsContainer: {
    gap: Spacing.md,
  },
  timingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  timeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  timeLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  timeBadge: {
    backgroundColor: 'rgba(255,90,31,0.15)',
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,90,31,0.3)',
  },
  timeBadgeUnset: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: Colors.surfaceBorder,
  },
  timeBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  timeBadgeTextUnset: {
    color: Colors.textMuted,
    fontWeight: FontWeight.regular,
  },
  footer: {
    padding: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  updateBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  updateBtnGrad: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingBottom: Platform.OS === 'ios' ? 44 : Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
  },
  closeBtn: {
    fontSize: FontSize.xl,
    color: Colors.textMuted,
    padding: 4,
  },
  selectorSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
  },
  chipSelected: {
    backgroundColor: 'rgba(255,90,31,0.15)',
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  saveBtnGrad: {
    paddingVertical: Spacing.base + 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
});
