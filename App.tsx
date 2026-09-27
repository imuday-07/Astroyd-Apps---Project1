import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { AnimatedPageContainer } from './src/components/AnimatedPageContainer';
import { BudgetEditModal } from './src/components/BudgetEditModal';
import { CloudAccountModal } from './src/components/CloudAccountModal';
import { TransactionModal } from './src/components/TransactionModal';
import {
  AVAILABLE_MONTHS,
  INITIAL_BUDGET_STATE,
} from './src/data/initialData';
import { isSupabaseConfigured } from './src/lib/supabase';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import {
  deleteCloudFinancialGoal,
  deleteCloudTransaction,
  fetchCloudBudgetSnapshot,
  getCurrentSession,
  pushAllLocalStateToCloud,
  subscribeToAuthChanges,
  upsertCloudBudgetSettings,
  upsertCloudFinancialGoal,
  upsertCloudTransaction,
} from './src/services/budgetBackend';
import {
  CURRENCY_OPTIONS,
  STUDIO_FONT_FAMILY,
} from './src/theme/boostlabTheme';
import {
  ActiveTab,
  CategoryBudgetMap,
  FinancialGoal,
  Transaction,
  TransactionType,
} from './src/types/budget';
import {
  calculateMonthlySummary,
  calculateTrendSeries,
} from './src/utils/calculations';

const LEGACY_STORAGE_KEYS = [
  'boostlab_budget_mvp_v1',
  'boostlab_budget_mvp_clean_v2',
  'boostlab_budget_mvp_clean_v3',
  'boostlab_budget_mvp_clean_v4',
];

function getUserStorageKey(userId: string): string {
  return `budget_studio_user_${userId}`;
}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'budget-studio-no-focus-outline';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      input, textarea, select, [contenteditable="true"] {
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
        outline-color: transparent !important;
        box-shadow: none !important;
      }
      input:focus, input:focus-visible, textarea:focus, textarea:focus-visible {
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
        outline-color: transparent !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

const NAV_TABS: { key: ActiveTab; label: string }[] = [
  { key: 'dashboard', label: 'Overview' },
  { key: 'budgets', label: 'Envelopes' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'reports', label: 'Analytics' },
];

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktopViewport = width >= 860;

  // App State (Starts at 0 before sign-in)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState<number>(0);
  const [categoryLimits, setCategoryLimits] = useState<CategoryBudgetMap>(
    INITIAL_BUDGET_STATE.categoryLimits
  );
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState<string>(
    INITIAL_BUDGET_STATE.currencySymbol
  );
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('2026-09');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Modals
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [cloudModalVisible, setCloudModalVisible] = useState(false);
  const [betaModalVisible, setBetaModalVisible] = useState(false);

  // Auth & Cloud State
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // true until first session check resolves
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'syncing' | 'synced' | 'error'
  >('idle');

  const resetToZeroState = useCallback(() => {
    setTransactions([]);
    setMonthlyBudgetLimit(0);
    setCategoryLimits(INITIAL_BUDGET_STATE.categoryLimits);
    setFinancialGoals([]);
    setCurrencySymbol(INITIAL_BUDGET_STATE.currencySymbol);
  }, []);

  // Purge any old unauthenticated localStorage keys on startup
  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach((key) => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(key);
        } catch (_e) {
          // ignore
        }
      }
      AsyncStorage.removeItem(key).catch(() => {});
    });
  }, []);

  // Save state ONLY when a user is signed in, scoped to their user ID
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const userKey = getUserStorageKey(userId);
    const payload = JSON.stringify({
      transactions,
      monthlyBudgetLimit,
      categoryLimits,
      financialGoals,
      currencySymbol,
    });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(userKey, payload);
      } catch (_e) {
        // ignore
      }
    }
    AsyncStorage.setItem(userKey, payload).catch(() => {});
  }, [
    session?.user?.id,
    transactions,
    monthlyBudgetLimit,
    categoryLimits,
    financialGoals,
    currencySymbol,
  ]);

  // Pull signed-in user's cloud snapshot
  const pullFromCloudForUser = useCallback(
    async (userId: string) => {
      try {
        setSyncStatus('syncing');
        const snapshot = await fetchCloudBudgetSnapshot(userId);
        if (
          snapshot.transactions.length > 0 ||
          snapshot.hasRemoteSettings ||
          snapshot.financialGoals.length > 0
        ) {
          setTransactions(snapshot.transactions);
          setMonthlyBudgetLimit(snapshot.monthlyBudgetLimit);
          setCategoryLimits(snapshot.categoryLimits);
          setFinancialGoals(snapshot.financialGoals);
          setCurrencySymbol(snapshot.currencySymbol);
          setSyncStatus('synced');
        } else {
          // New account with no cloud data yet -> start clean at 0
          resetToZeroState();
          setSyncStatus('synced');
        }
      } catch (err: any) {
        setSyncStatus('error');
        throw err;
      }
    },
    [resetToZeroState]
  );

  // Initialize auth subscription
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      resetToZeroState();
      setAuthLoading(false);
      return;
    }

    getCurrentSession().then((currentSession) => {
      setSession(currentSession);
      if (currentSession?.user?.id) {
        pullFromCloudForUser(currentSession.user.id).catch(() => {});
      } else {
        resetToZeroState();
      }
      setAuthLoading(false);
    });

    const unsubscribe = subscribeToAuthChanges((newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        pullFromCloudForUser(newSession.user.id).catch(() => {});
      } else {
        resetToZeroState();
        setSyncStatus('idle');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [pullFromCloudForUser, resetToZeroState]);

  // Derived Financial Summary & Multi-Month Trends
  const monthlySummary = useMemo(
    () =>
      calculateMonthlySummary(
        transactions,
        selectedMonthKey,
        monthlyBudgetLimit,
        categoryLimits
      ),
    [transactions, selectedMonthKey, monthlyBudgetLimit, categoryLimits]
  );

  const trendSeries = useMemo(
    () => calculateTrendSeries(transactions),
    [transactions]
  );

  // Handlers
  const handleOpenAddModal = (type: TransactionType = 'expense') => {
    setEditingTx(null);
    setTxModalType(type);
    setTxModalVisible(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setTxModalType(tx.type);
    setTxModalVisible(true);
  };

  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id'>,
    existingId?: string
  ) => {
    const savedTx: Transaction = existingId
      ? { ...txData, id: existingId }
      : { ...txData, id: `tx-${Date.now()}` };

    if (existingId) {
      setTransactions((prev) =>
        prev.map((item) => (item.id === existingId ? savedTx : item))
      );
    } else {
      setTransactions((prev) => [savedTx, ...prev]);
    }

    // Automatically sync to account if user is signed in
    if (session?.user?.id) {
      setSyncStatus('syncing');
      upsertCloudTransaction(session.user.id, savedTx)
        .then(() => {
          setSyncStatus('synced');
        })
        .catch(() => {
          setSyncStatus('error');
        });
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));

    if (session?.user?.id) {
      setSyncStatus('syncing');
      deleteCloudTransaction(session.user.id, id)
        .then(() => {
          setSyncStatus('synced');
        })
        .catch(() => {
          setSyncStatus('error');
        });
    }
  };

  const handleSaveBudgetLimits = (
    newMonthly: number,
    newCategoryMap: CategoryBudgetMap
  ) => {
    setMonthlyBudgetLimit(newMonthly);
    setCategoryLimits(newCategoryMap);

    if (session?.user?.id) {
      setSyncStatus('syncing');
      upsertCloudBudgetSettings(
        session.user.id,
        newMonthly,
        newCategoryMap,
        currencySymbol
      )
        .then(() => {
          setSyncStatus('synced');
        })
        .catch(() => {
          setSyncStatus('error');
        });
    }
  };

  const handleCycleCurrency = () => {
    const idx = CURRENCY_OPTIONS.findIndex((c) => c.symbol === currencySymbol);
    const next = CURRENCY_OPTIONS[(idx + 1) % CURRENCY_OPTIONS.length];
    setCurrencySymbol(next.symbol);

    if (session?.user?.id) {
      upsertCloudBudgetSettings(
        session.user.id,
        monthlyBudgetLimit,
        categoryLimits,
        next.symbol
      ).catch(() => {});
    }
  };

  const handleSaveFinancialGoal = (goal: FinancialGoal) => {
    setFinancialGoals((prev) => {
      const exists = prev.some((g) => g.id === goal.id);
      return exists
        ? prev.map((g) => (g.id === goal.id ? goal : g))
        : [...prev, goal];
    });

    if (session?.user?.id) {
      setSyncStatus('syncing');
      upsertCloudFinancialGoal(session.user.id, goal)
        .then(() => {
          setSyncStatus('synced');
        })
        .catch(() => {
          setSyncStatus('error');
        });
    }
  };

  const handleDeleteFinancialGoal = (goalId: string) => {
    setFinancialGoals((prev) => prev.filter((g) => g.id !== goalId));

    if (session?.user?.id) {
      setSyncStatus('syncing');
      deleteCloudFinancialGoal(session.user.id, goalId)
        .then(() => {
          setSyncStatus('synced');
        })
        .catch(() => {
          setSyncStatus('error');
        });
    }
  };

  // ─── LOADING: wait for auth check ───────────────────────────────────────────
  if (authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.authLoadingWrap}>
          <View style={styles.studioIconBadge}>
            <Text style={styles.studioIconText}>◈</Text>
          </View>
          <Text style={styles.authLoadingTitle}>Budget Studio</Text>
          <Text style={styles.authLoadingCaption}>
            Checking your session…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── NOT SIGNED IN: full-screen login wall ────────────────────────────────
  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <CloudAccountModal
          visible={true}
          session={null}
          syncStatus="idle"
          onClose={() => {}}
          onAuthSuccess={(newSession) => {
            setSession(newSession);
            if (newSession?.user?.id) {
              // Detect new signup: created_at equals updated_at within 10 seconds
              const createdAt = newSession.user.created_at
                ? new Date(newSession.user.created_at).getTime()
                : 0;
              const now = Date.now();
              const isNewSignup = now - createdAt < 10_000;
              if (isNewSignup) {
                setBetaModalVisible(true);
              }
              pullFromCloudForUser(newSession.user.id).catch(() => {});
            }
          }}
          isFullScreen
        />
      </SafeAreaView>
    );
  }

  // ─── SIGNED IN: full app ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* =====================================================================
          STICKY TOP NAVIGATION BAR
         ===================================================================== */}
      <View style={styles.stickyNavOuter}>
        <View style={styles.stickyNavInner}>
          {/* Brand Lockup */}
          <Pressable
            style={styles.brandRow}
            onPress={() => setActiveTab('dashboard')}
          >
            <View style={styles.studioIconBadge}>
              <Text style={styles.studioIconText}>◈</Text>
            </View>
            <Text style={styles.brandProductTitle}>Budget Studio</Text>
          </Pressable>

          {/* Center Navigation Links (Desktop) */}
          {isDesktopViewport && (
            <View style={styles.centerNavMenu}>
              {NAV_TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    style={[
                      styles.centerNavItem,
                      isActive && styles.centerNavItemActive,
                    ]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Text
                      style={[
                        styles.centerNavText,
                        isActive && styles.centerNavTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Right Controls: Account, Currency, Limits, and Primary CTA */}
          <View style={styles.rightControls}>
            <Pressable
              style={styles.cloudPillBtn}
              onPress={() => setCloudModalVisible(true)}
            >
              {session && (
                <View
                  style={[
                    styles.cloudStatusDot,
                    {
                      backgroundColor:
                        syncStatus === 'error' ? '#FF3B30' : '#28CD41',
                    },
                  ]}
                />
              )}
              <Text style={styles.pillControlText}>
                {session ? 'Account' : 'Sign In'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.pillControlBtn}
              onPress={handleCycleCurrency}
            >
              <Text style={styles.pillControlText}>{currencySymbol}</Text>
            </Pressable>

            <Pressable
              style={styles.pillControlBtn}
              onPress={() => setBudgetModalVisible(true)}
            >
              <Text style={styles.pillControlText}>Limits</Text>
            </Pressable>

            <Pressable
              style={styles.primaryActionPill}
              onPress={() => handleOpenAddModal('expense')}
            >
              <Text style={styles.primaryActionPillText}>+ Add Entry</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Main Scrollable Page Canvas */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.pageScrollContent,
          !isDesktopViewport && { paddingBottom: 116 },
        ]}
      >
        <View style={styles.centeredContentWrap}>
          {/* Clean Month Switcher Strip */}
          <View style={styles.monthRibbonRow}>
            <Text style={styles.monthRibbonLabel}>ACTIVE PERIOD</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthPillsScroll}
            >
              {AVAILABLE_MONTHS.map((m) => {
                const isSelected = selectedMonthKey === m.key;
                return (
                  <Pressable
                    key={m.key}
                    style={[
                      styles.monthPill,
                      isSelected && styles.monthPillActive,
                    ]}
                    onPress={() => setSelectedMonthKey(m.key)}
                  >
                    <Text
                      style={[
                        styles.monthPillText,
                        isSelected && styles.monthPillTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Seamless Animated Main Tab Stage */}
          <AnimatedPageContainer
            pageKey={`${activeTab}-${selectedMonthKey}`}
            direction="vertical"
          >
            {activeTab === 'dashboard' && (
              <DashboardScreen
                summary={monthlySummary}
                currencySymbol={currencySymbol}
                isWideWeb={isDesktopViewport}
                onOpenAddModal={handleOpenAddModal}
                onEditTransaction={handleEditTransaction}
                onQuickAddTransaction={(txData) => handleSaveTransaction(txData)}
                onOpenBudgetModal={() => setBudgetModalVisible(true)}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'budgets' && (
              <BudgetScreen
                summary={monthlySummary}
                currencySymbol={currencySymbol}
                isWideWeb={isDesktopViewport}
                financialGoals={financialGoals}
                onOpenBudgetModal={() => setBudgetModalVisible(true)}
                onSaveFinancialGoal={handleSaveFinancialGoal}
                onDeleteFinancialGoal={handleDeleteFinancialGoal}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsScreen
                summary={monthlySummary}
                currencySymbol={currencySymbol}
                isWideWeb={isDesktopViewport}
                onOpenAddModal={handleOpenAddModal}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsScreen
                summary={monthlySummary}
                trendSeries={trendSeries}
                currencySymbol={currencySymbol}
                isWideWeb={isDesktopViewport}
              />
            )}
          </AnimatedPageContainer>

          {/* Breadcrumb Footer */}
          <View style={styles.studioFooter}>
            <View style={styles.footerBreadcrumb}>
              <Text style={styles.footerTextStrong}>◈</Text>
              <Text style={styles.footerChevron}>›</Text>
              <Text style={styles.footerText}>Personal Finance</Text>
              <Text style={styles.footerChevron}>›</Text>
              <Text style={styles.footerTextStrong}>Budget Studio</Text>
            </View>
            <Text style={styles.footerCaption}>
              Personal Budget Calculator & Cashflow Studio.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Compact Mobile Floating Bottom Pill Bar */}
      {!isDesktopViewport && (
        <View style={styles.mobileDockOuter}>
          <View style={styles.mobileDockInner}>
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[
                    styles.mobileDockItem,
                    isActive && styles.mobileDockItemActive,
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text
                    style={[
                      styles.mobileDockText,
                      isActive && styles.mobileDockTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Modals */}
      <TransactionModal
        visible={txModalVisible}
        initialType={txModalType}
        editingTransaction={editingTx}
        currencySymbol={currencySymbol}
        selectedMonthKey={selectedMonthKey}
        onClose={() => setTxModalVisible(false)}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
      />

      <BudgetEditModal
        visible={budgetModalVisible}
        monthlyBudgetLimit={monthlyBudgetLimit}
        categoryLimits={categoryLimits}
        currencySymbol={currencySymbol}
        onClose={() => setBudgetModalVisible(false)}
        onSave={handleSaveBudgetLimits}
      />

      <CloudAccountModal
        visible={cloudModalVisible}
        session={session}
        syncStatus={syncStatus}
        onClose={() => setCloudModalVisible(false)}
        onAuthSuccess={(newSession) => {
          setSession(newSession);
          if (newSession?.user?.id) {
            pullFromCloudForUser(newSession.user.id).catch(() => {});
          } else {
            setSyncStatus('idle');
          }
        }}
      />

      {/* ── Beta Stage Announcement Modal ─────────────────────────────── */}
      {betaModalVisible && (
        <Modal
          visible={betaModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setBetaModalVisible(false)}
        >
          <View style={styles.betaBackdrop}>
            <View style={styles.betaCard}>
              <View style={styles.betaBadgeRow}>
                <View style={styles.betaBadge}>
                  <Text style={styles.betaBadgeText}>BETA</Text>
                </View>
              </View>
              <Text style={styles.betaTitle}>
                Welcome to Budget Studio! 🎉
              </Text>
              <Text style={styles.betaBody}>
                You've joined early — Budget Studio is currently in{' '}
                <Text style={{ fontWeight: '700', color: '#FF9500' }}>
                  public beta
                </Text>
                .{'\n\n'}
                Features are still being added and you may occasionally encounter
                rough edges. We appreciate your patience and feedback!{'\n\n'}
                Questions or feedback? Reach us at{' '}
                <Text style={{ color: '#0071E3', fontWeight: '600' }}>
                  astroydapps@gmail.com
                </Text>
                .
              </Text>
              <Pressable
                style={styles.betaBtn}
                onPress={() => setBetaModalVisible(false)}
              >
                <Text style={styles.betaBtnText}>Got it, let's go →</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },

  /* Sticky Top Navigation */
  stickyNavOuter: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  stickyNavInner: {
    width: '100%',
    maxWidth: 1380,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studioIconBadge: {
    backgroundColor: '#1D1D1F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  studioIconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  brandProductTitle: {
    color: '#1D1D1F',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: STUDIO_FONT_FAMILY,
  },

  centerNavMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    padding: 4,
    borderRadius: 980,
    gap: 2,
  },
  centerNavItem: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 980,
  },
  centerNavItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  centerNavText: {
    color: '#6E6E73',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  centerNavTextActive: {
    color: '#1D1D1F',
  },

  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cloudPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 980,
  },
  cloudStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillControlBtn: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 980,
  },
  pillControlText: {
    color: '#1D1D1F',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  primaryActionPill: {
    backgroundColor: '#0071E3',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 980,
  },
  primaryActionPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },

  /* Page Scroll & Wide Container so Left & Right Side Spaces Flank the Center Stage */
  pageScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 56,
  },
  centeredContentWrap: {
    width: '100%',
    maxWidth: 1380,
    alignSelf: 'center',
    gap: 20,
  },

  /* Month Selector Ribbon */
  monthRibbonRow: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 4,
  },
  monthRibbonLabel: {
    color: '#6E6E73',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  monthPillsScroll: {
    gap: 8,
  },
  monthPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  monthPillActive: {
    backgroundColor: '#1D1D1F',
    borderColor: '#1D1D1F',
  },
  monthPillText: {
    color: '#6E6E73',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  monthPillTextActive: {
    color: '#FFFFFF',
  },

  /* Footer */
  studioFooter: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    marginTop: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#D2D2D7',
    gap: 8,
  },
  footerBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerTextStrong: {
    color: '#1D1D1F',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  footerText: {
    color: '#6E6E73',
    fontSize: 12,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  footerChevron: {
    color: '#86868B',
    fontSize: 12,
  },
  footerCaption: {
    color: '#86868B',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: STUDIO_FONT_FAMILY,
  },

  /* Mobile Floating Tab Bar */
  mobileDockOuter: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  mobileDockInner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(29, 29, 31, 0.94)',
    padding: 5,
    borderRadius: 980,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  mobileDockItem: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 980,
  },
  mobileDockItemActive: {
    backgroundColor: '#0071E3',
  },
  mobileDockText: {
    color: '#A1A1A6',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  mobileDockTextActive: {
    color: '#FFFFFF',
  },
  authLoadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#F5F5F7',
  },
  authLoadingTitle: {
    color: '#1D1D1F',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  authLoadingCaption: {
    color: '#86868B',
    fontSize: 14,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  betaBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  betaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    maxWidth: 420,
    width: '100%',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
  },
  betaBadgeRow: {
    flexDirection: 'row',
  },
  betaBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  betaBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  betaTitle: {
    color: '#1D1D1F',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  betaBody: {
    color: '#3A3A3C',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  betaBtn: {
    backgroundColor: '#0071E3',
    borderRadius: 980,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  betaBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
});


