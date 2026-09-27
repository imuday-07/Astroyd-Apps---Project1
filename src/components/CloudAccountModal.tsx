import { Session } from '@supabase/supabase-js';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  signInWithEmail,
  signInWithOAuthProvider,
  signOutUser,
  signUpWithEmail,
  validateNoSensitiveBankingSecrets,
} from '../services/budgetBackend';
import { STUDIO_FONT_FAMILY } from '../theme/boostlabTheme';

interface CloudAccountModalProps {
  visible: boolean;
  session: Session | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  onClose: () => void;
  onAuthSuccess: (session: Session | null) => void;
  isFullScreen?: boolean;
}

export const CloudAccountModal: React.FC<CloudAccountModalProps> = ({
  visible,
  session,
  syncStatus,
  onClose,
  onAuthSuccess,
  isFullScreen = false,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // ─── Feature Carousel ─────────────────────────────────────────────────────
  const FEATURE_SLIDES = [
    {
      emoji: '📊',
      title: 'Live Balance Dashboard',
      body: 'See your net balance, income, and spending update in real time every time you log a transaction.',
    },
    {
      emoji: '✉️',
      title: 'Smart Budget Envelopes',
      body: 'Set monthly caps per category — Food, Rent, Travel, EMI — and get instant alerts before you overspend.',
    },
    {
      emoji: '☁️',
      title: 'Cloud Sync',
      body: 'Sign in once and your data syncs automatically across every device, always up to date.',
    },
    {
      emoji: '🎯',
      title: 'Financial Goals',
      body: 'Create savings targets like "Emergency Fund" or "New Laptop" and watch your progress grow.',
    },
    {
      emoji: '📈',
      title: 'Analytics & Trends',
      body: 'Beautiful multi-month charts show your spending patterns and savings rate at a glance.',
    },
  ];

  const [slideIndex, setSlideIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFullScreen) return;
    const timer = setInterval(() => {
      // Fade + slide out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSlideIndex((prev) => (prev + 1) % FEATURE_SLIDES.length);
        slideAnim.setValue(20);
        // Fade + slide in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 3200);
    return () => clearInterval(timer);
  }, [isFullScreen, fadeAnim, slideAnim]);

  useEffect(() => {
    if (visible) {
      setFeedbackMsg(null);
    }
  }, [visible]);

  const handleAuthSubmit = async () => {
    setFeedbackMsg(null);
    if (!email.trim() || !password) {
      setFeedbackMsg({
        type: 'error',
        text: 'Please enter both your email address and password.',
      });
      return;
    }
    if (password.length < 6) {
      setFeedbackMsg({
        type: 'error',
        text: 'Password must be at least 6 characters.',
      });
      return;
    }

    const secWarn = validateNoSensitiveBankingSecrets(`${fullName} ${email}`);
    if (secWarn) {
      setFeedbackMsg({ type: 'error', text: secWarn });
      return;
    }

    try {
      setLoading(true);
      if (authMode === 'signup') {
        const res = await signUpWithEmail(email, password, fullName);
        if (res.requiresEmailConfirmation) {
          setFeedbackMsg({
            type: 'info',
            text: 'Account created! Please check your email inbox to confirm your address.',
          });
        } else {
          onAuthSuccess(res.session);
          setPassword('');
          onClose();
        }
      } else {
        const res = await signInWithEmail(email, password);
        onAuthSuccess(res.session);
        setPassword('');
        onClose();
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Unable to sign in. Please check your details.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setFeedbackMsg(null);
    try {
      setLoading(true);
      await signInWithOAuthProvider(provider);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Unable to start social sign-in.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setFeedbackMsg(null);
    try {
      setLoading(true);
      await signOutUser();
      onAuthSuccess(null);
      onClose();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Could not sign out.',
      });
    } finally {
      setLoading(false);
    }
  };

  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email?.split('@')[0] ||
    'Member';

  const avatarInitial = displayName.charAt(0).toUpperCase();

  const authContent = (
    <>
      {feedbackMsg && (
        <View
          style={[
            styles.alertBox,
            feedbackMsg.type === 'error'
              ? styles.alertError
              : feedbackMsg.type === 'success'
              ? styles.alertSuccess
              : styles.alertInfo,
          ]}
        >
          <Text
            style={[
              styles.alertText,
              feedbackMsg.type === 'error'
                ? { color: '#D70015' }
                : feedbackMsg.type === 'success'
                ? { color: '#1F9E32' }
                : { color: '#0066CC' },
            ]}
          >
            {feedbackMsg.text}
          </Text>
        </View>
      )}

      <View style={styles.sectionStack}>
        {/* Sign In / Create Account Switcher */}
        <View style={styles.authModeSwitch}>
          <Pressable
            style={[
              styles.authModeOption,
              authMode === 'signin' && styles.authModeOptionActive,
            ]}
            onPress={() => {
              setAuthMode('signin');
              setFeedbackMsg(null);
            }}
          >
            <Text
              style={[
                styles.authModeText,
                authMode === 'signin' && styles.authModeTextActive,
              ]}
            >
              Sign In
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.authModeOption,
              authMode === 'signup' && styles.authModeOptionActive,
            ]}
            onPress={() => {
              setAuthMode('signup');
              setFeedbackMsg(null);
            }}
          >
            <Text
              style={[
                styles.authModeText,
                authMode === 'signup' && styles.authModeTextActive,
              ]}
            >
              Create Account
            </Text>
          </Pressable>
        </View>

        {authMode === 'signup' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <TextInput
              style={styles.textInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your name"
              placeholderTextColor="#86868B"
            />
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.textInput}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#86868B"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <TextInput
            style={styles.textInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Minimum 6 characters"
            placeholderTextColor="#86868B"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <Pressable
          style={styles.primaryBtn}
          onPress={handleAuthSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {authMode === 'signup' ? 'Create Account' : 'Sign In'}
            </Text>
          )}
        </Pressable>

        {/* Social Login Options */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialBtnsRow}>
          <Pressable
            style={[styles.oauthBtn, { flex: 1 }]}
            onPress={() => handleOAuthLogin('google')}
            disabled={loading}
          >
            <Text style={styles.oauthBtnText}>Continue with Google</Text>
          </Pressable>
        </View>

        {/* Financial Security Notice */}
        <View style={styles.securityPledgeCard}>
          <Text style={styles.securityPledgeTitle}>
            🔒 YOUR FINANCIAL PRIVACY
          </Text>
          <Text style={styles.securityPledgeBody}>
            We never ask for your bank passwords, UPI PIN, credit/debit card
            PIN, or banking OTP.{'\n'}
            Verification emails are sent from{' '}
            <Text style={styles.securityPledgeEmail}>
              astroydapps@gmail.com
            </Text>
            .
          </Text>
        </View>

        {/* FAQ / Support Contact */}
        <Pressable
          style={styles.supportLink}
          onPress={() =>
            Linking.openURL(
              'mailto:astroydapps@gmail.com?subject=Budget%20Studio%20Support'
            )
          }
        >
          <Text style={styles.supportLinkText}>
            ✉ Questions? Contact Support
          </Text>
        </Pressable>
      </View>
    </>
  );

  // ─── Full-Screen Auth Wall (before sign-in) ──────────────────────────────
  if (isFullScreen) {
    const currentSlide = FEATURE_SLIDES[slideIndex];
    return (
      <View style={styles.fullScreenRoot}>
        {/* Left hero pane — animated feature carousel */}
        <View style={styles.fullScreenLeft}>
          {/* Brand lockup */}
          <View style={styles.heroBrandRow}>
            <View style={styles.heroIconBadge}>
              <Text style={styles.heroIconText}>◈</Text>
            </View>
            <Text style={styles.heroProductName}>Budget Studio</Text>
          </View>

          {/* Animated feature slide */}
          <Animated.View
            style={[
              styles.featureSlideWrap,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.featureSlideEmoji}>{currentSlide.emoji}</Text>
            <Text style={styles.featureSlideTitle}>{currentSlide.title}</Text>
            <Text style={styles.featureSlideBody}>{currentSlide.body}</Text>
          </Animated.View>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {FEATURE_SLIDES.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => setSlideIndex(i)}
                style={[
                  styles.dot,
                  i === slideIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Right auth card pane */}
        <ScrollView
          style={styles.fullScreenRight}
          contentContainerStyle={styles.fullScreenRightContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.fullScreenCard}>
            <Text style={styles.eyebrow}>BUDGET STUDIO ACCOUNT</Text>
            <Text style={styles.title}>
              {authMode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
            </Text>
            <View style={{ height: 16 }} />
            {authContent}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Modal (after sign-in, from Account button) ──────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>BUDGET STUDIO ACCOUNT</Text>
              <Text style={styles.title}>
                {session
                  ? 'Your Profile'
                  : authMode === 'signup'
                  ? 'Create Your Account'
                  : 'Welcome Back'}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {session ? (
              <View style={styles.sectionStack}>
                {/* Signed-In User Profile Card */}
                <View style={styles.profileCard}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{avatarInitial}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>{displayName}</Text>
                    <Text style={styles.profileEmail}>
                      {session.user.email}
                    </Text>
                  </View>
                </View>

                {/* Cloud Backup Status */}
                <View style={styles.syncStatusCard}>
                  <View style={styles.syncRow}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            syncStatus === 'error' ? '#FF3B30' : '#28CD41',
                        },
                      ]}
                    />
                    <Text style={styles.syncStatusTitle}>
                      {syncStatus === 'syncing'
                        ? 'Saving changes to your account...'
                        : 'Cloud Sync Active'}
                    </Text>
                  </View>
                  <Text style={styles.syncStatusBody}>
                    Your transactions, monthly budgets, and financial goals are
                    automatically backed up to your account across all devices.
                  </Text>
                </View>

                <Pressable
                  style={styles.signOutBtn}
                  onPress={handleSignOut}
                  disabled={loading}
                >
                  <Text style={styles.signOutBtnText}>Sign Out</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {feedbackMsg && (
                  <View
                    style={[
                      styles.alertBox,
                      feedbackMsg.type === 'error'
                        ? styles.alertError
                        : feedbackMsg.type === 'success'
                        ? styles.alertSuccess
                        : styles.alertInfo,
                    ]}
                  >
                    <Text
                      style={[
                        styles.alertText,
                        feedbackMsg.type === 'error'
                          ? { color: '#D70015' }
                          : feedbackMsg.type === 'success'
                          ? { color: '#1F9E32' }
                          : { color: '#0066CC' },
                      ]}
                    >
                      {feedbackMsg.text}
                    </Text>
                  </View>
                )}
                {authContent}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  eyebrow: {
    color: '#0071E3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  title: {
    color: '#1D1D1F',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#6E6E73',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 4,
  },
  alertBox: {
    padding: 12,
    borderRadius: 14,
  },
  alertError: {
    backgroundColor: '#FFECEB',
  },
  alertSuccess: {
    backgroundColor: 'rgba(40, 205, 65, 0.14)',
  },
  alertInfo: {
    backgroundColor: '#E8F2FF',
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  sectionStack: {
    gap: 14,
  },
  authModeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    padding: 4,
    borderRadius: 980,
  },
  authModeOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 980,
    alignItems: 'center',
  },
  authModeOptionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  authModeText: {
    color: '#6E6E73',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  authModeTextActive: {
    color: '#1D1D1F',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: '#6E6E73',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  textInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#1D1D1F',
    fontSize: 14,
    fontFamily: STUDIO_FONT_FAMILY,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as any)
      : null),
  },
  primaryBtn: {
    backgroundColor: '#0071E3',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 980,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  dividerText: {
    color: '#86868B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  socialBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  oauthBtn: {
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 980,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthBtnText: {
    color: '#1D1D1F',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  securityPledgeCard: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#28CD41',
    gap: 4,
  },
  securityPledgeTitle: {
    color: '#1D1D1F',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  securityPledgeBody: {
    color: '#6E6E73',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  securityPledgeEmail: {
    color: '#0071E3',
    fontWeight: '600',
  },
  supportLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  supportLinkText: {
    color: '#0071E3',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    padding: 16,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0071E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  profileName: {
    color: '#1D1D1F',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  profileEmail: {
    color: '#6E6E73',
    fontSize: 13,
    marginTop: 2,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  syncStatusCard: {
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncStatusTitle: {
    color: '#1D1D1F',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  syncStatusBody: {
    color: '#6E6E73',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  signOutBtn: {
    backgroundColor: '#FFECEB',
    paddingVertical: 12,
    borderRadius: 980,
    alignItems: 'center',
  },
  signOutBtnText: {
    color: '#D70015',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  // Full-screen auth wall — two-column layout
  fullScreenRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0071E3',
  },
  fullScreenLeft: {
    flex: 1,
    backgroundColor: '#0055CC',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 52,
    paddingVertical: 48,
    gap: 40,
    minWidth: 300,
  },
  fullScreenRight: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    maxWidth: 480,
  },
  fullScreenRightContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  heroProductName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  // Animated feature slide
  featureSlideWrap: {
    gap: 12,
    flex: 1,
    maxHeight: 220,
    justifyContent: 'center',
  },
  featureSlideEmoji: {
    fontSize: 52,
    lineHeight: 60,
  },
  featureSlideTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: STUDIO_FONT_FAMILY,
    lineHeight: 32,
  },
  featureSlideBody: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    lineHeight: 23,
    fontFamily: STUDIO_FONT_FAMILY,
    maxWidth: 360,
  },
  // Progress dots
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    borderRadius: 4,
    height: 6,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    width: 6,
  },
  // Legacy tagline (kept for safety)
  heroTagline: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  heroBullets: {
    gap: 8,
    marginTop: 8,
  },
  heroBullet: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontFamily: STUDIO_FONT_FAMILY,
    fontWeight: '500',
  },
  fullScreenCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    gap: 4,
  },
  // Legacy — kept for compatibility
  fullScreenContainer: {
    flexGrow: 1,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 48,
  },
  fullScreenHero: {
    alignItems: 'center',
    marginBottom: 36,
    gap: 10,
  },
});

