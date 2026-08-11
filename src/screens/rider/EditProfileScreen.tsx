import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/user.service';
import { captainService } from '../../services/captain.service';
import { STORAGE_KEYS } from '../../services/api';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { RideType } from '../../types';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuthStore();

  const isCaptain = user?.role === 'captain';

  // Shared States
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [dob, setDob] = useState(user?.dob || '');
  
  // Captain-Only States
  const [vehicleType, setVehicleType] = useState<RideType>((user?.vehicle?.type as RideType) || 'bike');
  const [vehicleMake, setVehicleMake] = useState(user?.vehicle?.make || '');
  const [vehicleModel, setVehicleModel] = useState(user?.vehicle?.model || '');
  const [vehicleYear, setVehicleYear] = useState(user?.vehicle?.year ? String(user.vehicle.year) : '');
  const [vehicleColor, setVehicleColor] = useState(user?.vehicle?.color || '');
  const [licensePlate, setLicensePlate] = useState(user?.vehicle?.plateNumber || '');

  const [isSaving, setIsSaving] = useState(false);

  // Initialize Member Since
  const memberSince = user?.memberSince || 'June 2024';

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedDob = dob.trim();

    if (!trimmedName) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }

    // Basic email validation if entered
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    // Basic DOB validation if entered
    if (trimmedDob && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDob) && !/^\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4}$/.test(trimmedDob)) {
      // Allow YYYY-MM-DD or DD/MM/YYYY
      Alert.alert('Validation Error', 'Date of birth must be in YYYY-MM-DD or DD/MM/YYYY format.');
      return;
    }

    // Captain Validation
    if (isCaptain) {
      if (!vehicleType) {
        Alert.alert('Validation Error', 'Vehicle Type is required.');
        return;
      }
      if (!vehicleMake.trim()) {
        Alert.alert('Validation Error', 'Vehicle Make is required.');
        return;
      }
      if (!vehicleModel.trim()) {
        Alert.alert('Validation Error', 'Vehicle Model is required.');
        return;
      }
      if (!vehicleColor.trim()) {
        Alert.alert('Validation Error', 'Vehicle Color is required.');
        return;
      }
      if (!licensePlate.trim()) {
        Alert.alert('Validation Error', 'License Plate is required.');
        return;
      }
      if (vehicleYear.trim() && !/^\d{4}$/.test(vehicleYear.trim())) {
        Alert.alert('Validation Error', 'Vehicle Year must be a 4-digit number.');
        return;
      }
    }

    setIsSaving(true);

    const updates: any = {
      name: trimmedName,
      phone: phone.trim(),
      email: trimmedEmail,
      gender,
      dob: trimmedDob,
      memberSince, // keep memberSince
    };

    if (isCaptain) {
      updates.vehicle = {
        type: vehicleType,
        make: vehicleMake.trim(),
        model: vehicleModel.trim(),
        year: vehicleYear.trim() ? parseInt(vehicleYear.trim(), 10) : undefined,
        color: vehicleColor.trim(),
        plateNumber: licensePlate.trim().toUpperCase(),
      };
    }

    try {
      // 1. Best-effort API update
      if (isCaptain) {
        await captainService.updateProfile(updates).catch((err) => {
          console.warn('Captain backend update failed, falling back to local save:', err);
        });
      } else {
        await userService.updateProfile(updates).catch((err) => {
          console.warn('Rider backend update failed, falling back to local save:', err);
        });
      }

      // 2. Local State update
      updateProfile(updates);

      // 3. AsyncStorage persistence
      const existingUserStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const existingUser = existingUserStr ? JSON.parse(existingUserStr) : {};
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify({ ...existingUser, ...updates })
      );

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'An unexpected error occurred while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar section */}
        <View style={s.avatarContainer}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary]}
            style={s.avatarGlow}>
            <Text style={s.avatarText}>{name.charAt(0).toUpperCase() || 'U'}</Text>
          </LinearGradient>
          <Text style={s.avatarSub}>{isCaptain ? 'Captain Profile' : 'Rider Profile'}</Text>
        </View>

        {/* Form fields */}
        <View style={s.form}>
          {/* Full Name */}
          <View style={s.inputGroup}>
            <Text style={s.label}>Full Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Arjun Sharma"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Phone Number */}
          <View style={s.inputGroup}>
            <Text style={s.label}>Phone Number</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={Colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Email */}
          <View style={s.inputGroup}>
            <Text style={s.label}>Email Address</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. arjun@example.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Gender */}
          <View style={s.inputGroup}>
            <Text style={s.label}>Gender</Text>
            <View style={s.genderRow}>
              {['Male', 'Female', 'Other'].map((g) => {
                const isSelected = gender?.toLowerCase() === g.toLowerCase();
                return (
                  <TouchableOpacity
                    key={g}
                    style={[s.genderOption, isSelected && s.genderOptionSelected]}
                    activeOpacity={0.8}
                    onPress={() => setGender(g)}>
                    <Text style={[s.genderText, isSelected && s.genderTextSelected]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* DOB */}
          <View style={s.inputGroup}>
            <Text style={s.label}>Date of Birth</Text>
            <TextInput
              style={s.input}
              placeholder="YYYY-MM-DD or DD/MM/YYYY"
              placeholderTextColor={Colors.textMuted}
              value={dob}
              onChangeText={setDob}
              maxLength={15}
            />
          </View>

          {/* Member Since (Read-only) */}
          <View style={s.inputGroup}>
            <Text style={s.label}>Member Since</Text>
            <View style={s.readonlyBox}>
              <Text style={s.readonlyText}>{memberSince}</Text>
            </View>
          </View>

          {/* Vehicle Information (Captain Only) */}
          {isCaptain && (
            <View style={s.vehicleSection}>
              <Text style={s.sectionHeader}>Vehicle Information</Text>

              {/* Vehicle Type */}
              <View style={s.inputGroup}>
                <Text style={s.label}>Vehicle Type</Text>
                <View style={s.genderRow}>
                  {[
                    { id: 'bike', icon: '🏍️', label: 'Bike' },
                    { id: 'economy', icon: '⚡🛺', label: 'E-Rickshaw' },
                  ].map((type) => {
                    const isSelected = vehicleType === type.id;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[s.genderOption, isSelected && s.genderOptionSelected]}
                        activeOpacity={0.8}
                        onPress={() => setVehicleType(type.id as RideType)}>
                        <Text style={[s.genderText, isSelected && s.genderTextSelected]}>
                          {type.icon} {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Make & Model */}
              <View style={s.row}>
                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={s.label}>Vehicle Make</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. Honda"
                    placeholderTextColor={Colors.textMuted}
                    value={vehicleMake}
                    onChangeText={setVehicleMake}
                  />
                </View>
                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={s.label}>Vehicle Model</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. Activa 6G"
                    placeholderTextColor={Colors.textMuted}
                    value={vehicleModel}
                    onChangeText={setVehicleModel}
                  />
                </View>
              </View>

              {/* Year & Color */}
              <View style={s.row}>
                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={s.label}>Vehicle Year</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. 2022"
                    placeholderTextColor={Colors.textMuted}
                    value={vehicleYear}
                    onChangeText={setVehicleYear}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={s.label}>Vehicle Color</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. Pearl White"
                    placeholderTextColor={Colors.textMuted}
                    value={vehicleColor}
                    onChangeText={setVehicleColor}
                  />
                </View>
              </View>

              {/* License Plate */}
              <View style={s.inputGroup}>
                <Text style={s.label}>License Plate</Text>
                <TextInput
                  style={[s.input, s.plateInput]}
                  placeholder="KA 01 AB 1234"
                  placeholderTextColor={Colors.textMuted}
                  value={licensePlate}
                  onChangeText={(v) => setLicensePlate(v.toUpperCase())}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={s.saveBtn}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.saveBtnGrad}>
            {isSaving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={s.saveBtnText}>Save Changes</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: Spacing['3xl'],
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.glow,
    marginBottom: Spacing.sm,
  },
  avatarText: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.black,
    color: Colors.white,
  },
  avatarSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.base,
    color: Colors.white,
  },
  readonlyBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    opacity: 0.8,
  },
  readonlyText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  genderOption: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255, 90, 31, 0.08)',
  },
  genderText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  genderTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  saveBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  saveBtnGrad: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  // Captain vehicle specific classes
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  vehicleSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.lg,
  },
  sectionHeader: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.black,
    color: Colors.primary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  plateInput: {
    letterSpacing: 2,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.lg,
  },
});
