import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Screens - Auth
import { SplashScreen } from '../screens/auth/SplashScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { PhoneEntryScreen } from '../screens/auth/PhoneEntryScreen';
import { OTPVerifyScreen } from '../screens/auth/OTPVerifyScreen';
import { CaptainOnboardingScreen } from '../screens/auth/CaptainOnboardingScreen';
import { RiderOnboardingScreen } from '../screens/auth/RiderOnboardingScreen';

// Screens - Rider
import { RiderHomeScreen } from '../screens/rider/HomeScreen';
import { RideHistoryScreen } from '../screens/rider/RideHistoryScreen';
import { ProfileScreen } from '../screens/rider/ProfileScreen';
import { ActiveRideScreen } from '../screens/rider/ActiveRideScreen';
import { BookingScreen } from '../screens/rider/BookingScreen';
import { RideSearchScreen } from '../screens/rider/RideSearchScreen';
import { RideCompleteScreen } from '../screens/rider/RideCompleteScreen';
import { WalletScreen } from '../screens/rider/WalletScreen';
import { NotificationsScreen } from '../screens/rider/NotificationsScreen';
import { SelectLocationScreen } from '../screens/rider/SelectLocationScreen';
import { EconomyBookingScreen } from '../screens/rider/EconomyBookingScreen';
import { EconomyMatchingScreen } from '../screens/rider/EconomyMatchingScreen';
import { EditProfileScreen } from '../screens/rider/EditProfileScreen';
import { SavedAddressesScreen } from '../screens/rider/SavedAddressesScreen';
import { SupportScreen } from '../screens/rider/SupportScreen';

// Screens - Captain
import { CaptainDashboardScreen } from '../screens/captain/DashboardScreen';
import { CaptainEarningsScreen } from '../screens/captain/EarningsScreen';
import { CaptainVerificationScreen } from '../screens/captain/VerificationScreen';

// Store
import { useAuthStore } from '../store/authStore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../constants/theme';

// ─── Auth Stack ────────────────────────────────────────────────────────────────
const AuthStack = createNativeStackNavigator();
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
    <AuthStack.Screen name="Splash" component={SplashScreen} />
    <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
    <AuthStack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
    <AuthStack.Screen name="OTPVerify" component={OTPVerifyScreen} />
    <AuthStack.Screen name="RoleSelect" component={WelcomeScreen} />
    <AuthStack.Screen name="ProfileSetup" component={WelcomeScreen} />
    <AuthStack.Screen
      name="CaptainOnboarding"
      component={CaptainOnboardingScreen}
      options={{ animation: 'slide_from_right' }}
    />
  </AuthStack.Navigator>
);

// ─── Rider Tab Bar ─────────────────────────────────────────────────────────────
const RIDER_TABS = [
  { icon: '🏠', label: 'Home' },
  { icon: '📋', label: 'Trips' },
  { icon: '👛', label: 'Wallet' },
  { icon: '🔔', label: 'Alerts' },
  { icon: '👤', label: 'Profile' },
];

const CustomTabBar = ({ state, navigation }: any) => (
  <View style={tabStyles.container}>
    {state.routes.map((route: any, index: number) => {
      const isFocused = state.index === index;
      const tab = RIDER_TABS[index];
      return (
        <TouchableOpacity
          key={route.key}
          onPress={() => navigation.navigate(route.name)}
          style={tabStyles.tab}
          activeOpacity={0.7}>
          <View style={[tabStyles.iconWrapper, isFocused && tabStyles.activeIconWrapper]}>
            <Text style={[tabStyles.icon, isFocused && tabStyles.activeIcon]}>{tab.icon}</Text>
          </View>
          <Text style={[tabStyles.label, isFocused && tabStyles.activeLabel]}>{tab.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─── Rider Tab Navigator ───────────────────────────────────────────────────────
const RiderTab = createBottomTabNavigator();
const RiderTabNavigator = () => (
  <RiderTab.Navigator tabBar={props => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <RiderTab.Screen name="Home" component={RiderHomeScreen} />
    <RiderTab.Screen name="History" component={RideHistoryScreen} />
    <RiderTab.Screen name="Wallet" component={WalletScreen} />
    <RiderTab.Screen name="Notifications" component={NotificationsScreen} />
    <RiderTab.Screen name="Profile" component={ProfileScreen} />
  </RiderTab.Navigator>
);

// ─── Rider Stack ───────────────────────────────────────────────────────────────
const RiderStack = createNativeStackNavigator();
const RiderNavigator = () => (
  <RiderStack.Navigator screenOptions={{ headerShown: false }}>
    <RiderStack.Screen name="RiderTabs" component={RiderTabNavigator} />
    <RiderStack.Screen name="ActiveRide" component={ActiveRideScreen} options={{ animation: 'slide_from_bottom' }} />
    <RiderStack.Screen name="Booking" component={BookingScreen} options={{ animation: 'slide_from_bottom' }} />
    <RiderStack.Screen name="RideSearch" component={RideSearchScreen} options={{ animation: 'fade' }} />
    <RiderStack.Screen name="RideComplete" component={RideCompleteScreen} options={{ animation: 'slide_from_bottom' }} />
    <RiderStack.Screen name="SelectLocation" component={SelectLocationScreen} options={{ animation: 'slide_from_right' }} />
    <RiderStack.Screen name="EconomyBooking" component={EconomyBookingScreen} options={{ animation: 'slide_from_right' }} />
    <RiderStack.Screen name="EconomyMatching" component={EconomyMatchingScreen} options={{ animation: 'fade' }} />
  </RiderStack.Navigator>
);

// ─── Captain Tab Bar ───────────────────────────────────────────────────────────
const CAPTAIN_TABS = [
  { icon: '📊', label: 'Dashboard' },
  { icon: '💰', label: 'Earnings' },
  { icon: '👤', label: 'Profile' },
];

const CaptainTabBar = ({ state, navigation }: any) => (
  <View style={tabStyles.container}>
    {state.routes.map((route: any, index: number) => {
      const isFocused = state.index === index;
      const tab = CAPTAIN_TABS[index];
      return (
        <TouchableOpacity
          key={route.key}
          onPress={() => navigation.navigate(route.name)}
          style={tabStyles.tab}
          activeOpacity={0.7}>
          <View style={[tabStyles.iconWrapper, isFocused && tabStyles.activeIconWrapper]}>
            <Text style={[tabStyles.icon, isFocused && tabStyles.activeIcon]}>{tab.icon}</Text>
          </View>
          <Text style={[tabStyles.label, isFocused && tabStyles.activeLabel]}>{tab.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const CaptainTab = createBottomTabNavigator();
const CaptainTabNavigator = () => (
  <CaptainTab.Navigator tabBar={props => <CaptainTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <CaptainTab.Screen name="Dashboard" component={CaptainDashboardScreen} />
    <CaptainTab.Screen name="Earnings" component={CaptainEarningsScreen} />
    <CaptainTab.Screen name="Profile" component={ProfileScreen} />
  </CaptainTab.Navigator>
);

// ─── Root Navigator ────────────────────────────────────────────────────────────
const RootStack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated || !user ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : user.role === 'captain' ? (
          !user.name ? (
            <RootStack.Screen name="CaptainOnboarding" component={CaptainOnboardingScreen} />
          ) : !user.isDocumentVerified ? (
            <RootStack.Screen name="CaptainVerification" component={CaptainVerificationScreen} />
          ) : (
            <RootStack.Screen name="Captain" component={CaptainTabNavigator} />
          )
        ) : !user.name ? (
          <RootStack.Screen name="RiderOnboarding" component={RiderOnboardingScreen} />
        ) : (
          <RootStack.Screen name="Rider" component={RiderNavigator} />
        )}
        <RootStack.Screen name="EditProfile" component={EditProfileScreen} options={{ animation: 'slide_from_right' }} />
        <RootStack.Screen name="SavedAddresses" component={SavedAddressesScreen} options={{ animation: 'slide_from_right' }} />
        <RootStack.Screen name="Support" component={SupportScreen} options={{ animation: 'slide_from_right' }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingBottom: 24,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  iconWrapper: {
    width: 44,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapper: { backgroundColor: 'rgba(255,90,31,0.12)' },
  icon: { fontSize: 20, opacity: 0.5 },
  activeIcon: { opacity: 1 },
  label: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  activeLabel: { color: Colors.primary, fontWeight: FontWeight.bold },
});
