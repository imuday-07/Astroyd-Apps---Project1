import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SubPageDeck, SubPageItem } from '../components/SubPageDeck';
import { STUDIO_COLORS, STUDIO_FONT_FAMILY } from '../theme/boostlabTheme';
import {
  formatCurrency,
  MonthlySummary,
  MonthlyTrendPoint,
} from '../utils/calculations';

interface ReportsScreenProps {
  summary: MonthlySummary;
  trendSeries: MonthlyTrendPoint[];
  currencySymbol: string;
  isWideWeb?: boolean;
}

type AnalyticsSubPage = 'cashflow' | 'distribution' | 'benchmark';

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  summary,
  trendSeries,
  currencySymbol,
  isWideWeb,
}) => {
  const { width } = useWindowDimensions();
  const isWide = isWideWeb !== undefined ? isWideWeb : width >= 760;
  const [subPage, setSubPage] = useState<AnalyticsSubPage>('cashflow');

  const maxTrendVal = useMemo(() => {
    const vals = trendSeries.flatMap((t) => [t.income, t.expenses]);
    return Math.max(...vals, 1000);
  }, [trendSeries]);

  const activeExpenses = useMemo(
    () => summary.expenseSummaries.filter((c) => c.spent > 0),
    [summary.expenseSummaries]
  );

  const subPages: SubPageItem[] = useMemo(
    () => [
      { key: 'cashflow', title: 'Cashflow Trend', badge: '4 Months' },
      {
        key: 'distribution',
        title: 'Category Split',
        badge: String(activeExpenses.length),
      },
      { key: 'benchmark', title: '50 / 30 / 20 Rule' },
    ],
    [activeExpenses.length]
  );

  // 50 / 30 / 20 Calibration Metrics
  const calibration = useMemo(() => {
    const needsNames = ['Rent', 'Bills', 'EMI', 'Food'];
    const needsSpent = summary.expenseSummaries
      .filter((c) => needsNames.includes(c.category))
      .reduce((acc, c) => acc + c.spent, 0);
    const wantsSpent = Math.max(0, summary.totalExpenses - needsSpent);
    const income = Math.max(summary.totalIncome, 1);

    return {
      needsSpent,
      wantsSpent,
      needsPct: (needsSpent / income) * 100,
      wantsPct: (wantsSpent / income) * 100,
      savingsPct: summary.savingsPercentage,
      targetNeeds: summary.totalIncome * 0.5,
      targetWants: summary.totalIncome * 0.3,
      targetSavings: summary.totalIncome * 0.2,
    };
  }, [summary]);

  return (
    <SubPageDeck
      pages={subPages}
      activeKey={subPage}
      onSelectPage={(k) => setSubPage(k as AnalyticsSubPage)}
      isCompactMobile={!isWide}
    >
      {/* =====================================================================
          SUB-PAGE 1: MULTI-MONTH CASHFLOW CHART
         ===================================================================== */}
      {subPage === 'cashflow' && (
        <View style={styles.darkChartCard}>
          <View style={styles.darkHeaderRow}>
            <View>
              <Text style={styles.darkEyebrow}>MULTI-MONTH CASHFLOW</Text>
              <Text style={styles.darkTitle}>Income vs. Expenses</Text>
              <Text style={styles.darkSubcopy}>
                Four-month trajectory comparing monthly inflows, outflows, and
                net savings retained.
              </Text>
            </View>

            <View style={styles.chartLegendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: '#30D158' }]}
                />
                <Text style={styles.legendText}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: '#2997FF' }]}
                />
                <Text style={styles.legendText}>Expense</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: '#BF5AF2' }]}
                />
                <Text style={styles.legendText}>Net Saved</Text>
              </View>
            </View>
          </View>

          <View style={styles.barsStage}>
            {trendSeries.map((point) => {
              const incomeH = Math.max(
                12,
                Math.round((point.income / maxTrendVal) * 165)
              );
              const expenseH = Math.max(
                12,
                Math.round((point.expenses / maxTrendVal) * 165)
              );
              const savedH = Math.max(
                8,
                Math.round((Math.max(0, point.savings) / maxTrendVal) * 165)
              );
              const isCurrent = point.monthKey === summary.monthKey;

              return (
                <View key={point.monthKey} style={styles.barGroupCol}>
                  <View style={styles.barTriplet}>
                    <View
                      style={[
                        styles.barColumn,
                        { height: incomeH, backgroundColor: '#30D158' },
                      ]}
                    />
                    <View
                      style={[
                        styles.barColumn,
                        { height: expenseH, backgroundColor: '#2997FF' },
                      ]}
                    />
                    <View
                      style={[
                        styles.barColumn,
                        { height: savedH, backgroundColor: '#BF5AF2' },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.barMonthLabel,
                      isCurrent && styles.barMonthLabelActive,
                    ]}
                  >
                    {point.label}
                  </Text>
                  <Text style={styles.barNetSub}>
                    {formatCurrency(point.savings, currencySymbol, true)} saved
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Monthly Snapshot Strip */}
          <View style={styles.darkStatsGrid}>
            {trendSeries.map((point) => (
              <View key={point.monthKey} style={styles.darkStatTile}>
                <Text style={styles.darkStatMonth}>{point.label}</Text>
                <Text style={styles.darkStatMain}>
                  {point.savingsRate.toFixed(0)}% saved
                </Text>
                <Text style={styles.darkStatMeta}>
                  +{formatCurrency(point.income, currencySymbol, true)} / -
                  {formatCurrency(point.expenses, currencySymbol, true)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* =====================================================================
          SUB-PAGE 2: CATEGORY DISTRIBUTION BREAKDOWN
         ===================================================================== */}
      {subPage === 'distribution' && (
        <View style={styles.whiteBentoCard}>
          <Text style={styles.cardEyebrow}>CATEGORY DISTRIBUTION</Text>
          <Text style={styles.cardTitle}>Where your money went this month</Text>

          <View style={styles.stackedBar}>
            {activeExpenses.map((item) => (
              <View
                key={item.category}
                style={{
                  flex: Math.max(item.spent, 1),
                  backgroundColor: item.color,
                  height: '100%',
                }}
              />
            ))}
          </View>

          <View style={styles.distList}>
            {activeExpenses.map((item) => {
              const sharePct =
                (item.spent / Math.max(summary.totalExpenses, 1)) * 100;
              return (
                <View key={item.category} style={styles.distRow}>
                  <View style={styles.distLeft}>
                    <View
                      style={[
                        styles.distColorDot,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text style={styles.distEmoji}>{item.icon}</Text>
                    <Text style={styles.distName}>{item.category}</Text>
                  </View>

                  <View style={styles.distRight}>
                    <Text style={styles.distAmount}>
                      {formatCurrency(item.spent, currencySymbol)}
                    </Text>
                    <Text style={styles.distPct}>{sharePct.toFixed(1)}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* =====================================================================
          SUB-PAGE 3: 50 / 30 / 20 BENCHMARK COMPARISON
         ===================================================================== */}
      {subPage === 'benchmark' && (
        <View style={styles.whiteBentoCard}>
          <Text style={styles.cardEyebrow}>BENCHMARK COMPARISON</Text>
          <Text style={styles.cardTitle}>
            Which calibration is right for you?
          </Text>

          <View style={styles.compareTable}>
            <View style={styles.compareHeaderRow}>
              <View style={styles.compareColHeader}>
                <View style={styles.compareBadgeDark}>
                  <Text style={styles.compareBadgeTextLight}>Your Ledger</Text>
                </View>
                <Text style={styles.compareColSub}>Current Month</Text>
              </View>

              <View style={styles.compareColHeader}>
                <View style={styles.compareBadgeLight}>
                  <Text style={styles.compareBadgeTextDark}>
                    50 / 30 / 20 Rule
                  </Text>
                </View>
                <Text style={styles.compareColSub}>Recommended Target</Text>
              </View>
            </View>

            <View style={styles.compareSpecRow}>
              <View style={styles.compareCell}>
                <Text style={styles.compareSpecBig}>
                  {calibration.needsPct.toFixed(0)}%
                </Text>
                <Text style={styles.compareSpecLabel}>
                  Needs ({formatCurrency(calibration.needsSpent, currencySymbol)}
                  )
                </Text>
              </View>
              <View style={styles.compareCell}>
                <Text style={styles.compareSpecBig}>50%</Text>
                <Text style={styles.compareSpecLabel}>
                  Target (
                  {formatCurrency(calibration.targetNeeds, currencySymbol)})
                </Text>
              </View>
            </View>

            <View style={styles.compareSpecRow}>
              <View style={styles.compareCell}>
                <Text style={styles.compareSpecBig}>
                  {calibration.wantsPct.toFixed(0)}%
                </Text>
                <Text style={styles.compareSpecLabel}>
                  Wants ({formatCurrency(calibration.wantsSpent, currencySymbol)}
                  )
                </Text>
              </View>
              <View style={styles.compareCell}>
                <Text style={styles.compareSpecBig}>30%</Text>
                <Text style={styles.compareSpecLabel}>
                  Target (
                  {formatCurrency(calibration.targetWants, currencySymbol)})
                </Text>
              </View>
            </View>

            <View style={[styles.compareSpecRow, { borderBottomWidth: 0 }]}>
              <View style={styles.compareCell}>
                <Text
                  style={[
                    styles.compareSpecBig,
                    {
                      color:
                        calibration.savingsPct >= 20
                          ? STUDIO_COLORS.positiveDark
                          : STUDIO_COLORS.warningDark,
                    },
                  ]}
                >
                  {calibration.savingsPct.toFixed(0)}%
                </Text>
                <Text style={styles.compareSpecLabel}>
                  Saved (
                  {formatCurrency(summary.remainingBalance, currencySymbol)})
                </Text>
              </View>
              <View style={styles.compareCell}>
                <Text
                  style={[
                    styles.compareSpecBig,
                    { color: STUDIO_COLORS.positiveDark },
                  ]}
                >
                  20%+
                </Text>
                <Text style={styles.compareSpecLabel}>
                  Target (
                  {formatCurrency(calibration.targetSavings, currencySymbol)})
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </SubPageDeck>
  );
};

const styles = StyleSheet.create({
  darkChartCard: {
    backgroundColor: '#101014',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    gap: 24,
  },
  darkHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 14,
  },
  darkEyebrow: {
    color: '#2997FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  darkTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  darkSubcopy: {
    color: '#A1A1A6',
    fontSize: 14,
    marginTop: 4,
    maxWidth: 460,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  chartLegendRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendText: {
    color: '#E5E5EA',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: STUDIO_FONT_FAMILY,
  },

  barsStage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 20,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  barGroupCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barTriplet: {
    height: 170,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barColumn: {
    width: 12,
    borderRadius: 5,
  },
  barMonthLabel: {
    color: '#A1A1A6',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  barMonthLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  barNetSub: {
    color: '#86868B',
    fontSize: 11,
    fontFamily: STUDIO_FONT_FAMILY,
  },

  darkStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  darkStatTile: {
    flex: 1,
    minWidth: 130,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  darkStatMonth: {
    color: '#A1A1A6',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  darkStatMain: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  darkStatMeta: {
    color: '#86868B',
    fontSize: 11,
    fontFamily: STUDIO_FONT_FAMILY,
  },

  whiteBentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardEyebrow: {
    color: '#0071E3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  cardTitle: {
    color: '#1D1D1F',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: 18,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  stackedBar: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F5F5F7',
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
    marginBottom: 22,
  },
  distList: {
    gap: 14,
  },
  distRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  distLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distEmoji: {
    fontSize: 16,
  },
  distName: {
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  distRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  distAmount: {
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  distPct: {
    color: '#6E6E73',
    fontSize: 13,
    width: 48,
    textAlign: 'right',
    fontFamily: STUDIO_FONT_FAMILY,
  },

  compareTable: {
    marginTop: 4,
  },
  compareHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  compareColHeader: {
    flex: 1,
    gap: 6,
  },
  compareBadgeDark: {
    alignSelf: 'flex-start',
    backgroundColor: '#1D1D1F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 980,
  },
  compareBadgeTextLight: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  compareBadgeLight: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 980,
  },
  compareBadgeTextDark: {
    color: '#1D1D1F',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  compareColSub: {
    color: '#6E6E73',
    fontSize: 12,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  compareSpecRow: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  compareCell: {
    flex: 1,
    gap: 4,
  },
  compareSpecBig: {
    color: '#1D1D1F',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  compareSpecLabel: {
    color: '#6E6E73',
    fontSize: 13,
    fontFamily: STUDIO_FONT_FAMILY,
  },
});
