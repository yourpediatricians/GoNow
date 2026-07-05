import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';
import { captainService } from '../../services/captain.service';
import { STORAGE_KEYS } from '../../services/api';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';

export const CaptainVerificationScreen: React.FC = () => {
  const { user, logout, updateProfile } = useAuthStore();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const res = await captainService.getProfile();
      const isVerified = res.data?.captainProfile?.isDocumentVerified || false;

      if (isVerified) {
        // Update store state
        updateProfile({ isDocumentVerified: true });

        // Update local AsyncStorage
        const existing = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        if (existing) {
          const parsed = JSON.parse(existing);
          await AsyncStorage.setItem(
            STORAGE_KEYS.USER,
            JSON.stringify({ ...parsed, isDocumentVerified: true })
          );
        }

        Alert.alert('Verification Approved', 'Your account has been successfully verified! Welcome to GoNow.');
      } else {
        Alert.alert(
          'Verification Pending',
          'Our team is still reviewing your profile and vehicle details. Please check back soon!'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to refresh verification status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      <LinearGradient colors={['#1A0A00', '#0D0D0D']} style={styles.gradient}>
        
        {/* Verification Icon Card */}
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>⏳</Text>
          </View>
          
          <Text style={styles.title}>Verification Pending</Text>
          
          <Text style={styles.description}>
            It can take 5-7 business days to review your personal profile and vehicle documents.
          </Text>
          
          <Text style={styles.subDescription}>
            Once the team approves your details, you will immediately gain access to the dashboard to accept bookings and start earning.
          </Text>

          {/* Details Box */}
          <View style={styles.detailsBox}>
            <Text style={styles.detailsLabel}>Registered Account:</Text>
            <Text style={styles.detailsValue}>{user?.phone}</Text>
            <Text style={[styles.detailsLabel, { marginTop: Spacing.sm }]}>Verification Type:</Text>
            <Text style={styles.detailsValue}>Captain & Vehicle Documents</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.checkBtn} 
            onPress={handleCheckStatus}
            disabled={isChecking}
            activeOpacity={0.8}
          >
            {isChecking ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.checkBtnText}>🔄 Check Status</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.signOutBtn} 
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutBtnText}>🚪 Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.footerText}>GoNow Verification System</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  gradient: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 31, 0.15)',
    ...Shadow.glow,
    marginBottom: Spacing['2xl'],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 90, 31, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 31, 0.3)',
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.black,
    color: Colors.white,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
    fontWeight: FontWeight.medium,
  },
  subDescription: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.xl,
    fontStyle: 'italic',
  },
  detailsBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  detailsLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.semiBold,
    textTransform: 'uppercase',
  },
  detailsValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  buttonContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  checkBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.glow,
  },
  checkBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  signOutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  signOutBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.error,
  },
  footerText: {
    position: 'absolute',
    bottom: 24,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
