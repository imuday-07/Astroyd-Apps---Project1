import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { AnimatedPageContainer } from '../components/AnimatedPageContainer';
import { SubPageDeck, SubPageItem } from '../components/SubPageDeck';
import {
  CATEGORY_META,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  STUDIO_COLORS,
  STUDIO_FONT_FAMILY,
} from '../theme/boostlabTheme';
import {
  CategoryName,
  Transaction,
  TransactionType,
} from '../types/budget';
import { formatCurrency, MonthlySummary } from '../utils/calculations';

interface TransactionsScreenProps {
  summary: MonthlySummary;
  currencySymbol: string;
  isWideWeb?: boolean;
  onOpenAddModal: (type: TransactionType) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const ALL_CATEGORIES: CategoryName[] = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
];

const ITEMS_PER_PAGE = 5;

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  summary,
  currencySymbol,
  isWideWeb,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const { width } = useWindowDimensions();
  const isWide = isWideWeb !== undefined ? isWideWeb : width >= 760;

  const [activeSubPage, setActiveSubPage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CategoryName>('all');
  const [currentPage, setCurrentPage] = useState<number>(0);

  const expenseCount = useMemo(
    () => summary.monthTransactions.filter((t) => t.type === 'expense').length,
    [summary.monthTransactions]
  );
  const incomeCount = useMemo(
    () => summary.monthTransactions.filter((t) => t.type === 'income').length,
    [summary.monthTransactions]
  );

  const subPages: SubPageItem[] = useMemo(
    () => [
      {
        key: 'all',
        title: 'All Entries',
        badge: String(summary.monthTransactions.length),
      },
      {
        key: 'expense',
        title: 'Expenses',
        badge: String(expenseCount),
      },
      {
        key: 'income',
        title: 'Income',
        badge: String(incomeCount),
      },
      {
        key: 'summary',
        title: 'Ledger Highlights',
      },
    ],
    [summary.monthTransactions.length, expenseCount, incomeCount]
  );

  // Determine effective type filter from active sub-page
  const effectiveTypeFilter: 'all' | TransactionType =
    activeSubPage === 'expense'
      ? 'expense'
      : activeSubPage === 'income'
      ? 'income'
      : 'all';

  const handleSelectSubPage = (key: string) => {
    setActiveSubPage(key);
    setCategoryFilter('all');
    setCurrentPage(0);
  };

  const filteredTransactions = useMemo(() => {
    return summary.monthTransactions.filter((tx) => {
      if (effectiveTypeFilter !== 'all' && tx.type !== effectiveTypeFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = tx.title.toLowerCase().includes(q);
        const matchCat = tx.category.toLowerCase().includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        return matchTitle || matchCat || matchNotes;
      }
      return true;
    });
  }, [summary.monthTransactions, effectiveTypeFilter, categoryFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const safePageIndex = Math.min(currentPage, totalPages - 1);
  const paginatedTransactions = filteredTransactions.slice(
    safePageIndex * ITEMS_PER_PAGE,
    (safePageIndex + 1) * ITEMS_PER_PAGE
  );

  const availableCategories =
    effectiveTypeFilter === 'expense'
      ? EXPENSE_CATEGORIES
      : effectiveTypeFilter === 'income'
      ? INCOME_CATEGORIES
      : ALL_CATEGORIES;

  const largestExpense = useMemo(() => {
    const expenses = summary.monthTransactions.filter((t) => t.type === 'expense');
    if (expenses.length === 0) return null;
    return expenses.reduce((max, item) => (item.amount > max.amount ? item : max), expenses[0]);
  }, [summary.monthTransactions]);

  const largestIncome = useMemo(() => {
    const incomes = summary.monthTransactions.filter((t) => t.type === 'income');
    if (incomes.length === 0) return null;
    return incomes.reduce((max, item) => (item.amount > max.amount ? item : max), incomes[0]);
  }, [summary.monthTransactions]);

  return (
    <SubPageDeck
      pages={subPages}
      activeKey={activeSubPage}
      onSelectPage={handleSelectSubPage}
      isCompactMobile={!isWide}
    >
      {/* ===============================================================
          SUB-PAGES 1, 2, 3: ALL / EXPENSES / INCOME LEDGER
         =============================================================== */}
      {activeSubPage !== 'summary' && (
        <View style={styles.subPageStage}>
          {/* Search & Action Bar */}
          <View style={styles.filterCard}>
            <View style={styles.topSearchRow}>
              <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={(txt) => {
                    setSearchQuery(txt);
                    setCurrentPage(0);
                  }}
                  placeholder="Search by title, category, or notes..."
                  placeholderTextColor="#86868B"
                />
                {searchQuery.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setSearchQuery('');
                      setCurrentPage(0);
                    }}
                  >
                    <Text style={styles.clearSearchBtn}>✕</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.quickAddGroup}>
                <Pressable
                  style={styles.addIncomeBtn}
                  onPress={() => onOpenAddModal('income')}
                >
                  <Text style={styles.addIncomeBtnText}>+ Income</Text>
                </Pressable>
                <Pressable
                  style={styles.addExpenseBtn}
                  onPress={() => onOpenAddModal('expense')}
                >
                  <Text style={styles.addExpenseBtnText}>+ Expense</Text>
                </Pressable>
              </View>
            </View>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryFilterRow}
            >
              <Pressable
                style={[
                  styles.catChip,
                  categoryFilter === 'all' && styles.catChipActive,
                ]}
                onPress={() => {
                  setCategoryFilter('all');
                  setCurrentPage(0);
                }}
              >
                <Text
                  style={[
                    styles.catChipText,
                    categoryFilter === 'all' && styles.catChipTextActive,
                  ]}
                >
                  All Categories ({filteredTransactions.length})
                </Text>
              </Pressable>

              {availableCategories.map((cat) => {
                const meta = CATEGORY_META[cat];
                const isSelected = categoryFilter === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[
                      styles.catChip,
                      isSelected && {
                        backgroundColor: '#1D1D1F',
                        borderColor: '#1D1D1F',
                      },
                    ]}
                    onPress={() => {
                      setCategoryFilter(isSelected ? 'all' : cat);
                      setCurrentPage(0);
                    }}
                  >
                    <Text style={styles.catChipIcon}>{meta.icon}</Text>
                    <Text
                      style={[
                        styles.catChipText,
                        isSelected && styles.catChipTextActive,
                      ]}
                    >
                      {meta.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Paginated Ledger Card */}
          <View style={styles.ledgerCard}>
            <View style={styles.ledgerHeaderRow}>
              <Text style={styles.ledgerCountText}>
                Showing {paginatedTransactions.length} of {filteredTransactions.length} entries
              </Text>
              {totalPages > 1 && (
                <View style={styles.inlinePager}>
                  <Pressable
                    style={[
                      styles.inlinePagerBtn,
                      safePageIndex === 0 && styles.inlinePagerBtnDisabled,
                    ]}
                    disabled={safePageIndex === 0}
                    onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  >
                    <Text style={styles.inlinePagerBtnText}>‹</Text>
                  </Pressable>
                  <Text style={styles.inlinePagerLabel}>
                    Page {safePageIndex + 1} / {totalPages}
                  </Text>
                  <Pressable
                    style={[
                      styles.inlinePagerBtn,
                      safePageIndex >= totalPages - 1 && styles.inlinePagerBtnDisabled,
                    ]}
                    disabled={safePageIndex >= totalPages - 1}
                    onPress={() =>
                      setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                  >
                    <Text style={styles.inlinePagerBtnText}>›</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <AnimatedPageContainer
              pageKey={`${activeSubPage}-${categoryFilter}-${safePageIndex}`}
              direction="horizontal"
            >
              {paginatedTransactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No matching transactions</Text>
                  <Text style={styles.emptySub}>
                    Try clearing your search filter or add a new transaction entry.
                  </Text>
                </View>
              ) : (
                <View style={styles.txList}>
                  {paginatedTransactions.map((tx, idx) => {
                    const meta = CATEGORY_META[tx.category];
                    const isIncome = tx.type === 'income';
                    return (
                      <View
                        key={tx.id}
                        style={[
                          styles.txRow,
                          idx === paginatedTransactions.length - 1 && styles.txRowLast,
                        ]}
                      >
                        <Pressable
                          style={styles.txMainPressable}
                          onPress={() => onEditTransaction(tx)}
                        >
                          <View
                            style={[
                              styles.txIconWrap,
                              { backgroundColor: `${meta.color}15` },
                            ]}
                          >
                            <Text style={[styles.txIcon, { color: meta.color }]}>
                              {meta.icon}
                            </Text>
                          </View>

                          <View style={styles.txDetails}>
                            <View style={styles.txTitleLine}>
                              <Text style={styles.txTitle} numberOfLines={1}>
                                {tx.title}
                              </Text>
                              <View style={styles.recurringPill}>
                                <Text style={styles.recurringPillText}>
                                  {meta.shortCode}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.txMetaText}>
                              {meta.name} • {tx.date}
                              {tx.notes ? ` • ${tx.notes}` : ''}
                            </Text>
                          </View>

                          <View style={styles.txAmountCol}>
                            <Text
                              style={[
                                styles.txAmount,
                                {
                                  color: isIncome
                                    ? STUDIO_COLORS.positiveDark
                                    : '#1D1D1F',
                                },
                              ]}
                            >
                              {isIncome ? '+' : '−'}
                              {formatCurrency(tx.amount, currencySymbol)}
                            </Text>
                            <Text style={styles.txEditHint}>Tap to edit</Text>
                          </View>
                        </Pressable>

                        <Pressable
                          style={styles.deleteBtn}
                          onPress={() => onDeleteTransaction(tx.id)}
                        >
                          <Text style={styles.deleteBtnText}>✕</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </AnimatedPageContainer>
          </View>
        </View>
      )}

      {/* ===============================================================
          SUB-PAGE 4: LEDGER HIGHLIGHTS & SUMMARY
         =============================================================== */}
      {activeSubPage === 'summary' && (
        <View style={styles.subPageStage}>
          <View style={[styles.summaryGrid, isWide && styles.summaryGridWide]}>
            <View style={styles.summaryDarkCard}>
              <Text style={styles.summaryDarkEyebrow}>NET MONTHLY FLOW</Text>
              <Text
                style={[
                  styles.summaryDarkValue,
                  {
                    color:
                      summary.savings >= 0
                        ? '#30D158'
                        : '#FF453A',
                  },
                ]}
              >
                {summary.savings >= 0 ? '+' : '−'}
                {formatCurrency(Math.abs(summary.savings), currencySymbol)}
              </Text>
              <Text style={styles.summaryDarkSub}>
                Across {summary.monthTransactions.length} total recorded entries in{' '}
                {summary.monthKey}
              </Text>

              <View style={styles.summaryDarkStatsRow}>
                <View style={styles.summaryDarkStatItem}>
                  <Text style={styles.summaryDarkStatLabel}>TOTAL INFLOW</Text>
                  <Text style={[styles.summaryDarkStatVal, { color: '#30D158' }]}>
                    +{formatCurrency(summary.totalIncome, currencySymbol)}
                  </Text>
                </View>
                <View style={styles.summaryDarkStatItem}>
                  <Text style={styles.summaryDarkStatLabel}>TOTAL OUTFLOW</Text>
                  <Text style={[styles.summaryDarkStatVal, { color: '#FFFFFF' }]}>
                    −{formatCurrency(summary.totalExpenses, currencySymbol)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryLightCol}>
              <View style={styles.highlightCard}>
                <Text style={styles.highlightEyebrow}>LARGEST EXPENSE</Text>
                {largestExpense ? (
                  <>
                    <Text style={styles.highlightTitle}>{largestExpense.title}</Text>
                    <Text style={styles.highlightAmount}>
                      −{formatCurrency(largestExpense.amount, currencySymbol)}
                    </Text>
                    <Text style={styles.highlightMeta}>
                      {largestExpense.category} • {largestExpense.date}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.highlightMeta}>No expenses recorded</Text>
                )}
              </View>

              <View style={styles.highlightCard}>
                <Text style={styles.highlightEyebrow}>LARGEST DEPOSIT</Text>
                {largestIncome ? (
                  <>
                    <Text style={styles.highlightTitle}>{largestIncome.title}</Text>
                    <Text
                      style={[
                        styles.highlightAmount,
                        { color: STUDIO_COLORS.positiveDark },
                      ]}
                    >
                      +{formatCurrency(largestIncome.amount, currencySymbol)}
                    </Text>
                    <Text style={styles.highlightMeta}>
                      {largestIncome.category} • {largestIncome.date}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.highlightMeta}>No income recorded</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      )}
    </SubPageDeck>
  );
};

const styles = StyleSheet.create({
  subPageStage: {
    gap: 16,
  },

  // Filter Card
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 14,
  },
  topSearchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchIcon: {
    color: '#86868B',
    fontSize: 16,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: '#1D1D1F',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 2,
    fontFamily: STUDIO_FONT_FAMILY,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as any)
      : null),
  },
  clearSearchBtn: {
    color: '#86868B',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  quickAddGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  addIncomeBtn: {
    backgroundColor: 'rgba(40, 205, 65, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  addIncomeBtnText: {
    color: '#1F9E32',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  addExpenseBtn: {
    backgroundColor: '#0071E3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  addExpenseBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  categoryFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  catChipActive: {
    backgroundColor: '#1D1D1F',
    borderColor: '#1D1D1F',
  },
  catChipIcon: {
    fontSize: 12,
  },
  catChipText: {
    color: '#1D1D1F',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },

  // Ledger Card
  ledgerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  ledgerCountText: {
    color: '#86868B',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  inlinePager: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlinePagerBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlinePagerBtnDisabled: {
    opacity: 0.35,
  },
  inlinePagerBtnText: {
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '700',
  },
  inlinePagerLabel: {
    color: '#1D1D1F',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#1D1D1F',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  emptySub: {
    color: '#86868B',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  txList: {
    gap: 4,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 12,
  },
  txRowLast: {
    borderBottomWidth: 0,
  },
  txMainPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  txIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  txDetails: {
    flex: 1,
  },
  txTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  txTitle: {
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  recurringPill: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recurringPillText: {
    color: '#86868B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  txMetaText: {
    color: '#86868B',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  txEditHint: {
    color: '#86868B',
    fontSize: 10,
    marginTop: 2,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#86868B',
    fontSize: 12,
    fontWeight: '700',
  },

  // Summary Sub-page
  summaryGrid: {
    gap: 16,
  },
  summaryGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryDarkCard: {
    flex: 1.2,
    backgroundColor: '#101014',
    borderRadius: 28,
    padding: 28,
    justifyContent: 'space-between',
  },
  summaryDarkEyebrow: {
    color: '#86868B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 10,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  summaryDarkValue: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.2,
    fontFamily: STUDIO_FONT_FAMILY,
    marginBottom: 8,
  },
  summaryDarkSub: {
    color: '#A1A1A6',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 24,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  summaryDarkStatsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  summaryDarkStatItem: {
    flex: 1,
  },
  summaryDarkStatLabel: {
    color: '#86868B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  summaryDarkStatVal: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  summaryLightCol: {
    flex: 1,
    gap: 16,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
  },
  highlightEyebrow: {
    color: '#86868B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 6,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  highlightTitle: {
    color: '#1D1D1F',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  highlightAmount: {
    color: '#1D1D1F',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: STUDIO_FONT_FAMILY,
    marginBottom: 4,
  },
  highlightMeta: {
    color: '#86868B',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: STUDIO_FONT_FAMILY,
  },
});
