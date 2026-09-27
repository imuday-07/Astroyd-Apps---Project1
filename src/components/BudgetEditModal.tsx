import React, { useEffect, useState } from 'react';
import {
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
  APPLE_FONT_FAMILY,
  CATEGORY_META,
  EXPENSE_CATEGORIES,
} from '../theme/boostlabTheme';
import { CategoryBudgetMap, ExpenseCategory } from '../types/budget';
import {
  formatCurrency,
  isDummyPresetLimits,
} from '../utils/calculations';

interface BudgetEditModalProps {
  visible: boolean;
  monthlyBudgetLimit: number;
  categoryLimits: CategoryBudgetMap;
  currencySymbol: string;
  onClose: () => void;
  onSave: (
    newMonthlyLimit: number,
    newCategoryLimits: CategoryBudgetMap
  ) => void;
}

export const BudgetEditModal: React.FC<BudgetEditModalProps> = ({
  visible,
  monthlyBudgetLimit,
  categoryLimits,
  currencySymbol,
  onClose,
  onSave,
}) => {
  const isPresetDummy = isDummyPresetLimits(monthlyBudgetLimit, categoryLimits);
  const safeMonthly = isPresetDummy ? 0 : monthlyBudgetLimit;
  const safeCategory = (cat: ExpenseCategory) =>
    isPresetDummy ? '0' : String(categoryLimits[cat] || 0);

  const [monthlyStr, setMonthlyStr] = useState(String(safeMonthly));
  const [limits, setLimits] = useState<Record<ExpenseCategory, string>>({
    Rent: safeCategory('Rent'),
    Food: safeCategory('Food'),
    Travel: safeCategory('Travel'),
    Shopping: safeCategory('Shopping'),
    Bills: safeCategory('Bills'),
    Entertainment: safeCategory('Entertainment'),
    EMI: safeCategory('EMI'),
    Other: safeCategory('Other'),
  });

  useEffect(() => {
    const preset = isDummyPresetLimits(monthlyBudgetLimit, categoryLimits);
    setMonthlyStr(String(preset ? 0 : monthlyBudgetLimit));
    setLimits({
      Rent: preset ? '0' : String(categoryLimits.Rent || 0),
      Food: preset ? '0' : String(categoryLimits.Food || 0),
      Travel: preset ? '0' : String(categoryLimits.Travel || 0),
      Shopping: preset ? '0' : String(categoryLimits.Shopping || 0),
      Bills: preset ? '0' : String(categoryLimits.Bills || 0),
      Entertainment: preset ? '0' : String(categoryLimits.Entertainment || 0),
      EMI: preset ? '0' : String(categoryLimits.EMI || 0),
      Other: preset ? '0' : String(categoryLimits.Other || 0),
    });
  }, [monthlyBudgetLimit, categoryLimits, visible]);

  const handleCategoryChange = (cat: ExpenseCategory, val: string) => {
    setLimits((prev) => ({ ...prev, [cat]: val }));
  };

  const sumOfCategories = EXPENSE_CATEGORIES.reduce((sum, cat) => {
    const num = parseFloat(limits[cat] || '0');
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const handleAutoSum = () => {
    setMonthlyStr(String(Math.round(sumOfCategories)));
  };

  const handleSave = () => {
    const parsedMonthly =
      parseFloat(monthlyStr.replace(/[^0-9.]/g, '')) || sumOfCategories || 1000;
    const newMap: CategoryBudgetMap = {
      Rent: parseFloat(limits.Rent) || 0,
      Food: parseFloat(limits.Food) || 0,
      Travel: parseFloat(limits.Travel) || 0,
      Shopping: parseFloat(limits.Shopping) || 0,
      Bills: parseFloat(limits.Bills) || 0,
      Entertainment: parseFloat(limits.Entertainment) || 0,
      EMI: parseFloat(limits.EMI) || 0,
      Other: parseFloat(limits.Other) || 0,
    };
    onSave(parsedMonthly, newMap);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>SMART HOME ENVELOPES</Text>
              <Text style={styles.title}>Calibrate Monthly Limits</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Master Cap Box */}
            <View style={styles.masterCapBox}>
              <View style={styles.masterTopRow}>
                <Text style={styles.masterLabel}>OVERALL MONTHLY CAP</Text>
                <Pressable style={styles.syncPill} onPress={handleAutoSum}>
                  <Text style={styles.syncPillText}>
                    Sync to Sum ({formatCurrency(sumOfCategories, currencySymbol)})
                  </Text>
                </Pressable>
              </View>

              <View style={styles.masterInputRow}>
                <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                <TextInput
                  style={styles.masterInput}
                  value={monthlyStr}
                  onChangeText={setMonthlyStr}
                  keyboardType="numeric"
                  placeholder="3000"
                  placeholderTextColor="#A1A1A6"
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>CATEGORY ENVELOPE CAPS</Text>

            <View style={styles.categoryList}>
              {EXPENSE_CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                return (
                  <View key={cat} style={styles.catRow}>
                    <View style={styles.catLeft}>
                      <View
                        style={[
                          styles.catIconBox,
                          { backgroundColor: `${meta.color}18` },
                        ]}
                      >
                        <Text style={styles.catEmoji}>{meta.icon}</Text>
                      </View>
                      <Text style={styles.catName}>{cat}</Text>
                    </View>

                    <View style={styles.catInputWrap}>
                      <Text style={styles.catCurrency}>{currencySymbol}</Text>
                      <TextInput
                        style={styles.catInput}
                        value={limits[cat]}
                        onChangeText={(val) => handleCategoryChange(cat, val)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#A1A1A6"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footerRow}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Calibration</Text>
            </Pressable>
          </View>
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
    maxWidth: 520,
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
    fontFamily: APPLE_FONT_FAMILY,
  },
  title: {
    color: '#1D1D1F',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: APPLE_FONT_FAMILY,
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
    gap: 16,
    paddingBottom: 10,
  },
  masterCapBox: {
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  masterTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  masterLabel: {
    color: '#6E6E73',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    fontFamily: APPLE_FONT_FAMILY,
  },
  syncPill: {
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 980,
  },
  syncPillText: {
    color: '#0071E3',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: APPLE_FONT_FAMILY,
  },
  masterInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  currencyPrefix: {
    color: '#1D1D1F',
    fontSize: 26,
    fontWeight: '700',
    fontFamily: APPLE_FONT_FAMILY,
  },
  masterInput: {
    flex: 1,
    minWidth: 0,
    color: '#1D1D1F',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: APPLE_FONT_FAMILY,
    padding: 0,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as any)
      : null),
  },
  sectionLabel: {
    color: '#6E6E73',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 4,
    fontFamily: APPLE_FONT_FAMILY,
  },
  categoryList: {
    gap: 10,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: {
    fontSize: 17,
  },
  catName: {
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: APPLE_FONT_FAMILY,
  },
  catInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    width: 130,
  },
  catCurrency: {
    color: '#6E6E73',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
    fontFamily: APPLE_FONT_FAMILY,
  },
  catInput: {
    flex: 1,
    minWidth: 0,
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    fontFamily: APPLE_FONT_FAMILY,
    padding: 0,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as any)
      : null),
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
  },
  cancelBtn: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 980,
  },
  cancelBtnText: {
    color: '#1D1D1F',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: APPLE_FONT_FAMILY,
  },
  saveBtn: {
    backgroundColor: '#0071E3',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 980,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: APPLE_FONT_FAMILY,
  },
});
