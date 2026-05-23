import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, TextInput, Animated, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { captainService } from '../../services/captain.service';
import { useAuthStore } from '../../store/authStore';


type Step = 'personal' | 'vehicle' | 'documents' | 'done';

const VEHICLE_TYPES = [
  { id: 'bike', icon: '🏍️', label: 'Bike' },
  { id: 'auto', icon: '🛺', label: 'Auto' },
  { id: 'cab', icon: '🚗', label: 'Cab' },
];

const STEPS: { key: Step; icon: string; label: string }[] = [
  { key: 'personal', icon: '👤', label: 'Personal' },
  { key: 'vehicle', icon: '🚗', label: 'Vehicle' },
  { key: 'documents', icon: '📄', label: 'Documents' },
  { key: 'done', icon: '✅', label: 'Done' },
];

export const CaptainOnboardingScreen: React.FC<any> = ({ navigation }) => {
  const [step, setStep] = useState<Step>('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Personal details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');

  // Vehicle details
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  // Documents
  const [licenceNo, setLicenceNo] = useState('');
  const [rcNo, setRcNo] = useState('');
  const [insuranceNo, setInsuranceNo] = useState('');

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const animateNext = (nextStep: Step) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
  };

  const handlePersonalNext = () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your full name'); return; }
    if (!dob.trim()) { Alert.alert('Required', 'Please enter your date of birth'); return; }
    if (!gender) { Alert.alert('Required', 'Please select your gender'); return; }
    animateNext('vehicle');
  };

  const handleVehicleNext = () => {
    if (!vehicleType) { Alert.alert('Required', 'Please select a vehicle type'); return; }
    if (!vehicleMake.trim()) { Alert.alert('Required', 'Please enter vehicle make (e.g. Honda)'); return; }
    if (!vehicleModel.trim()) { Alert.alert('Required', 'Please enter vehicle model'); return; }
    if (!licensePlate.trim()) { Alert.alert('Required', 'Please enter license plate number'); return; }
    animateNext('documents');
  };

  const handleDocumentsNext = async () => {
    if (!licenceNo.trim()) { Alert.alert('Required', 'Please enter your driving licence number'); return; }
    if (!rcNo.trim()) { Alert.alert('Required', 'Please enter RC (Registration Certificate) number'); return; }
    setIsSubmitting(true);
    try {
      await captainService.updateProfile({
        name,
        ...(email.trim() ? { email: email.trim() } : {}),
        vehicle: {
          type: vehicleType,
          make: vehicleMake,
          model: vehicleModel,
          color: vehicleColor,
          plateNumber: licensePlate,
          year: vehicleYear.trim() ? parseInt(vehicleYear) : undefined,
        },
      });

      setIsSubmitting(false);
      animateNext('done');
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert(
        'Submission Failed',
        err?.response?.data?.message || err?.message || 'Failed to submit onboarding details. Please try again.'
      );
    }
  };

  const handleGoLive = () => {
    // Reactive update -> triggers RootNavigator to switch to CaptainTabNavigator
    useAuthStore.getState().updateProfile({ name });
  };

  const handleClose = () => {
    Alert.alert(
      'Exit Onboarding',
      'Are you sure you want to exit? You will be logged out and will need to verify your number again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit & Logout',
          style: 'destructive',
          onPress: async () => {
            const { logout } = useAuthStore.getState();
            await logout();
          },
        },
      ]
    );
  };

  // ─── Step Progress Bar ─────────────────────────────────────────────────────────
  const StepBar = () => (
    <View style={s.stepBar}>
      {STEPS.map((st, i) => {
        const done = i < stepIndex;
        const active = i === stepIndex;
        return (
          <React.Fragment key={st.key}>
            <View style={[s.stepDot, done && s.stepDotDone, active && s.stepDotActive]}>
              {done ? (
                <Text style={s.stepDotCheck}>✓</Text>
              ) : (
                <Text style={[s.stepDotLabel, active && s.stepDotLabelActive]}>{st.icon}</Text>
              )}
            </View>
            {i < STEPS.length - 1 && (
              <View style={[s.stepLine, done && s.stepLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // ─── Personal Details ─────────────────────────────────────────────────────────
  const PersonalStep = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Personal Details</Text>
      <Text style={s.stepSub}>Tell us a bit about yourself</Text>

      <View style={s.field}>
        <Text style={s.label}>Full Name *</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Arjun Sharma"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Email Address</Text>
        <TextInput
          style={s.input}
          placeholder="arjun@example.com"
          placeholderTextColor={Colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Date of Birth *</Text>
        <TextInput
          style={s.input}
          placeholder="DD / MM / YYYY"
          placeholderTextColor={Colors.textMuted}
          value={dob}
          onChangeText={setDob}
          keyboardType="numeric"
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Gender *</Text>
        <View style={s.chipRow}>
          {(['male', 'female', 'other'] as const).map(g => (
            <TouchableOpacity
              key={g}
              style={[s.chip, gender === g && s.chipActive]}
              onPress={() => setGender(g)}>
              <Text style={[s.chipText, gender === g && s.chipTextActive]}>
                {g === 'male' ? '👨 Male' : g === 'female' ? '👩 Female' : '⚧ Other'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={s.nextBtn} onPress={handlePersonalNext} activeOpacity={0.9}>
        <LinearGradient colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
          <Text style={s.nextBtnText}>Next — Vehicle Info →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ─── Vehicle Details ──────────────────────────────────────────────────────────
  const VehicleStep = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Vehicle Info</Text>
      <Text style={s.stepSub}>Details of the vehicle you'll drive with</Text>

      <View style={s.field}>
        <Text style={s.label}>Vehicle Type *</Text>
        <View style={s.vehicleRow}>
          {VEHICLE_TYPES.map(v => (
            <TouchableOpacity
              key={v.id}
              style={[s.vehicleChip, vehicleType === v.id && s.vehicleChipActive]}
              onPress={() => setVehicleType(v.id)}>
              <Text style={s.vehicleIcon}>{v.icon}</Text>
              <Text style={[s.vehicleLabel, vehicleType === v.id && s.vehicleLabelActive]}>{v.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.row}>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>Make *</Text>
          <TextInput style={s.input} placeholder="Honda" placeholderTextColor={Colors.textMuted} value={vehicleMake} onChangeText={setVehicleMake} />
        </View>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>Model *</Text>
          <TextInput style={s.input} placeholder="Activa 6G" placeholderTextColor={Colors.textMuted} value={vehicleModel} onChangeText={setVehicleModel} />
        </View>
      </View>

      <View style={s.row}>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>Year</Text>
          <TextInput style={s.input} placeholder="2022" placeholderTextColor={Colors.textMuted} value={vehicleYear} onChangeText={setVehicleYear} keyboardType="numeric" maxLength={4} />
        </View>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>Color</Text>
          <TextInput style={s.input} placeholder="Pearl White" placeholderTextColor={Colors.textMuted} value={vehicleColor} onChangeText={setVehicleColor} />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>License Plate *</Text>
        <TextInput
          style={[s.input, s.plateInput]}
          placeholder="KA 01 AB 1234"
          placeholderTextColor={Colors.textMuted}
          value={licensePlate}
          onChangeText={v => setLicensePlate(v.toUpperCase())}
          autoCapitalize="characters"
        />
      </View>

      <View style={s.btnRow}>
        <TouchableOpacity style={s.backStepBtn} onPress={() => animateNext('personal')}>
          <Text style={s.backStepText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.nextBtn, { flex: 1 }]} onPress={handleVehicleNext} activeOpacity={0.9}>
          <LinearGradient colors={[Colors.primaryLight, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
            <Text style={s.nextBtnText}>Next — Documents →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Documents ────────────────────────────────────────────────────────────────
  const DocumentsStep = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Documents</Text>
      <Text style={s.stepSub}>Required for verification & compliance</Text>

      {[
        { label: 'Driving Licence No. *', placeholder: 'DL-1420110012345', value: licenceNo, onChange: setLicenceNo, icon: '🪪' },
        { label: 'RC (Registration Certificate) *', placeholder: 'KA01AB1234', value: rcNo, onChange: setRcNo, icon: '📋' },
        { label: 'Insurance Policy No.', placeholder: 'POL/12345678', value: insuranceNo, onChange: setInsuranceNo, icon: '🛡️' },
      ].map((doc, i) => (
        <View key={i} style={s.field}>
          <Text style={s.label}>{doc.label}</Text>
          <View style={s.docInputRow}>
            <View style={s.docIcon}><Text style={{ fontSize: 20 }}>{doc.icon}</Text></View>
            <TextInput
              style={[s.input, s.docInput]}
              placeholder={doc.placeholder}
              placeholderTextColor={Colors.textMuted}
              value={doc.value}
              onChangeText={doc.onChange}
              autoCapitalize="characters"
            />
          </View>
        </View>
      ))}

      <View style={s.noticeBox}>
        <Text style={s.noticeIcon}>ℹ️</Text>
        <Text style={s.noticeText}>
          Document images can be uploaded after submission. Our team will verify within 24 hrs.
        </Text>
      </View>

      <View style={s.btnRow}>
        <TouchableOpacity style={s.backStepBtn} onPress={() => animateNext('vehicle')}>
          <Text style={s.backStepText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.nextBtn, { flex: 1 }]} onPress={handleDocumentsNext} activeOpacity={0.9} disabled={isSubmitting}>
          <LinearGradient colors={[Colors.primaryLight, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
            <Text style={s.nextBtnText}>{isSubmitting ? 'Submitting...' : 'Submit & Finish ✓'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Done ─────────────────────────────────────────────────────────────────────
  const DoneStep = () => (
    <View style={s.doneContent}>
      <LinearGradient colors={['#001A08', Colors.background]} style={StyleSheet.absoluteFill} />
      <View style={s.doneCheck}>
        <LinearGradient colors={[Colors.success, '#16A34A']} style={s.doneCheckGrad}>
          <Text style={s.doneCheckText}>🎉</Text>
        </LinearGradient>
      </View>
      <Text style={s.doneTitle}>You're All Set!</Text>
      <Text style={s.doneSub}>
        Your onboarding is complete. Our team will verify your details within 24 hours. Once approved, you can go online and start earning!
      </Text>
      <View style={s.doneCards}>
        {[
          { icon: '⏳', title: 'Under Review', desc: 'Verification takes 24 hrs' },
          { icon: '📱', title: 'Get Notified', desc: "We'll SMS you when approved" },
          { icon: '💰', title: 'Start Earning', desc: 'Go online & accept rides' },
        ].map((c, i) => (
          <View key={i} style={s.doneCard}>
            <Text style={{ fontSize: 24 }}>{c.icon}</Text>
            <Text style={s.doneCardTitle}>{c.title}</Text>
            <Text style={s.doneCardDesc}>{c.desc}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={s.goLiveBtn} onPress={handleGoLive} activeOpacity={0.9}>
        <LinearGradient colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
          <Text style={s.nextBtnText}>🏍️  Go to Captain Dashboard</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {step !== 'done' && (
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Captain Onboarding</Text>
            <Text style={s.headerStep}>Step {stepIndex + 1} of {STEPS.length}</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
      )}

      {step !== 'done' && <StepBar />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={step === 'done' ? s.doneScrollContent : s.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: 1, transform: [{ translateY: slideAnim }] }}>
          {step === 'personal' && PersonalStep()}
          {step === 'vehicle' && VehicleStep()}
          {step === 'documents' && DocumentsStep()}
          {step === 'done' && DoneStep()}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: 54, paddingBottom: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  closeBtnText: { fontSize: FontSize.base, color: Colors.textSecondary },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerStep: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  // Step bar
  stepBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  stepDot: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.surfaceBorder,
  },
  stepDotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  stepDotActive: { backgroundColor: 'rgba(255,90,31,0.12)', borderColor: Colors.primary },
  stepDotCheck: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  stepDotLabel: { fontSize: 16, opacity: 0.4 },
  stepDotLabelActive: { opacity: 1 },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.surfaceBorder },
  stepLineDone: { backgroundColor: Colors.success },

  scrollContent: { padding: Spacing.xl, paddingBottom: 60 },
  doneScrollContent: { flexGrow: 1 },
  stepContent: { gap: Spacing.lg },
  stepTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, color: Colors.textPrimary },
  stepSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: -Spacing.sm },

  // Fields
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semiBold, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1.5,
    borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: FontSize.base, color: Colors.textPrimary,
  },
  plateInput: { letterSpacing: 2, fontWeight: FontWeight.bold, fontSize: FontSize.lg },
  row: { flexDirection: 'row', gap: Spacing.md },

  // Gender/chips
  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1, paddingVertical: Spacing.md, alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.surfaceBorder,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,90,31,0.08)' },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },

  // Vehicle type
  vehicleRow: { flexDirection: 'row', gap: Spacing.sm },
  vehicleChip: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.surfaceBorder, gap: 6,
  },
  vehicleChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,90,31,0.08)' },
  vehicleIcon: { fontSize: 28 },
  vehicleLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  vehicleLabelActive: { color: Colors.primary, fontWeight: FontWeight.bold },

  // Documents
  docInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  docIcon: {
    width: 50, height: 50, borderRadius: BorderRadius.md, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.surfaceBorder,
  },
  docInput: { flex: 1 },

  noticeBox: {
    flexDirection: 'row', gap: Spacing.sm, backgroundColor: 'rgba(255,90,31,0.06)',
    borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,90,31,0.2)',
  },
  noticeIcon: { fontSize: 18 },
  noticeText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },

  // Buttons
  btnRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'stretch' },
  nextBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  nextBtnGrad: { paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
  backStepBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.surfaceBorder, justifyContent: 'center',
  },
  backStepText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },

  // Done step
  doneContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'], gap: Spacing.xl },
  doneCheck: { marginBottom: Spacing.sm },
  doneCheckGrad: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  doneCheckText: { fontSize: 44 },
  doneTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.black, color: Colors.textPrimary, textAlign: 'center' },
  doneSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  doneCards: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  doneCard: {
    flex: 1, alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  doneCardTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  doneCardDesc: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  goLiveBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', width: '100%' },
});
