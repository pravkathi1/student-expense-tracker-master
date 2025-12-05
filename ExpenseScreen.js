import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

// --- Date Utility Functions for Filtering (Task 1B) ---
const getStartAndEndOfMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1).toISOString().split('T')[0];
  const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
  return { start, end };
};

const getStartAndEndOfWeek = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  const start = startOfWeek.toISOString().split('T')[0];
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const end = endOfWeek.toISOString().split('T')[0];
  return { start, end };
};

// --- ExpenseScreen Component ---
export default function ExpenseScreen() {
  const db = useSQLiteContext();

  // Task 1: Filtering State
  const [filter, setFilter] = useState('All');
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  // Task 2: Totals State
  const [overallTotal, setOverallTotal] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState([]);

  // Task 3: Editing State
  const [editingExpense, setEditingExpense] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNote, setEditNote] = useState('');

  // ------------------------------------
  // Task 2: Analytics & Totals Functions
  // ------------------------------------
  const getFilterSql = (currentFilter) => {
    let whereClause = '';
    let params = [];

    if (currentFilter === 'This Month') {
      const { start, end } = getStartAndEndOfMonth();
      whereClause = 'WHERE date BETWEEN ? AND ?';
      params = [start, end];
    } else if (currentFilter === 'This Week') {
      const { start, end } = getStartAndEndOfWeek();
      whereClause = 'WHERE date BETWEEN ? AND ?';
      params = [start, end];
    }
    return { whereClause, params };
  };

  const calculateTotals = useCallback(
    async (currentFilter) => {
      const { whereClause, params } = getFilterSql(currentFilter);

      try {
        const overallResult = await db.getAllAsync(
          `SELECT SUM(amount) as total FROM expenses ${whereClause};`,
          params
        );
        setOverallTotal(overallResult[0].total || 0);

        const categoryResult = await db.getAllAsync(
          `SELECT category, SUM(amount) as total
           FROM expenses ${whereClause}
           GROUP BY category
           ORDER BY total DESC;`,
          params
        );
        setCategoryTotals(categoryResult);
      } catch (error) {
        console.error('Error calculating totals:', error);
      }
    },
    [db]
  );

  // ------------------------------------
  // Task 1: Load and Filter Expenses
  // ------------------------------------
  const loadExpenses = useCallback(
    async (currentFilter) => {
      const { whereClause, params } = getFilterSql(currentFilter);

      try {
        const rows = await db.getAllAsync(
          `SELECT * FROM expenses ${whereClause} ORDER BY id DESC;`,
          params
        );
        setExpenses(rows);
        await calculateTotals(currentFilter);
      } catch (error) {
        console.error('Error loading expenses:', error);
      }
    },
    [db, calculateTotals]
  );

  useEffect(() => {
    loadExpenses(filter);
  }, [filter, loadExpenses]);

  // ------------------------------------
  // CRUD Operations
  // ------------------------------------
  const addExpense = async () => {
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0 || !category.trim()) {
      alert('Please enter a valid amount and category.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    try {
      await db.runAsync(
        'INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?);',
        [amountNumber, category.trim(), note.trim() || null, today]
      );
      setAmount('');
      setCategory('');
      setNote('');
      loadExpenses(filter);
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const deleteExpense = async (id) => {
    try {
      await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
      loadExpenses(filter);
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleEditSelect = (expense) => {
    setEditingExpense(expense);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.category);
    setEditNote(expense.note || '');
  };

  const saveEditedExpense = async () => {
    const amountNumber = parseFloat(editAmount);
    const id = editingExpense.id;
    if (isNaN(amountNumber) || amountNumber <= 0 || !editCategory.trim()) {
      alert('Please enter a valid amount and category for the update.');
      return;
    }
    try {
      await db.runAsync(
        `UPDATE expenses
         SET amount = ?, category = ?, note = ?, date = ?
         WHERE id = ?;`,
        [amountNumber, editCategory.trim(), editNote.trim() || null, editingExpense.date, id]
      );
      setEditingExpense(null);
      loadExpenses(filter);
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  useEffect(() => {
    async function setup() {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          note TEXT,
          date TEXT NOT NULL
        );
      `);
    }
    setup();
  }, [db]);

  // ------------------------------------
  // UI Rendering Helpers
  // ------------------------------------
  const renderExpense = ({ item }) => (
    <View style={styles.expenseRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.expenseAmount}>${Number(item.amount).toFixed(2)}</Text>
        <Text style={styles.expenseCategory}>{item.category} ({item.date})</Text>
        {item.note ? <Text style={styles.expenseNote}>{item.note}</Text> : null}
      </View>

      <TouchableOpacity onPress={() => handleEditSelect(item)} style={styles.editButton}>
        <Text style={styles.editText}>Edit</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => deleteExpense(item.id)}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const filterButtons = ['All', 'This Week', 'This Month'];

  // ------------------------------------
  // Main Component Return
  // ------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.heading}>Student Expense Tracker</Text>

        {/* Filter UI */}
        <View style={styles.filterContainer}>
          {filterButtons.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.activeFilterButton]}
              onPress={() => setFilter(f)}
            >
              <Text style={styles.filterText}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Totals Display */}
        <View style={styles.totalsContainer}>
          <Text style={styles.totalLabel}>
            Total Spending ({filter}):
            <Text style={styles.overallTotalValue}> ${overallTotal.toFixed(2)}</Text>
          </Text>

          <Text style={styles.categoryHeading}>By Category:</Text>
          {categoryTotals.map(item => (
            <Text key={item.category} style={styles.categoryRow}>
              • {item.category}:
              <Text style={styles.categoryTotalValue}> ${item.total.toFixed(2)}</Text>
            </Text>
          ))}
        </View>

        {/* Bar Chart */}
        {categoryTotals && categoryTotals.length > 0 && (
          <BarChart
            data={{
              labels: categoryTotals.map(item => item.category),
              datasets: [
                {
                  data: categoryTotals.map(item => item.total),
                },
              ],
            }}
            width={Dimensions.get('window').width - 32}
            height={220}
            yAxisLabel="$"
            fromZero
            showValuesOnTopOfBars
            withInnerLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            chartConfig={{
              backgroundColor: '#1f2937',
              backgroundGradientFrom: '#1f2937',
              backgroundGradientTo: '#111827',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(251, 191, 36, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(229, 231, 235, ${opacity})`,
              style: {
                borderRadius: 8,
              },
            }}
            style={{
              marginVertical: 12,
              borderRadius: 8,
            }}
          />
        )}

        {/* Expense Input Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Amount (e.g. 12.50)"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={styles.input}
            placeholder="Category (Food, Books, Rent...)"
            placeholderTextColor="#9ca3af"
            value={category}
            onChangeText={setCategory}
          />
          <TextInput
            style={styles.input}
            placeholder="Note (optional)"
            placeholderTextColor="#9ca3af"
            value={note}
            onChangeText={setNote}
          />
          <Button title="Add Expense" onPress={addExpense} />
        </View>

        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderExpense}
          ListEmptyComponent={<Text style={styles.empty}>No expenses yet for this filter.</Text>}
          scrollEnabled={false}
        />

        <Text style={styles.footer}>
          Enter your expenses and they’ll be saved locally with SQLite.
        </Text>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={!!editingExpense}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingExpense(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>Edit Expense</Text>

            <TextInput
              style={styles.input}
              placeholder="Amount"
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Category"
              value={editCategory}
              onChangeText={setEditCategory}
            />
            <TextInput
              style={styles.input}
              placeholder="Note"
              value={editNote}
              onChangeText={setEditNote}
            />

            <View style={styles.modalButtonContainer}>
              <Button title="Cancel" onPress={() => setEditingExpense(null)} color="#f87171" />
              <Button title="Save Changes" onPress={saveEditedExpense} color="#10b981" />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ------------------------------------
// Step 12: Styling
// ------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#111827' },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#374151',
    borderRadius: 8,
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#fbbf24',
  },
  filterText: {
    color: '#fff',
    fontWeight: '600',
  },
  totalsContainer: {
    backgroundColor: '#1f2937',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 8,
    borderBottomColor: '#374151',
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  overallTotalValue: {
    color: '#34d399',
    fontSize: 20,
    fontWeight: '700',
  },
  categoryHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 8,
    marginBottom: 4,
  },
  categoryRow: {
    fontSize: 14,
    color: '#e5e7eb',
    marginLeft: 10,
  },
  categoryTotalValue: {
    fontWeight: '700',
    color: '#fbbf24',
  },
  form: {
    marginBottom: 16,
    gap: 8,
  },
  input: {
    padding: 10,
    backgroundColor: '#1f2937',
    color: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fbbf24',
  },
  expenseCategory: {
    fontSize: 14,
    color: '#e5e7eb',
  },
  expenseNote: {
    fontSize: 12,
    color: '#9ca3af',
  },
  editButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginRight: 10,
  },
  editText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  delete: {
    color: '#f87171',
    fontSize: 20,
    marginLeft: 12,
  },
  empty: {
    color: '#9ca3af',
    marginTop: 24,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 12,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 15,
  },
  modalHeading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
});
