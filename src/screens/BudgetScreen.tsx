import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SubPageDeck, SubPageItem } from '../components/SubPageDeck';
import { STUDIO_COLORS, STUDIO_FONT_FAMILY } from '../theme/boostlabTheme';
import { FinancialGoal } from '../types/budget';
import { formatCurrency, MonthlySummary } from '../utils/calculations';

interface BudgetScreenProps {
  summary: MonthlySummary;
  currencySymbol: string;
  isWideWeb?: boolean;
  financialGoals?: FinancialGoal[];
  onOpenBudgetModal: () => void;
  onSaveFinancialGoal?: (goal: FinancialGoal) => void;
  onDeleteFinancialGoal?: (goalId: string) => void;
}

type BudgetSubPage = 'hub' | 'envelopes' | 'goals' | 'health';

export const BudgetScreen: React.FC<BudgetScreenProps> = ({
  summary,
  currencySymbol,
  isWideWeb,
  financialGoals = [],
  onOpenBudgetModal,
  onSaveFinancialGoal,
  onDeleteFinancialGoal,
}) => {
  const { width } = useWindowDimensions();
  const isWide = isWideWeb !== undefined ? isWideWeb : width >= 760;
  const [subPage, setSubPage] = useState<BudgetSubPage>('envelopes');

  // New Financial Goal Form State
  const [goalName, setGoalName] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [goalCurrentStr, setGoalCurrentStr] = useState('');
  const [goalError, setGoalError] = useState('');

  const totalAllocated = summary.expenseSummaries.reduce(
    (acc, item) => acc + item.limit,
    0
  );
  const overLimitCategories = summary.expenseSummaries.filter(
    (c) => c.spent > c.limit && c.limit > 0
  );
  const healthyCategories = summary.expenseSummaries.filter(
    (c) => c.spent <= c.limit || c.limit === 0
  );

  const subPages: SubPageItem[] = useMemo(
    () => [
      {
        key: 'envelopes',
        title: 'Category Envelopes',
        badge: String(summary.expenseSummaries.length),
      },
      { key: 'hub', title: 'Monthly Cap Hub' },
      {
        key: 'goals',
        title: 'Financial Goals',
        badge: String(financialGoals.length),
      },
      {
        key: 'health',
        title: 'Status & Alerts',
        badge:
          overLimitCategories.length > 0
            ? `${overLimitCategories.length} Alert`
            : 'Healthy',
      },
    ],
    [
      summary.expenseSummaries.length,
      financialGoals.length,
      overLimitCategories.length,
    ]
  );

  const handleAddGoal = () => {
    setGoalError('');
    const targetNum = parseFloat(goalTargetStr.replace(/[^0-9.]/g, ''));
    const currentNum = parseFloat(goalCurrentStr.replace(/[^0-9.]/g, '')) || 0;
    if (!goalName.trim()) {
      setGoalError('Please enter a goal name (e.g., Emergency Fund).');
      return;
    }
    if (!targetNum || targetNum <= 0) {
      setGoalError('Please enter a target amount greater than 0.');
      return;
    }
    if (onSaveFinancialGoal) {
      onSaveFinancialGoal({
        id: `goal-${Date.now()}`,
        name: goalName.trim(),
        target: targetNum,
        current_amount: Math.max(0, currentNum),
      });
    }
    setGoalName('');
    setGoalTargetStr('');
    setGoalCurrentStr('');
  };

  return (
    <SubPageDeck
      pages={subPages}
      activeKey={subPage}
      onSelectPage={(k) => setSubPage(k as BudgetSubPage)}
      isCompactMobile={!isWide}
    >
      {/* =====================================================================
          SUB-PAGE 1: CATEGORY ENVELOPES BENTO GRID
         ===================================================================== */}
      {subPage === 'envelopes' && (
        <View style={styles.pageBlock}>
          <View style={styles.compactHeaderRow}>
            <View>
              <Text style={styles.eyebrow}>CATEGORY ENVELOPES</Text>
              <Text style={styles.pageTitle}>
                Tap any envelope to calibrate its monthly cap.
              </Text>
            </View>
            <Pressable style={styles.editCapBtn} onPress={onOpenBudgetModal}>
              <Text style={styles.editCapBtnText}>Calibrate All Limits</Text>
            </Pressable>
          </View>

          <View style={[styles.bentoGrid, isWide && styles.bentoGridWide]}>
            {summary.expenseSummaries.map((item) => {
              const isOverLimit = item.spent > item.limit && item.limit > 0;
              const pct = Math.min(100, item.percentUsed);
              const statusColor = isOverLimit
                ? STUDIO_COLORS.danger
                : item.percentUsed >= 85
                  ? STUDIO_COLORS.warning
                  : item.color;

              return (
                <Pressable
                  key={item.category}
                  style={[
                    styles.envelopeTile,
                    isWide && styles.envelopeTileWide,
                  ]}
                  onPress={onOpenBudgetModal}
                >
                  <View style={styles.tileTopRow}>
                    <View style={styles.tileIdentity}>
                      <View
                        style={[
                          styles.tileIconOrb,
                          { backgroundColor: `${item.color}18` },
                        ]}
                      >
                        <Text style={styles.tileIconEmoji}>{item.icon}</Text>
                      </View>
                      <View>
                        <Text
                          style={[styles.tileEyebrow, { color: item.color }]}
                        >
                          {isOverLimit
                            ? 'OVER LIMIT'
                            : item.percentUsed >= 85
                              ? 'NEAR LIMIT'
                              : 'CALIBRATED'}
                        </Text>
                        <Text style={styles.tileTitle}>{item.category}</Text>
                      </View>
                    </View>

                    <View style={styles.tilePctPill}>
                      <Text
                        style={[
                          styles.tilePctText,
                          isOverLimit && { color: STUDIO_COLORS.danger },
                        ]}
                      >
                        {item.percentUsed.toFixed(0)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tileNumbersRow}>
                    <Text style={styles.tileSpentBig}>
                      {formatCurrency(item.spent, currencySymbol)}
                    </Text>
                    <Text style={styles.tileLimitSub}>
                      of {formatCurrency(item.limit, currencySymbol)} cap
                    </Text>
                  </View>

                  <View style={styles.tileTrack}>
                    <View
                      style={[
                        styles.tileFill,
                        {
                          width: `${Math.max(pct, item.spent > 0 ? 4 : 0)}%`,
                          backgroundColor: statusColor,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.tileFooterRow}>
                    <Text
                      style={[
                        styles.tileFooterStatus,
                        isOverLimit && {
                          color: STUDIO_COLORS.danger,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {isOverLimit
                        ? `Exceeded by ${formatCurrency(Math.abs(item.remaining), currencySymbol)}`
                        : `${formatCurrency(Math.max(0, item.remaining), currencySymbol)} remaining`}
                    </Text>
                    <Text style={styles.tileEditLink}>Edit Cap ›</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* =====================================================================
          SUB-PAGE 2: MASTER MONTHLY ALLOCATION HUB
         ===================================================================== */}
      {subPage === 'hub' && (
        <View style={styles.masterHubCard}>
          <View style={styles.hubTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hubOverline}>MONTHLY BUDGET TARGET</Text>
              <Text style={styles.hubBigValue}>
                {formatCurrency(summary.monthlyBudget, currencySymbol)}
              </Text>
              <Text style={styles.hubMetaSub}>
                {formatCurrency(totalAllocated, currencySymbol)} allocated
                across {summary.expenseSummaries.length} category envelopes
              </Text>
            </View>

            <Pressable style={styles.editCapBtn} onPress={onOpenBudgetModal}>
              <Text style={styles.editCapBtnText}>Calibrate Limits</Text>
            </Pressable>
          </View>

          <View style={styles.masterBarWrap}>
            <View style={styles.masterBarLabels}>
              <Text style={styles.masterBarLeftText}>
                {formatCurrency(summary.totalExpenses, currencySymbol)} spent (
                {summary.budgetPercentageUsed.toFixed(1)}%)
              </Text>
              <Text
                style={[
                  styles.masterBarRightText,
                  summary.remainingBudget < 0 && {
                    color: STUDIO_COLORS.danger,
                  },
                ]}
              >
                {summary.remainingBudget >= 0
                  ? `${formatCurrency(summary.remainingBudget, currencySymbol)} remaining`
                  : `${formatCurrency(Math.abs(summary.remainingBudget), currencySymbol)} over budget`}
              </Text>
            </View>

            <View style={styles.masterTrack}>
              <View
                style={[
                  styles.masterFill,
                  {
                    width: `${Math.min(100, Math.max(summary.budgetPercentageUsed, 2))}%`,
                    backgroundColor:
                      summary.remainingBudget < 0
                        ? STUDIO_COLORS.danger
                        : summary.budgetPercentageUsed > 85
                          ? STUDIO_COLORS.warning
                          : STUDIO_COLORS.primaryBlue,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.hubStatRow}>
            <View style={styles.hubStatBox}>
              <Text style={styles.hubStatLabel}>TOTAL BUDGET CAP</Text>
              <Text style={styles.hubStatValue}>
                {formatCurrency(summary.monthlyBudget, currencySymbol)}
              </Text>
            </View>
            <View style={styles.hubStatBox}>
              <Text style={styles.hubStatLabel}>TOTAL SPENT</Text>
              <Text style={styles.hubStatValue}>
                {formatCurrency(summary.totalExpenses, currencySymbol)}
              </Text>
            </View>
            <View style={styles.hubStatBox}>
              <Text style={styles.hubStatLabel}>ENVELOPE STATUS</Text>
              <Text
                style={[
                  styles.hubStatValue,
                  {
                    color:
                      overLimitCategories.length > 0
                        ? STUDIO_COLORS.danger
                        : STUDIO_COLORS.positiveDark,
                  },
                ]}
              >
                {overLimitCategories.length > 0
                  ? `${overLimitCategories.length} Over Cap`
                  : 'All On Track'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* =====================================================================
          SUB-PAGE 3: ENVELOPE STATUS & ALERTS
         ===================================================================== */}
      {subPage === 'health' && (
        <View style={styles.masterHubCard}>
          <View style={styles.hubTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hubOverline}>ENVELOPE HEALTH CHECK</Text>
              <Text style={styles.pageTitle}>
                {overLimitCategories.length > 0
                  ? `${overLimitCategories.length} envelope(s) require attention.`
                  : 'All category envelopes are within their monthly caps.'}
              </Text>
            </View>
            <Pressable style={styles.editCapBtn} onPress={onOpenBudgetModal}>
              <Text style={styles.editCapBtnText}>Adjust Caps</Text>
            </Pressable>
          </View>

          <View style={styles.healthList}>
            {summary.expenseSummaries
              .slice()
              .sort((a, b) => b.percentUsed - a.percentUsed)
              .map((item) => {
                const isOver = item.spent > item.limit && item.limit > 0;
                return (
                  <View key={item.category} style={styles.healthRow}>
                    <View style={styles.tileIdentity}>
                      <View
                        style={[
                          styles.tileIconOrb,
                          { backgroundColor: `${item.color}18` },
                        ]}
                      >
                        <Text style={styles.tileIconEmoji}>{item.icon}</Text>
                      </View>
                      <View>
                        <Text style={styles.tileTitle}>{item.category}</Text>
                        <Text style={styles.tileFooterStatus}>
                          {formatCurrency(item.spent, currencySymbol)} of{' '}
                          {formatCurrency(item.limit, currencySymbol)} limit
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.healthBadge,
                        {
                          backgroundColor: isOver
                            ? STUDIO_COLORS.dangerBg
                            : item.percentUsed >= 85
                              ? STUDIO_COLORS.warningBg
                              : STUDIO_COLORS.positiveBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.healthBadgeText,
                          {
                            color: isOver
                              ? STUDIO_COLORS.dangerDark
                              : item.percentUsed >= 85
                                ? STUDIO_COLORS.warningDark
                                : STUDIO_COLORS.positiveDark,
                          },
                        ]}
                      >
                        {isOver
                          ? `+${formatCurrency(Math.abs(item.remaining), currencySymbol)} Over`
                          : `${formatCurrency(Math.max(0, item.remaining), currencySymbol)} Left`}
                      </Text>
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      )}

      {/* =====================================================================
          SUB-PAGE 3: FINANCIAL GOALS (financial_goals table)
         ===================================================================== */}
      {subPage === 'goals' && (
        <View style={styles.pageBlock}>
          <View style={styles.masterHubCard}>
            <View>
              <Text style={styles.hubOverline}>SAVINGS & MILESTONE TARGETS</Text>
              <Text style={styles.pageTitle}>Create a Financial Goal</Text>
              <Text style={styles.hubMetaSub}>
                Track savings milestones (Emergency Fund, Vacation, Home Down
                Payment) toward your target amount.
              </Text>
            </View>

            <View style={styles.goalFormRow}>
              <TextInput
                style={[styles.goalInput, { flex: 1.5, minWidth: 180 }]}
                value={goalName}
                onChangeText={setGoalName}
                placeholder="Goal Name (e.g., Emergency Fund)"
                placeholderTextColor="#86868B"
              />
              <TextInput
                style={[styles.goalInput, { flex: 1, minWidth: 130 }]}
                value={goalTargetStr}
                onChangeText={setGoalTargetStr}
                placeholder={`Target (${currencySymbol})`}
                placeholderTextColor="#86868B"
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.goalInput, { flex: 1, minWidth: 130 }]}
                value={goalCurrentStr}
                onChangeText={setGoalCurrentStr}
                placeholder={`Saved So Far (${currencySymbol})`}
                placeholderTextColor="#86868B"
                keyboardType="numeric"
              />
              <Pressable style={styles.editCapBtn} onPress={handleAddGoal}>
                <Text style={styles.editCapBtnText}>+ Add Goal</Text>
              </Pressable>
            </View>

            {goalError ? (
              <Text style={styles.goalErrorText}>{goalError}</Text>
            ) : null}
          </View>

          {financialGoals.length === 0 ? (
            <View style={styles.masterHubCard}>
              <Text style={styles.pageTitle}>No financial goals yet</Text>
              <Text style={styles.hubMetaSub}>
                Add your first financial goal above to track progress toward
                your target amount.
              </Text>
            </View>
          ) : (
            <View style={[styles.bentoGrid, isWide && styles.bentoGridWide]}>
              {financialGoals.map((goal) => {
                const pct =
                  goal.target > 0
                    ? Math.min(100, (goal.current_amount / goal.target) * 100)
                    : 0;
                const remaining = Math.max(0, goal.target - goal.current_amount);

                return (
                  <View
                    key={goal.id}
                    style={[
                      styles.envelopeTile,
                      isWide && styles.envelopeTileWide,
                    ]}
                  >
                    <View style={styles.tileTopRow}>
                      <View style={styles.tileIdentity}>
                        <View
                          style={[
                            styles.tileIconOrb,
                            { backgroundColor: 'rgba(0, 113, 227, 0.12)' },
                          ]}
                        >
                          <Text style={styles.tileIconEmoji}>🎯</Text>
                        </View>
                        <View>
                          <Text
                            style={[styles.tileEyebrow, { color: '#0071E3' }]}
                          >
                            {pct >= 100 ? 'GOAL ACHIEVED' : 'ACTIVE GOAL'}
                          </Text>
                          <Text style={styles.tileTitle}>{goal.name}</Text>
                        </View>
                      </View>

                      <View style={styles.tilePctPill}>
                        <Text style={styles.tilePctText}>
                          {pct.toFixed(0)}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.tileNumbersRow}>
                      <Text style={styles.tileSpentBig}>
                        {formatCurrency(goal.current_amount, currencySymbol)}
                      </Text>
                      <Text style={styles.tileLimitSub}>
                        of {formatCurrency(goal.target, currencySymbol)} target
                      </Text>
                    </View>

                    <View style={styles.tileTrack}>
                      <View
                        style={[
                          styles.tileFill,
                          {
                            width: `${pct}%`,
                            backgroundColor:
                              pct >= 100 ? '#28CD41' : '#0071E3',
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.tileFooterRow}>
                      <Text style={styles.tileFooterStatus}>
                        {remaining > 0
                          ? `${formatCurrency(remaining, currencySymbol)} remaining`
                          : 'Target reached!'}
                      </Text>

                      <View style={styles.goalQuickBtns}>
                        {onSaveFinancialGoal && (
                          <Pressable
                            style={styles.goalBoostBtn}
                            onPress={() =>
                              onSaveFinancialGoal({
                                ...goal,
                                current_amount: goal.current_amount + 500,
                              })
                            }
                          >
                            <Text style={styles.goalBoostBtnText}>
                              +{currencySymbol}500
                            </Text>
                          </Pressable>
                        )}
                        {onDeleteFinancialGoal && (
                          <Pressable
                            style={styles.goalDeleteBtn}
                            onPress={() => onDeleteFinancialGoal(goal.id)}
                          >
                            <Text style={styles.goalDeleteBtnText}>Remove</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
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
  pageBlock: {
    gap: 18,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    flexWrap: 'wrap',
    gap: 12,
  },
  eyebrow: {
    color: '#0071E3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 3,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  pageTitle: {
    color: '#1D1D1F',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: STUDIO_FONT_FAMILY,
  },

  /* Master Hub Card */
  masterHubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    gap: 22,
  },
  hubTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 14,
  },
  hubOverline: {
    color: '#0071E3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  hubBigValue: {
    color: '#1D1D1F',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.3,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  hubMetaSub: {
    color: '#6E6E73',
    fontSize: 14,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  editCapBtn: {
    backgroundColor: '#0071E3',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 980,
  },
  editCapBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  masterBarWrap: {
    gap: 8,
  },
  masterBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  masterBarLeftText: {
    color: '#1D1D1F',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  masterBarRightText: {
    color: '#6E6E73',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  masterTrack: {
    height: 12,
    backgroundColor: '#F5F5F7',
    borderRadius: 6,
    overflow: 'hidden',
  },
  masterFill: {
    height: '100%',
    borderRadius: 6,
  },
  hubStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  hubStatBox: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    padding: 16,
  },
  hubStatLabel: {
    color: '#6E6E73',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  hubStatValue: {
    color: '#1D1D1F',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: STUDIO_FONT_FAMILY,
  },

  /* 2-Column Bento Envelope Grid */
  bentoGrid: {
    gap: 16,
  },
  bentoGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  envelopeTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 14,
    gap: 12,
  },
  envelopeTileWide: {
    width: '48.8%',
    flexGrow: 1,
  },
  tileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tileIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tileIconOrb: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconEmoji: {
    fontSize: 20,
  },
  tileEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  tileTitle: {
    color: '#1D1D1F',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  tilePctPill: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 980,
  },
  tilePctText: {
    color: '#1D1D1F',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  tileNumbersRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  tileSpentBig: {
    color: '#1D1D1F',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.8,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  tileLimitSub: {
    color: '#6E6E73',
    fontSize: 14,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  tileTrack: {
    height: 8,
    backgroundColor: '#F5F5F7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tileFill: {
    height: '100%',
    borderRadius: 4,
  },
  tileFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tileFooterStatus: {
    color: '#6E6E73',
    fontSize: 13,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  tileEditLink: {
    color: '#0066CC',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },

  healthList: {
    gap: 12,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  healthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 980,
  },
  healthBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  goalFormRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  goalInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#1D1D1F',
    fontSize: 14,
    fontFamily: STUDIO_FONT_FAMILY,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as any)
      : null),
  },
  goalErrorText: {
    color: '#D70015',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  goalQuickBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalBoostBtn: {
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 980,
  },
  goalBoostBtnText: {
    color: '#0071E3',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  goalDeleteBtn: {
    backgroundColor: '#FFECEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 980,
  },
  goalDeleteBtnText: {
    color: '#D70015',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
});
