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
import { validateNoSensitiveBankingSecrets } from '../services/budgetBackend';
import {
  APPLE_FONT_FAMILY,
  APPLE_TV_COLORS,
  CATEGORY_META,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../theme/boostlabTheme';
import {
  CategoryName,
  Transaction,
  TransactionType,
} from '../types/budget';

interface TransactionModalProps {
  visible: boolean;
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  currencySymbol: string;
  selectedMonthKey: string;
  onClose: () => void;
  onSave: (txData: Omit<Transaction, 'id'>, existingId?: string) => void;
  onDelete?: (id: string) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  initialType = 'expense',
  editingTransaction,
  currencySymbol,
  selectedMonthKey,
  onClose,
  onSave,
  onDelete,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<CategoryName>('Food');
  const [date, setDate] = useState(`${selectedMonthKey}-26`);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setTitle(editingTransaction.title);
      setAmountStr(String(editingTransaction.amount));
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setNotes(editingTransaction.notes || '');
      setErrorMsg('');
    } else {
      setType(initialType);
      setTitle('');
      setAmountStr('');
      setCategory(initialType === 'income' ? 'Salary' : 'Food');
      setDate(`${selectedMonthKey}-26`);
      setNotes('');
      setErrorMsg('');
    }
  }, [editingTransaction, initialType, selectedMonthKey, visible]);

  const handleTypeSwitch = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income' && !INCOME_CATEGORIES.includes(category as any)) {
      setCategory('Salary');
    } else if (
      newType === 'expense' &&
      !EXPENSE_CATEGORIES.includes(category as any)
    ) {
      setCategory('Food');
    }
  };

  const handleSave = () => {
    const parsedAmount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    const secWarn = validateNoSensitiveBankingSecrets(`${title} ${notes}`);
    if (secWarn) {
      setErrorMsg(secWarn);
      return;
    }

    const cleanTitle =
      title.trim() || `${category} ${type === 'income' ? 'Income' : 'Expense'}`;
    const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
      ? date.trim()
      : `${selectedMonthKey}-15`;

    onSave(
      {
        title: cleanTitle,
        amount: parsedAmount,
        type,
        category,
        date: cleanDate,
        notes: notes.trim() || undefined,
      },
      editingTransaction?.id
    );
    onClose();
  };

  const availableCategories: CategoryName[] =
    type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

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
              <Text style={styles.eyebrow}>BUDGET STUDIO</Text>
              <Text style={styles.title}>
                {editingTransaction ? 'Edit Entry' : 'New Ledger Entry'}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}
          >
            {/* Segmented Type Selector */}
            <View style={styles.segmentedControl}>
              <Pressable
                style={[
                  styles.segmentOption,
                  type === 'expense' && styles.segmentOptionActive,
                ]}
                onPress={() => handleTypeSwitch('expense')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === 'expense' && styles.segmentTextActive,
                  ]}
                >
                  Expense
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentOption,
                  type === 'income' && styles.segmentOptionActive,
                ]}
                onPress={() => handleTypeSwitch('income')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === 'income' && styles.segmentTextActive,
                  ]}
                >
                  Income
                </Text>
              </Pressable>
            </View>

            {/* Big Amount Input */}
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>AMOUNT</Text>
              <View style={styles.amountRow}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                </View>
                <TextInput
                  style={styles.amountInput}
                  value={amountStr}
                  onChangeText={(v) => {
                    setAmountStr(v);
                    setErrorMsg('');
                  }}
                  placeholder="0.00"
                  placeholderTextColor="#A1A1A6"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Title Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder={
                  type === 'income'
                    ? 'e.g., Monthly Salary, Design Retainer'
                    : 'e.g., Groceries, Apartment Rent, Utilities'
                }
                placeholderTextColor="#86868B"
              />
            </View>

            {/* Category Grid */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CATEGORY ENVELOPE</Text>
              <View style={styles.categoryWrap}>
                {availableCategories.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const selected = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[
                        styles.categoryChip,
                        selected && styles.categoryChipSelected,
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={styles.categoryEmoji}>{meta.icon}</Text>
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Date & Notes Row */}
            <View style={styles.twoColFields}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="2026-09-26"
                  placeholderTextColor="#86868B"
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>NOTES (OPTIONAL)</Text>
                <TextInput
                  style={styles.textInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Card, UPI, Bank transfer, etc."
                  placeholderTextColor="#86868B"
                />
              </View>
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footerRow}>
            {editingTransaction && onDelete ? (
              <Pressable
                style={styles.deleteBtn}
                onPress={() => {
                  onDelete(editingTransaction.id);
                  onClose();
                }}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {editingTransaction ? 'Save Changes' : 'Add to Ledger'}
              </Text>
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
  formContent: {
    gap: 16,
    paddingBottom: 10,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    padding: 4,
    borderRadius: 980,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 980,
    alignItems: 'center',
  },
  segmentOptionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  segmentText: {
    color: '#6E6E73',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: APPLE_FONT_FAMILY,
  },
  segmentTextActive: {
    color: '#1D1D1F',
  },
  amountBox: {
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  amountLabel: {
    color: '#6E6E73',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: APPLE_FONT_FAMILY,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  currencyBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 113, 227, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  currencyPrefix: {
    color: '#0071E3',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: APPLE_FONT_FAMILY,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    color: '#1D1D1F',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'left',
    fontFamily: APPLE_FONT_FAMILY,
    padding: 0,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as any)
      : null),
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: '#6E6E73',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    fontFamily: APPLE_FONT_FAMILY,
  },
  textInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#1D1D1F',
    fontSize: 15,
    fontFamily: APPLE_FONT_FAMILY,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as any)
      : null),
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 980,
  },
  categoryChipSelected: {
    backgroundColor: '#1D1D1F',
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryChipText: {
    color: '#1D1D1F',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: APPLE_FONT_FAMILY,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  twoColFields: {
    flexDirection: 'row',
    gap: 12,
  },
  errorText: {
    color: APPLE_TV_COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: APPLE_FONT_FAMILY,
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
  deleteBtn: {
    backgroundColor: '#FFECEB',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 980,
    marginRight: 'auto',
  },
  deleteBtnText: {
    color: '#D70015',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: APPLE_FONT_FAMILY,
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
