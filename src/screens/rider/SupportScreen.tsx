import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { userService } from '../../services/user.service';

type TabType = 'safety' | 'help' | 'rate' | 'terms';

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  { q: 'How do I book a GoNow ride?', a: 'Open the GoNow app, set your destination in the "Where to?" box on the home screen, select your preferred ride option (Moto, E-Rickshaw, Auto, or Cab), check the estimated fare, and tap request to match with a captain near you.' },
  { q: 'What should I do if I forget an item in the ride?', a: 'Go to your Ride History in the profile tab, select the trip where you lost the item, and tap "Contact Captain". If you are unable to reach the captain, tap "Help & Support" or contact our 24/7 helpline.' },
  { q: 'How are the ride fares calculated?', a: 'GoNow offers flat-fare Shuttle E-Rickshaw (Economy) rides at a fixed ₹15 rate per passenger. For other private ride options (Bike, Cab, or Auto), the fare is calculated dynamically based on base fare, distance, and estimated travel duration.' },
  { q: 'How does the Shuttle E-Rickshaw (Economy) ride work?', a: 'E-Rickshaw shuttles run on fixed Metro station routes. When you book a Shared Ride, the app snaps you to the nearest route stop. You simply walk to the designated pickup stop, board, and pay a flat ₹15 fare.' },
  { q: 'What payment methods are supported?', a: 'Currently, payments are completed directly to the Captain at the end of the trip via Cash or any personal UPI app (no in-app wallet required).' },
  { q: 'Can I change my route mid-trip?', a: 'For Shared E-Rickshaws, routes are fixed and cannot be changed mid-trip. For standard Bike or Cab rides, you may request the driver to adjust the path, but the final fare is calculated based on the original destination.' },
];

export const SupportScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();

  // Determine initial tab from route parameters
  const initialTab: TabType = route.params?.activeTab || 'safety';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // FAQ accordion state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Rating state
  const [rating, setRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittedRating, setSubmittedRating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleSOSAlert = () => {
    Alert.alert(
      '🚨 SOS Emergency Triggered',
      'This is a simulation. In a real emergency, this action will notify our 24/7 security response team and share your current coordinates with local authorities.',
      [{ text: 'Dismiss', style: 'cancel' }]
    );
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Selection Required', 'Please select at least 1 star to rate the app.');
      return;
    }
    setIsSubmitting(true);
    try {
      await userService.rateApp(rating, feedbackText);
      setSubmittedRating(true);
      Alert.alert('Thank You!', 'Your rating and feedback have been received. We appreciate your support!');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSafetyTab = () => (
    <ScrollView contentContainerStyle={s.tabScroll} showsVerticalScrollIndicator={false}>
      <View style={s.safetyHero}>
        <Text style={s.safetyHeroEmoji}>🛡️</Text>
        <Text style={s.safetyHeroTitle}>Your Safety is Our Priority</Text>
        <Text style={s.safetyHeroSub}>
          GoNow offers multiple safety features to ensure your trip is secure, comfortable, and reliable.
        </Text>
      </View>

      <TouchableOpacity style={s.sosButton} onPress={handleSOSAlert} activeOpacity={0.85}>
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          style={s.sosButtonGrad}>
          <Text style={s.sosButtonTitle}>🚨 Emergency SOS Button</Text>
          <Text style={s.sosButtonSub}>Tap to alert security response team instantly</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={s.sectionLabel}>Safety Toolkit Features</Text>

      <View style={s.cardGrid}>
        <View style={s.toolkitCard}>
          <Text style={s.toolkitIcon}>📱</Text>
          <Text style={s.toolkitTitle}>Real-time tracking</Text>
          <Text style={s.toolkitDesc}>Share your live ride coordinates with friends and family during your trip.</Text>
        </View>

        <View style={s.toolkitCard}>
          <Text style={s.toolkitIcon}>👤</Text>
          <Text style={s.toolkitTitle}>Verified Captains</Text>
          <Text style={s.toolkitDesc}>All GoNow drivers undergo background checks and document verification.</Text>
        </View>

        <View style={s.toolkitCard}>
          <Text style={s.toolkitIcon}>📞</Text>
          <Text style={s.toolkitTitle}>24/7 Support Desk</Text>
          <Text style={s.toolkitDesc}>Get instant assistance at any hour of the day or night for trip concerns.</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderHelpTab = () => (
    <ScrollView contentContainerStyle={s.tabScroll} showsVerticalScrollIndicator={false}>
      <View style={s.chatSupportCard}>
        <View style={s.chatHeader}>
          <Text style={s.chatIcon}>✉️</Text>
          <View style={s.chatHeaderText}>
            <Text style={s.chatTitle}>Email Support</Text>
            <Text style={s.chatSub}>Reach out to us at healthbridge.main@gmail.com for queries or disputes.</Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.chatBtn}
          onPress={() => {
            Linking.openURL('mailto:healthbridge.main@gmail.com?subject=GoNow Support Request')
              .catch(() => Alert.alert('Email Support', 'Please send an email to healthbridge.main@gmail.com'));
          }}
          activeOpacity={0.8}>
          <Text style={s.chatBtnText}>Send Email</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionLabel}>Frequently Asked Questions</Text>

      <View style={s.faqList}>
        {FAQS.map((faq, index) => {
          const isExpanded = expandedFaq === index;
          return (
            <View key={index} style={s.faqCard}>
              <TouchableOpacity
                style={s.faqHeader}
                onPress={() => handleToggleFaq(index)}
                activeOpacity={0.7}>
                <Text style={s.faqQuestion}>{faq.q}</Text>
                <Text style={s.faqArrow}>{isExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {isExpanded && (
                <View style={s.faqBody}>
                  <Text style={s.faqAnswer}>{faq.a}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderRateTab = () => {
    const getFeedbackMessage = () => {
      if (rating >= 4) return 'Awesome! We are thrilled to hear that you love GoNow! 😍';
      if (rating >= 2) return 'Thanks for the feedback. We will work on making your experience better! 👍';
      if (rating === 1) return 'We are sorry to let you down. Please tell us how we can improve. 🥺';
      return '';
    };

    return (
      <ScrollView contentContainerStyle={s.tabScroll} showsVerticalScrollIndicator={false}>
        <View style={s.ratingCard}>
          <Text style={s.ratingEmoji}>⭐</Text>
          <Text style={s.ratingCardTitle}>Enjoying GoNow?</Text>
          <Text style={s.ratingCardSub}>
            Your rating helps us improve our service and helps others discover the app.
          </Text>

          {/* Star selector */}
          <View style={s.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = rating >= star;
              return (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    if (!submittedRating) setRating(star);
                  }}
                  activeOpacity={0.7}>
                  <Text style={[s.starText, active && s.starActive]}>★</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {rating > 0 && (
            <Text style={s.ratingFeedbackMsg}>{getFeedbackMessage()}</Text>
          )}

          {!submittedRating ? (
            <>
              <TextInput
                style={s.feedbackInput}
                placeholder="Write your suggestions (optional)..."
                placeholderTextColor={Colors.textMuted}
                value={feedbackText}
                onChangeText={setFeedbackText}
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity 
                style={s.submitRateBtn} 
                onPress={handleSubmitRating} 
                disabled={isSubmitting} 
                activeOpacity={0.8}>
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  style={s.submitRateBtnGrad}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={s.submitRateBtnText}>Submit Feedback</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.successBox}>
              <Text style={s.successBoxText}>✓ Feedback submitted. Thank you!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderTermsTab = () => (
    <ScrollView contentContainerStyle={s.tabScroll} showsVerticalScrollIndicator={false}>
      <View style={s.termsCard}>
        <Text style={s.termsTitle}>1. Acceptable Use Policy</Text>
        <Text style={s.termsText}>
          By registering for and utilizing the GoNow app, you agree to respect our captains and adhere to local safety regulations. Users must not behave in a disruptive or harmful manner.
        </Text>

        <Text style={s.termsTitle}>2. Cancellation & Fares</Text>
        <Text style={s.termsText}>
          Fares displayed during request are estimates and subject to changes like route alterations or tolls. Cancellations after a captain matches may attract nominal charges to compensate for resources.
        </Text>

        <Text style={s.termsTitle}>3. Privacy Commitment</Text>
        <Text style={s.termsText}>
          GoNow collects location, contact info, and device details only to provide ride matching, tracking, and safety features. Your payment and location coordinates are protected in transit.
        </Text>

        <Text style={s.termsTitle}>4. Contact Legal Team</Text>
        <Text style={s.termsText}>
          For official concerns or regulatory issues, contact us at legal@gonowapp.com.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Support Center</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {[
          { key: 'safety', label: 'Safety 🛡️' },
          { key: 'help', label: 'Help 💬' },
          { key: 'rate', label: 'Rate ⭐' },
          { key: 'terms', label: 'Terms 📄' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tabButton, isActive && s.tabButtonActive]}
              onPress={() => setActiveTab(tab.key as TabType)}
              activeOpacity={0.7}>
              <Text style={[s.tabButtonText, isActive && s.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'safety' && renderSafetyTab()}
        {activeTab === 'help' && renderHelpTab()}
        {activeTab === 'rate' && renderRateTab()}
        {activeTab === 'terms' && renderTermsTab()}
      </View>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    borderColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  tabScroll: {
    padding: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  safetyHero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  safetyHeroEmoji: {
    fontSize: 50,
    marginBottom: Spacing.sm,
  },
  safetyHeroTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  safetyHeroSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
  },
  sosButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadow.md,
  },
  sosButtonGrad: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButtonTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.black,
    color: Colors.white,
    marginBottom: 4,
  },
  sosButtonSub: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  cardGrid: {
    gap: Spacing.md,
  },
  toolkitCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  toolkitIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  toolkitTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  toolkitDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  chatSupportCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  chatIcon: {
    fontSize: 32,
  },
  chatHeaderText: {
    flex: 1,
  },
  chatTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  chatSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chatBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtnText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  faqList: {
    gap: Spacing.md,
  },
  faqCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  faqQuestion: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  faqArrow: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  faqBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingTop: Spacing.sm,
  },
  faqAnswer: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  ratingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  ratingEmoji: {
    fontSize: 50,
  },
  ratingCardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  ratingCardSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  starContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  starText: {
    fontSize: 40,
    color: Colors.surfaceElevated,
  },
  starActive: {
    color: Colors.accent,
  },
  ratingFeedbackMsg: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginVertical: Spacing.xs,
  },
  feedbackInput: {
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    color: Colors.white,
    fontSize: FontSize.sm,
    textAlignVertical: 'top',
  },
  submitRateBtn: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  submitRateBtnGrad: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  submitRateBtnText: {
    fontSize: FontSize.base,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  successBox: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  successBoxText: {
    color: Colors.success,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  termsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  termsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  termsText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
});
