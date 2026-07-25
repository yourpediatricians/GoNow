import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { Colors, FontSize, FontWeight } from '../../constants/theme';
import { Logo } from '../../components/Logo';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.parallel([
        Animated.timing(rippleScale, {
          toValue: 3,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(rippleOpacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    const checkAuth = async () => {
      const { loadFromStorage } = require('../../store/authStore').useAuthStore.getState();
      const isLoggedIn = await loadFromStorage();
      navigation.replace(isLoggedIn ? ('MainApp' as any) : 'Welcome');
    };

    const timer = setTimeout(checkAuth, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <LinearGradient
        colors={['#0D0D0D', '#1A0A00', '#0D0D0D']}
        style={StyleSheet.absoluteFill}
      />

      {/* Ripple effect */}
      <Animated.View
        style={[
          styles.ripple,
          {
            transform: [{ scale: rippleScale }],
            opacity: rippleOpacity,
          },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          },
        ]}>
        <Logo size={150} style={styles.logoImage} />

        <Animated.View style={{ opacity: taglineOpacity }}>
          <Text style={styles.appName}>GoNow</Text>
          <Text style={styles.tagline}>Your Ride. Your Way.</Text>
        </Animated.View>
      </Animated.View>

      {/* Bottom */}
      <Animated.View style={[styles.bottom, { opacity: taglineOpacity }]}>
        <Text style={styles.bottomText}>Fast · Safe · Affordable</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    opacity: 0.3,
  },
  logoContainer: { alignItems: 'center' },
  logoImage: {
    marginBottom: 16,
  },
  appName: {
    fontSize: 42,
    fontWeight: FontWeight.black,
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 6,
  },
  bottom: {
    position: 'absolute',
    bottom: 48,
  },
  bottomText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
