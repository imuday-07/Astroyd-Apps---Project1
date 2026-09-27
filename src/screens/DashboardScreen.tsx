import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SubPageDeck, SubPageItem } from '../components/SubPageDeck';
import {
  CATEGORY_META,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  STUDIO_COLORS,
  STUDIO_FONT_FAMILY,
} from '../theme/boostlabTheme';
import {
  ActiveTab,
  CategoryName,
  Transaction,
  TransactionType,
} from '../types/budget';
import { formatCurrency, MonthlySummary } from '../utils/calculations';

interface DashboardScreenProps {
  summary: MonthlySummary;
  currencySymbol: string;
  isWideWeb: boolean;
  onOpenAddModal: (type: TransactionType) => void;
  onEditTransaction: (tx: Transaction) => void;
  onQuickAddTransaction?: (tx: Omit<Transaction, 'id'>) => void;
  onOpenBudgetModal: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

type OverviewSubPage = 'balance' | 'calculator' | 'envelopes' | 'activity';

const QUICK_PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  summary,
  currencySymbol,
  isWideWeb,
  onOpenAddModal,
  onEditTransaction,
  onQuickAddTransaction,
  onOpenBudgetModal,
  onNavigateTab,
}) => {
  const [subPage, setSubPage] = useState<OverviewSubPage>('balance');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    'all' | CategoryName
  >('all');

  // Interactive What-If / Quick Calculator State
  const [calcType, setCalcType] = useState<TransactionType>('expense');
  const [calcAmount, setCalcAmount] = useState<string>('');
  const [calcTitle, setCalcTitle] = useState<string>('');
  const [calcCategory, setCalcCategory] = useState<CategoryName>('Food');

  const isOverBudget = summary.remainingBudget < 0;
  const dailyAllowance = Math.max(0, summary.remainingBudget / 30);

  const subPages: SubPageItem[] = useMemo(
    () => [
      { key: 'balance', title: 'Live Balance', badge: 'Hero' },
      { key: 'calculator', title: 'Instant Calculator', badge: 'Simulate' },
      { key: 'envelopes', title: 'Pace & Envelopes' },
      {
        key: 'activity',
        title: 'Recent Activity',
        badge: String(summary.monthTransactions.length),
      },
    ],
    [summary.monthTransactions.length]
  );

  // Active expense categories for the spending spectrum bar
  const activeExpenseBreakdown = useMemo(
    () => summary.expenseSummaries.filter((item) => item.spent > 0),
    [summary.expenseSummaries]
  );

  // Needs / Wants / Savings 50-30-20 calculation
  const rule503020 = useMemo(() => {
    const needsNames: CategoryName[] = ['Rent', 'Bills', 'EMI', 'Food'];
    const needsSpent = summary.expenseSummaries
      .filter((c) => needsNames.includes(c.category))
      .reduce((acc, c) => acc + c.spent, 0);
    const wantsSpent = Math.max(0, summary.totalExpenses - needsSpent);
    const incomeBase = Math.max(summary.totalIncome, 1);

    return {
      needsPct: Math.min(100, (needsSpent / incomeBase) * 100),
      wantsPct: Math.min(100, (wantsSpent / incomeBase) * 100),
      savingsPct: Math.max(0, summary.savingsPercentage),
      needsSpent,
      wantsSpent,
    };
  }, [summary]);

  // Live What-If preview calculation
  const parsedCalcAmount = useMemo(() => {
    const num = parseFloat(calcAmount.replace(/[^0-9.]/g, ''));
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [calcAmount]);

  const projectedRemainingBudget =
    calcType === 'expense'
      ? summary.remainingBudget - parsedCalcAmount
      : summary.remainingBudget;

  const projectedNetSavings =
    calcType === 'expense'
      ? summary.remainingBalance - parsedCalcAmount
      : summary.remainingBalance + parsedCalcAmount;

  const projectedDailyAllowance = Math.max(0, projectedRemainingBudget / 30);

  const handleAddPresetAmount = (delta: number) => {
    const next = parsedCalcAmount + delta;
    setCalcAmount(String(next));
  };

  const handleQuickSubmit = () => {
    if (!parsedCalcAmount || !onQuickAddTransaction) {
      onOpenAddModal(calcType);
      return;
    }
    const todayDate = `${summary.monthKey}-26`;
    onQuickAddTransaction({
      title:
        calcTitle.trim() ||
        `${calcCategory} ${calcType === 'income' ? 'Income' : 'Expense'}`,
      amount: parsedCalcAmount,
      type: calcType,
      category: calcCategory,
      date: todayDate,
      notes: 'Added via Instant Calculator',
    });
    setCalcAmount('');
    setCalcTitle('');
    setSubPage('activity');
  };

  const filteredTransactions = useMemo(() => {
    if (selectedCategoryFilter === 'all') {
      return summary.monthTransactions.slice(0, 7);
    }
    return summary.monthTransactions
      .filter((t) => t.category === selectedCategoryFilter)
      .slice(0, 7);
  }, [summary.monthTransactions, selectedCategoryFilter]);

  const availableQuickCategories: CategoryName[] =
    calcType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <SubPageDeck
      pages={subPages}
      activeKey={subPage}
      onSelectPage={(k) => setSubPage(k as OverviewSubPage)}
      isCompactMobile={!isWideWeb}
    >
      {/* =====================================================================
          SUB-PAGE 1: LIVE BALANCE & SPECTRUM HERO
         ===================================================================== */}
      {subPage === 'balance' && (
        <View style={[styles.heroCard, isWideWeb && styles.heroCardWide]}>
          <View style={styles.heroHeaderCenter}>
            <View style={styles.badgeRow}>
              <View style={styles.darkBadgePill}>
                <Text style={styles.darkBadgePillText}>◈ STUDIO</Text>
              </View>
              <Text style={styles.heroEyebrowLabel}>
                PERSONAL FINANCE & BUDGET CALCULATOR
              </Text>
            </View>

            <Text
              style={[
                styles.heroMainHeadline,
                isWideWeb && styles.heroMainHeadlineWide,
              ]}
            >
              Effortless budgeting.{'\n'}Financial clarity in every sense.
            </Text>
          </View>

          {/* Widescreen Financial Summary Centerpiece */}
          <View style={styles.displayBezelOuter}>
            <View
              style={[
                styles.displayScreenInner,
                isWideWeb && styles.displayScreenInnerWide,
              ]}
            >
              <View style={styles.displayStatusBar}>
                <View style={styles.displayStatusLeft}>
                  <Text style={styles.displayBrandMark}>Budget Studio</Text>
                  <View style={styles.liveTag}>
                    <Text style={styles.liveTagText}>LIVE LEDGER</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.budgetHealthPill,
                    isOverBudget
                      ? styles.budgetHealthPillDanger
                      : styles.budgetHealthPillPositive,
                  ]}
                >
                  <View
                    style={[
                      styles.healthDot,
                      { backgroundColor: isOverBudget ? '#FF453A' : '#30D158' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.budgetHealthPillText,
                      { color: isOverBudget ? '#FF6961' : '#30D158' },
                    ]}
                  >
                    {isOverBudget
                      ? `${formatCurrency(Math.abs(summary.remainingBudget), currencySymbol)} Over Cap`
                      : `${Math.max(0, 100 - summary.budgetPercentageUsed).toFixed(0)}% Cap Available`}
                  </Text>
                </View>
              </View>

              <View style={styles.primaryReadout}>
                <Text style={styles.readoutOverline}>NET MONTHLY BALANCE</Text>
                <Text
                  style={[
                    styles.readoutBigNumber,
                    isWideWeb && styles.readoutBigNumberWide,
                  ]}
                >
                  {formatCurrency(summary.remainingBalance, currencySymbol)}
                </Text>
                <Text style={styles.readoutSubline}>
                  {formatCurrency(
                    Math.max(0, summary.remainingBudget),
                    currencySymbol
                  )}{' '}
                  remaining of{' '}
                  {formatCurrency(summary.monthlyBudget, currencySymbol)} monthly
                  budget limit
                </Text>
              </View>

              <View style={styles.spectrumContainer}>
                <View style={styles.spectrumHeaderRow}>
                  <Text style={styles.spectrumTitle}>
                    MONTHLY SPENDING SPECTRUM
                  </Text>
                  <Text style={styles.spectrumRightMeta}>
                    {formatCurrency(summary.totalExpenses, currencySymbol)}{' '}
                    spent ({summary.budgetPercentageUsed.toFixed(1)}% of limit)
                  </Text>
                </View>

                <View style={styles.spectrumTrack}>
                  {activeExpenseBreakdown.length > 0 ? (
                    activeExpenseBreakdown.map((item) => {
                      const widthPct = Math.max(
                        4,
                        (item.spent / Math.max(summary.totalExpenses, 1)) * 100
                      );
                      return (
                        <View
                          key={item.category}
                          style={[
                            styles.spectrumSegment,
                            {
                              flex: widthPct,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      );
                    })
                  ) : (
                    <View
                      style={[
                        styles.spectrumSegment,
                        { flex: 1, backgroundColor: '#2C2C2E' },
                      ]}
                    />
                  )}
                </View>

                <View style={styles.spectrumLegendRow}>
                  {activeExpenseBreakdown.slice(0, 6).map((item) => (
                    <Pressable
                      key={item.category}
                      style={styles.legendChip}
                      onPress={() => {
                        setSelectedCategoryFilter(item.category);
                        setSubPage('activity');
                      }}
                    >
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text style={styles.legendName}>{item.category}</Text>
                      <Text style={styles.legendVal}>
                        {formatCurrency(item.spent, currencySymbol, true)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={[styles.kpiGrid, isWideWeb && styles.kpiGridWide]}>
                <Pressable
                  style={styles.kpiCard}
                  onPress={() => onOpenAddModal('income')}
                >
                  <Text style={styles.kpiLabel}>TOTAL INCOME</Text>
                  <Text style={[styles.kpiValue, { color: '#30D158' }]}>
                    +{formatCurrency(summary.totalIncome, currencySymbol)}
                  </Text>
                  <Text style={styles.kpiHint}>Tap to add income ›</Text>
                </Pressable>

                <Pressable
                  style={styles.kpiCard}
                  onPress={() => onOpenAddModal('expense')}
                >
                  <Text style={styles.kpiLabel}>TOTAL SPENT</Text>
                  <Text style={[styles.kpiValue, { color: '#FF453A' }]}>
                    -{formatCurrency(summary.totalExpenses, currencySymbol)}
                  </Text>
                  <Text style={styles.kpiHint}>
                    {
                      summary.monthTransactions.filter(
                        (t) => t.type === 'expense'
                      ).length
                    }{' '}
                    expenses ›
                  </Text>
                </Pressable>

                <Pressable style={styles.kpiCard} onPress={onOpenBudgetModal}>
                  <Text style={styles.kpiLabel}>REMAINING CAP</Text>
                  <Text style={[styles.kpiValue, { color: '#2997FF' }]}>
                    {formatCurrency(summary.remainingBudget, currencySymbol)}
                  </Text>
                  <Text style={styles.kpiHint}>Adjust budget cap ›</Text>
                </Pressable>

                <Pressable
                  style={styles.kpiCard}
                  onPress={() => setSubPage('envelopes')}
                >
                  <Text style={styles.kpiLabel}>SAVINGS RATE</Text>
                  <Text style={[styles.kpiValue, { color: '#BF5AF2' }]}>
                    {summary.savingsPercentage.toFixed(1)}%
                  </Text>
                  <Text style={styles.kpiHint}>
                    {formatCurrency(dailyAllowance, currencySymbol, true)}/day
                    safe ›
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.heroActionBar}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => setSubPage('calculator')}
            >
              <Text style={styles.primaryBtnText}>
                Open Instant Calculator ›
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => onOpenAddModal('expense')}
            >
              <Text style={styles.secondaryBtnText}>+ Record Expense</Text>
            </Pressable>

            <Pressable style={styles.ghostLinkBtn} onPress={onOpenBudgetModal}>
              <Text style={styles.ghostLinkText}>
                Calibrate Monthly Limits ›
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* =====================================================================
          SUB-PAGE 2: DEDICATED INSTANT BUDGET CALCULATOR
         ===================================================================== */}
      {subPage === 'calculator' && (
        <View style={styles.bentoWhiteCard}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.blueEyebrow}>
                WHAT-IF SIMULATOR & QUICK ENTRY
              </Text>
              <Text style={styles.bentoSectionTitle}>
                Instant Budget Calculator
              </Text>
              <Text style={styles.cardSubcopy}>
                Type an amount or tap quick presets below to preview the exact
                impact on your monthly cap and daily allowance before saving.
              </Text>
            </View>

            <View style={styles.segmentedControl}>
              <Pressable
                style={[
                  styles.segmentBtn,
                  calcType === 'expense' && styles.segmentBtnActive,
                ]}
                onPress={() => {
                  setCalcType('expense');
                  setCalcCategory('Food');
                }}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    calcType === 'expense' && styles.segmentBtnTextActive,
                  ]}
                >
                  Expense
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentBtn,
                  calcType === 'income' && styles.segmentBtnActive,
                ]}
                onPress={() => {
                  setCalcType('income');
                  setCalcCategory('Salary');
                }}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    calcType === 'income' && styles.segmentBtnTextActive,
                  ]}
                >
                  Income
                </Text>
              </Pressable>
            </View>
          </View>

          <View
            style={[
              styles.calculatorGrid,
              isWideWeb && styles.calculatorGridWide,
            ]}
          >
            <View style={styles.calculatorInputsCol}>
              <View style={styles.calcInputRow}>
                <View style={styles.calcAmountFieldWrap}>
                  <Text style={styles.calcCurrencyPrefix}>
                    {currencySymbol}
                  </Text>
                  <TextInput
                    style={styles.calcAmountInput}
                    value={calcAmount}
                    onChangeText={setCalcAmount}
                    placeholder="0.00"
                    placeholderTextColor="#A1A1A6"
                    keyboardType="numeric"
                  />
                </View>

                <TextInput
                  style={styles.calcTitleInput}
                  value={calcTitle}
                  onChangeText={setCalcTitle}
                  placeholder={
                    calcType === 'expense'
                      ? 'What is this expense for?'
                      : 'Income source (e.g., Bonus, Client)'
                  }
                  placeholderTextColor="#A1A1A6"
                />
              </View>

              {/* Quick Calculator Preset Buttons */}
              <View style={styles.presetPillsRow}>
                <Text style={styles.presetRowLabel}>QUICK ADD:</Text>
                {QUICK_PRESET_AMOUNTS.map((amt) => (
                  <Pressable
                    key={amt}
                    style={styles.presetChip}
                    onPress={() => handleAddPresetAmount(amt)}
                  >
                    <Text style={styles.presetChipText}>
                      +{currencySymbol}
                      {amt}
                    </Text>
                  </Pressable>
                ))}
                {parsedCalcAmount > 0 && (
                  <Pressable
                    style={styles.presetClearChip}
                    onPress={() => setCalcAmount('')}
                  >
                    <Text style={styles.presetClearText}>Reset</Text>
                  </Pressable>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.calcCategoryRow}
              >
                {availableQuickCategories.map((catName) => {
                  const meta = CATEGORY_META[catName];
                  const isSelected = calcCategory === catName;
                  return (
                    <Pressable
                      key={catName}
                      style={[
                        styles.calcCategoryChip,
                        isSelected && {
                          backgroundColor: '#1D1D1F',
                          borderColor: '#1D1D1F',
                        },
                      ]}
                      onPress={() => setCalcCategory(catName)}
                    >
                      <Text style={styles.calcCategoryIcon}>{meta.icon}</Text>
                      <Text
                        style={[
                          styles.calcCategoryLabel,
                          isSelected && { color: '#FFFFFF', fontWeight: '600' },
                        ]}
                      >
                        {catName}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.calculatorPreviewCol}>
              <View style={styles.calcImpactBox}>
                <View style={styles.calcImpactItem}>
                  <Text style={styles.calcImpactLabel}>
                    PROJECTED REMAINING CAP
                  </Text>
                  <Text
                    style={[
                      styles.calcImpactValue,
                      {
                        color:
                          projectedRemainingBudget < 0
                            ? STUDIO_COLORS.danger
                            : STUDIO_COLORS.textPrimary,
                      },
                    ]}
                  >
                    {formatCurrency(projectedRemainingBudget, currencySymbol)}
                  </Text>
                </View>
                <View style={styles.calcImpactDivider} />
                <View style={styles.calcImpactItem}>
                  <Text style={styles.calcImpactLabel}>PROJECTED BALANCE</Text>
                  <Text
                    style={[
                      styles.calcImpactValue,
                      {
                        color:
                          projectedNetSavings >= 0
                            ? STUDIO_COLORS.positiveDark
                            : STUDIO_COLORS.danger,
                      },
                    ]}
                  >
                    {formatCurrency(projectedNetSavings, currencySymbol)}
                  </Text>
                </View>
              </View>

              <View style={styles.dailyImpactStrip}>
                <Text style={styles.dailyImpactText}>
                  New Daily Safe-to-Spend:{' '}
                  <Text style={styles.dailyImpactStrong}>
                    {formatCurrency(projectedDailyAllowance, currencySymbol)} /
                    day
                  </Text>
                </Text>
              </View>

              <Pressable
                style={[
                  styles.calcSubmitBtn,
                  !parsedCalcAmount && styles.calcSubmitBtnSubtle,
                ]}
                onPress={handleQuickSubmit}
              >
                <Text style={styles.calcSubmitBtnText}>
                  {parsedCalcAmount > 0
                    ? `Save ${formatCurrency(parsedCalcAmount, currencySymbol)} to Ledger`
                    : 'Open Full Entry Sheet'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* =====================================================================
          SUB-PAGE 3: DAILY PACE, 50/30/20 & ENVELOPES
         ===================================================================== */}
      {subPage === 'envelopes' && (
        <View style={[styles.bentoTwoCol, isWideWeb && styles.bentoTwoColWide]}>
          <View style={[styles.bentoWhiteCard, styles.bentoMainCol]}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.blueEyebrow}>MONTHLY ENVELOPES</Text>
                <Text style={styles.bentoSectionTitle}>
                  Every category under control.
                </Text>
              </View>
              <Pressable
                style={styles.pillLinkButton}
                onPress={() => onNavigateTab('budgets')}
              >
                <Text style={styles.pillLinkButtonText}>All Envelopes ›</Text>
              </Pressable>
            </View>

            <View style={styles.envelopeList}>
              {summary.expenseSummaries.slice(0, 6).map((item) => {
                const isOver = item.spent > item.limit && item.limit > 0;
                const pct = Math.min(100, item.percentUsed);
                const barColor = isOver
                  ? STUDIO_COLORS.danger
                  : item.percentUsed >= 85
                    ? STUDIO_COLORS.warning
                    : item.color;

                return (
                  <Pressable
                    key={item.category}
                    style={styles.envelopeRow}
                    onPress={onOpenBudgetModal}
                  >
                    <View
                      style={[
                        styles.envelopeIconBox,
                        { backgroundColor: `${item.color}18` },
                      ]}
                    >
                      <Text style={styles.envelopeEmoji}>{item.icon}</Text>
                    </View>

                    <View style={styles.envelopeBody}>
                      <View style={styles.envelopeTopLine}>
                        <Text style={styles.envelopeName}>{item.category}</Text>
                        <Text style={styles.envelopeNumbers}>
                          <Text style={styles.envelopeSpentStrong}>
                            {formatCurrency(item.spent, currencySymbol)}
                          </Text>{' '}
                          / {formatCurrency(item.limit, currencySymbol)}
                        </Text>
                      </View>

                      <View style={styles.envelopeTrack}>
                        <View
                          style={[
                            styles.envelopeFill,
                            {
                              width: `${Math.max(pct, item.spent > 0 ? 4 : 0)}%`,
                              backgroundColor: barColor,
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.envelopeBottomLine}>
                        <Text
                          style={[
                            styles.envelopeStatusText,
                            isOver && {
                              color: STUDIO_COLORS.danger,
                              fontWeight: '600',
                            },
                          ]}
                        >
                          {isOver
                            ? `Exceeded by ${formatCurrency(Math.abs(item.remaining), currencySymbol)}`
                            : `${formatCurrency(Math.max(0, item.remaining), currencySymbol)} available`}
                        </Text>
                        <Text style={styles.envelopePctText}>
                          {item.percentUsed.toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.bentoSideStack}>
            <View style={styles.bentoWhiteCard}>
              <Text
                style={[
                  styles.blueEyebrow,
                  { color: STUDIO_COLORS.positiveDark },
                ]}
              >
                DAILY SAFE-TO-SPEND
              </Text>
              <Text style={styles.bigBentoMetric}>
                {formatCurrency(dailyAllowance, currencySymbol)}
                <Text style={styles.bigBentoMetricUnit}> / day</Text>
              </Text>
              <Text style={styles.bentoLeadCopy}>
                <Text style={styles.bentoLeadBold}>
                  Calibrated for the month.{' '}
                </Text>
                Based on your remaining budget of{' '}
                {formatCurrency(
                  Math.max(0, summary.remainingBudget),
                  currencySymbol
                )}
                , this is your comfortable daily allowance.
              </Text>

              <View style={styles.miniMetricPair}>
                <View style={styles.miniMetricBox}>
                  <Text style={styles.miniMetricLabel}>FIXED ESSENTIALS</Text>
                  <Text style={styles.miniMetricVal}>
                    {formatCurrency(rule503020.needsSpent, currencySymbol)}
                  </Text>
                </View>
                <View style={styles.miniMetricBox}>
                  <Text style={styles.miniMetricLabel}>LIFESTYLE & WANTS</Text>
                  <Text style={styles.miniMetricVal}>
                    {formatCurrency(rule503020.wantsSpent, currencySymbol)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.bentoDarkCard}>
              <View style={styles.darkCardHeader}>
                <Text style={styles.darkCardEyebrow}>
                  50 / 30 / 20 BENCHMARK
                </Text>
                <Pressable onPress={() => onNavigateTab('reports')}>
                  <Text style={styles.darkCardLink}>Full Report ›</Text>
                </Pressable>
              </View>
              <Text style={styles.darkCardHeadline}>
                Balanced allocation across Needs, Wants, and Savings.
              </Text>

              <View style={styles.benchmarkBarsList}>
                <View style={styles.benchmarkRow}>
                  <View style={styles.benchmarkLabelLine}>
                    <Text style={styles.benchmarkTitle}>
                      Needs (Target ≤ 50%)
                    </Text>
                    <Text style={styles.benchmarkValue}>
                      {rule503020.needsPct.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.benchmarkTrack}>
                    <View
                      style={[
                        styles.benchmarkFill,
                        {
                          width: `${Math.min(100, rule503020.needsPct)}%`,
                          backgroundColor: '#2997FF',
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.benchmarkRow}>
                  <View style={styles.benchmarkLabelLine}>
                    <Text style={styles.benchmarkTitle}>
                      Wants (Target ≤ 30%)
                    </Text>
                    <Text style={styles.benchmarkValue}>
                      {rule503020.wantsPct.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.benchmarkTrack}>
                    <View
                      style={[
                        styles.benchmarkFill,
                        {
                          width: `${Math.min(100, rule503020.wantsPct)}%`,
                          backgroundColor: '#FF9F0A',
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.benchmarkRow}>
                  <View style={styles.benchmarkLabelLine}>
                    <Text style={styles.benchmarkTitle}>
                      Savings (Target ≥ 20%)
                    </Text>
                    <Text style={[styles.benchmarkValue, { color: '#30D158' }]}>
                      {rule503020.savingsPct.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.benchmarkTrack}>
                    <View
                      style={[
                        styles.benchmarkFill,
                        {
                          width: `${Math.min(100, rule503020.savingsPct)}%`,
                          backgroundColor: '#30D158',
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* =====================================================================
          SUB-PAGE 4: RECENT LEDGER ACTIVITY
         ===================================================================== */}
      {subPage === 'activity' && (
        <View style={styles.bentoWhiteCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.blueEyebrow}>ACTIVITY LEDGER</Text>
              <Text style={styles.bentoSectionTitle}>Recent Transactions</Text>
            </View>

            <View style={styles.ledgerHeaderActions}>
              {selectedCategoryFilter !== 'all' && (
                <Pressable
                  style={styles.clearFilterPill}
                  onPress={() => setSelectedCategoryFilter('all')}
                >
                  <Text style={styles.clearFilterPillText}>
                    Clear Filter ({selectedCategoryFilter}) ✕
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={styles.pillLinkButton}
                onPress={() => onNavigateTab('transactions')}
              >
                <Text style={styles.pillLinkButtonText}>
                  Full Ledger ({summary.monthTransactions.length}) ›
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Category Quick Filter Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activityFilterScroll}
          >
            <Pressable
              style={[
                styles.activityFilterPill,
                selectedCategoryFilter === 'all' &&
                  styles.activityFilterPillActive,
              ]}
              onPress={() => setSelectedCategoryFilter('all')}
            >
              <Text
                style={[
                  styles.activityFilterText,
                  selectedCategoryFilter === 'all' &&
                    styles.activityFilterTextActive,
                ]}
              >
                All Categories
              </Text>
            </Pressable>
            {EXPENSE_CATEGORIES.map((cat) => {
              const active = selectedCategoryFilter === cat;
              const meta = CATEGORY_META[cat];
              return (
                <Pressable
                  key={cat}
                  style={[
                    styles.activityFilterPill,
                    active && styles.activityFilterPillActive,
                  ]}
                  onPress={() =>
                    setSelectedCategoryFilter((prev) =>
                      prev === cat ? 'all' : cat
                    )
                  }
                >
                  <Text style={styles.calcCategoryIcon}>{meta.icon}</Text>
                  <Text
                    style={[
                      styles.activityFilterText,
                      active && styles.activityFilterTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Text style={styles.emptyStateTitle}>
                No transactions recorded for this selection.
              </Text>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => onOpenAddModal('expense')}
              >
                <Text style={styles.primaryBtnText}>
                  + Record First Transaction
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.txTable}>
              {filteredTransactions.map((tx, idx) => {
                const meta = CATEGORY_META[tx.category] || {
                  name: 'Other',
                  icon: '💳',
                  color: '#86868B',
                };
                const isIncome = tx.type === 'income';
                return (
                  <Pressable
                    key={tx.id}
                    style={[
                      styles.txRow,
                      idx === filteredTransactions.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                    onPress={() => onEditTransaction(tx)}
                  >
                    <View
                      style={[
                        styles.txIconCircle,
                        { backgroundColor: `${meta.color}16` },
                      ]}
                    >
                      <Text style={styles.txIconEmoji}>{meta.icon}</Text>
                    </View>

                    <View style={styles.txInfoCol}>
                      <Text style={styles.txTitleText} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <Text style={styles.txMetaText}>
                        {tx.category} • {tx.date}
                        {tx.notes ? ` • ${tx.notes}` : ''}
                      </Text>
                    </View>

                    <View style={styles.txRightCol}>
                      <Text
                        style={[
                          styles.txAmountText,
                          {
                            color: isIncome
                              ? STUDIO_COLORS.positiveDark
                              : STUDIO_COLORS.textPrimary,
                          },
                        ]}
                      >
                        {isIncome ? '+' : '-'}
                        {formatCurrency(tx.amount, currencySymbol)}
                      </Text>
                      <Text style={styles.txEditHint}>Edit ›</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}
    </SubPageDeck>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 26,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    alignItems: 'center',
  },
  heroCardWide: {
    paddingHorizontal: 42,
    paddingTop: 34,
    paddingBottom: 32,
  },
  heroHeaderCenter: {
    alignItems: 'center',
    maxWidth: 720,
    marginBottom: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  darkBadgePill: {
    backgroundColor: '#1D1D1F',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  darkBadgePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  heroEyebrowLabel: {
    color: '#6E6E73',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  heroMainHeadline: {
    color: '#1D1D1F',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 36,
    textAlign: 'center',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  heroMainHeadlineWide: {
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.6,
  },

  /* Widescreen Display Centerpiece */
  displayBezelOuter: {
    width: '100%',
    maxWidth: 920,
    backgroundColor: '#1D1D1F',
    borderRadius: 28,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 36,
    marginBottom: 22,
  },
  displayScreenInner: {
    backgroundColor: '#0A0A0E',
    borderRadius: 23,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  displayScreenInnerWide: {
    paddingHorizontal: 32,
    paddingVertical: 26,
  },
  displayStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    flexWrap: 'wrap',
    gap: 10,
  },
  displayStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  displayBrandMark: {
    color: '#F5F5F7',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  liveTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveTagText: {
    color: '#A1A1A6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  budgetHealthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 980,
    borderWidth: 1,
  },
  budgetHealthPillPositive: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  budgetHealthPillDanger: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderColor: 'rgba(255, 69, 58, 0.35)',
  },
  healthDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  budgetHealthPillText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },

  primaryReadout: {
    alignItems: 'center',
    marginBottom: 22,
  },
  readoutOverline: {
    color: '#A1A1A6',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  readoutBigNumber: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1.5,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  readoutBigNumberWide: {
    fontSize: 56,
    letterSpacing: -2,
  },
  readoutSubline: {
    color: '#A1A1A6',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: STUDIO_FONT_FAMILY,
  },

  spectrumContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    padding: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  spectrumHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  spectrumTitle: {
    color: '#A1A1A6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  spectrumRightMeta: {
    color: '#F5F5F7',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  spectrumTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1C1C1E',
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 3,
    marginBottom: 12,
  },
  spectrumSegment: {
    height: '100%',
    borderRadius: 4,
  },
  spectrumLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 980,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    color: '#E5E5EA',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  legendVal: {
    color: '#A1A1A6',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiGridWide: {
    flexWrap: 'nowrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  kpiLabel: {
    color: '#A1A1A6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 3,
    fontFamily: STUDIO_FONT_FAMILY,
    flexShrink: 1,
  },
  kpiHint: {
    color: 'rgba(245, 245, 247, 0.5)',
    fontSize: 11,
    fontFamily: STUDIO_FONT_FAMILY,
    flexWrap: 'wrap',
  },

  heroActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#0071E3',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 980,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  secondaryBtn: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: '#D2D2D7',
  },
  secondaryBtnText: {
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  ghostLinkBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ghostLinkText: {
    color: '#0066CC',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },

  /* Bento Card Styles */
  bentoWhiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  blueEyebrow: {
    color: '#0071E3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  bentoSectionTitle: {
    color: '#1D1D1F',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  cardSubcopy: {
    color: '#6E6E73',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
    maxWidth: 560,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  pillLinkButton: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 980,
  },
  pillLinkButtonText: {
    color: '#0066CC',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },

  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    padding: 3,
    borderRadius: 980,
  },
  segmentBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 980,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  segmentBtnText: {
    color: '#6E6E73',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  segmentBtnTextActive: {
    color: '#1D1D1F',
  },
  calculatorGrid: {
    gap: 20,
  },
  calculatorGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  calculatorInputsCol: {
    flex: 3,
    gap: 16,
  },
  calcInputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  calcAmountFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 160,
    flex: 1,
  },
  calcCurrencyPrefix: {
    color: '#1D1D1F',
    fontSize: 24,
    fontWeight: '700',
    marginRight: 6,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  calcAmountInput: {
    flex: 1,
    minWidth: 0,
    color: '#1D1D1F',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
    padding: 0,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as any)
      : null),
  },
  calcTitleInput: {
    flex: 2,
    minWidth: 220,
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#1D1D1F',
    fontSize: 15,
    fontFamily: STUDIO_FONT_FAMILY,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as any)
      : null),
  },
  presetPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetRowLabel: {
    color: '#6E6E73',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginRight: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  presetChip: {
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 980,
  },
  presetChipText: {
    color: '#0071E3',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  presetClearChip: {
    backgroundColor: '#FFECEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 980,
  },
  presetClearText: {
    color: '#D70015',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  calcCategoryRow: {
    gap: 8,
    paddingVertical: 2,
  },
  calcCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  calcCategoryIcon: {
    fontSize: 14,
  },
  calcCategoryLabel: {
    color: '#1D1D1F',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  calculatorPreviewCol: {
    flex: 2,
    backgroundColor: '#F5F5F7',
    borderRadius: 22,
    padding: 20,
    justifyContent: 'space-between',
    gap: 14,
  },
  calcImpactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calcImpactItem: {
    flex: 1,
  },
  calcImpactDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#D2D2D7',
    marginHorizontal: 12,
  },
  calcImpactLabel: {
    color: '#6E6E73',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  calcImpactValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  dailyImpactStrip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  dailyImpactText: {
    color: '#6E6E73',
    fontSize: 13,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  dailyImpactStrong: {
    color: '#1D1D1F',
    fontWeight: '700',
  },
  calcSubmitBtn: {
    backgroundColor: '#0071E3',
    paddingVertical: 14,
    borderRadius: 980,
    alignItems: 'center',
  },
  calcSubmitBtnSubtle: {
    backgroundColor: '#1D1D1F',
  },
  calcSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },

  bentoTwoCol: {
    gap: 20,
  },
  bentoTwoColWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  bentoMainCol: {
    flex: 7,
  },
  bentoSideStack: {
    flex: 5,
    gap: 20,
  },
  envelopeList: {
    gap: 16,
  },
  envelopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  envelopeIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeEmoji: {
    fontSize: 20,
  },
  envelopeBody: {
    flex: 1,
    gap: 6,
  },
  envelopeTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  envelopeName: {
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  envelopeNumbers: {
    color: '#6E6E73',
    fontSize: 13,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  envelopeSpentStrong: {
    color: '#1D1D1F',
    fontWeight: '700',
  },
  envelopeTrack: {
    height: 8,
    backgroundColor: '#F5F5F7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  envelopeFill: {
    height: '100%',
    borderRadius: 4,
  },
  envelopeBottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  envelopeStatusText: {
    color: '#6E6E73',
    fontSize: 12,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  envelopePctText: {
    color: '#6E6E73',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },

  bigBentoMetric: {
    color: '#1D1D1F',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1.2,
    marginTop: 4,
    marginBottom: 8,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  bigBentoMetricUnit: {
    color: '#6E6E73',
    fontSize: 18,
    fontWeight: '500',
  },
  bentoLeadCopy: {
    color: '#6E6E73',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  bentoLeadBold: {
    color: '#1D1D1F',
    fontWeight: '600',
  },
  miniMetricPair: {
    flexDirection: 'row',
    gap: 12,
  },
  miniMetricBox: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    padding: 14,
  },
  miniMetricLabel: {
    color: '#6E6E73',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  miniMetricVal: {
    color: '#1D1D1F',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },

  bentoDarkCard: {
    flex: 1,
    backgroundColor: '#101014',
    borderRadius: 28,
    padding: 24,
    justifyContent: 'space-between',
  },
  darkCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  darkCardEyebrow: {
    color: '#2997FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  darkCardLink: {
    color: '#2997FF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  darkCardHeadline: {
    color: '#F5F5F7',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 25,
    marginBottom: 16,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  benchmarkBarsList: {
    gap: 14,
  },
  benchmarkRow: {
    gap: 6,
  },
  benchmarkLabelLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  benchmarkTitle: {
    color: '#A1A1A6',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  benchmarkValue: {
    color: '#F5F5F7',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  benchmarkTrack: {
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  benchmarkFill: {
    height: '100%',
    borderRadius: 4,
  },

  ledgerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityFilterScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  activityFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 980,
  },
  activityFilterPillActive: {
    backgroundColor: '#1D1D1F',
  },
  activityFilterText: {
    color: '#1D1D1F',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  activityFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  clearFilterPill: {
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 980,
  },
  clearFilterPillText: {
    color: '#0071E3',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  emptyStateBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 14,
  },
  emptyStateTitle: {
    color: '#6E6E73',
    fontSize: 15,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  txTable: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
    gap: 14,
  },
  txIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconEmoji: {
    fontSize: 19,
  },
  txInfoCol: {
    flex: 1,
    gap: 3,
  },
  txTitleText: {
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  txMetaText: {
    color: '#6E6E73',
    fontSize: 13,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  txRightCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txAmountText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  txEditHint: {
    color: '#0066CC',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: STUDIO_FONT_FAMILY,
  },
});
