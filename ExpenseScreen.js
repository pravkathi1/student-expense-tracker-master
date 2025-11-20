import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import DateTimePicker from '@react-native-community/datetimepicker';

const FILTERS = {
  ALL: 'ALL',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
};

export default function ExpenseScreen() {
  const db = useSQLiteContext();

  // Add form states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // Data states
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState(FILTERS.ALL);

  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editDate, setEditDate] = useState(new Date());
  const [showEditPicker, setShowEditPicker] = useState(false);

  // -----------------------------
  // CREATE TABLE + LOAD DATA
  // -----------------------------
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
      loadExpenses();
    }
    setup();
  }, []);

  const loadExpenses = async () => {
    const rows = await db.getAllAsync(
      'SELECT * FROM expenses ORDER BY date DESC;'
    );
    setExpenses(rows);
  };

  // -----------------------------
  // ADD EXPENSE
  // -----------------------------
  const addExpense = async () => {
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) return;

    if (!category.trim()) return;

    await db.runAsync(
      `INSERT INTO expenses (amount, category, note, date)
       VALUES (?, ?, ?, ?);`,
      [amountNumber, category.trim(), note.trim() || null, date.toISOString()]
    );

    setAmount('');
    setCategory('');
    setNote('');
    setDate(new Date());

    loadExpenses();
  };

  // -----------------------------
  // DELETE EXPENSE
  // -----------------------------
  const deleteExpense = async (id) => {
    await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    loadExpenses();
  };

  // -----------------------------
  // EDIT EXPENSE
  // -----------------------------
  const openEdit = (item) => {
    setEditingExpense(item);
    setEditDate(new Date(item.date));
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    const amountNumber = parseFloat(editingExpense.amount);
    if (isNaN(amountNumber) || amountNumber <= 0) return;

    await db.runAsync(
      `UPDATE expenses
       SET amount = ?, category = ?, note = ?, date = ?
       WHERE id = ?;`,
      [
        amountNumber,
        editingExpense.category.trim(),
        editingExpense.note?.trim() || null,
        editDate.toISOString(),
        editingExpense.id,
      ]
    );

    setEditModalVisible(false);
    setEditingExpense(null);
    loadExpenses();
  };

  // -----------------------------
  // FILTER LOGIC
  // -----------------------------
  const getFilteredExpenses = () => {
    if (filter === FILTERS.ALL) return expenses;

    const now = new Date();

    if (filter === FILTERS.WEEK) {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      return expenses.filter(e => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      });
    }

    if (filter === FILTERS.MONTH) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      return expenses.filter(e => {
        const d = new Date(e.date);
        return d >= start && d < end;
      });
    }

    return expenses;
  };

  const filtered = getFilteredExpenses();

  // -----------------------------
  // TOTALS
  // -----------------------------
  const total = filtered.reduce((acc, e) => acc + Number(e.amount), 0);

  const categoryTotals = filtered.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  // -----------------------------
  // RENDER ROW
  // -----------------------------
  const renderExpense = ({ item }) => (
    <TouchableOpacity style={styles.expenseRow} onPress={() => openEdit(item)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.expenseAmount}>${Number(item.amount).toFixed(2)}</Text>
        <Text style={styles.expenseCategory}>{item.category}</Text>
        {item.note ? <Text style={styles.expenseNote}>{item.note}</Text> : null}
        <Text style={styles.expenseNote}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>

      <TouchableOpacity onPress={() => deleteExpense(item.id)}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Student Expense Tracker</Text>

      {/* FILTER BUTTONS */}
      <View style={styles.filterRow}>
        <Button title="All" onPress={() => setFilter(FILTERS.ALL)} />
        <Button title="This Week" onPress={() => setFilter(FILTERS.WEEK)} />
        <Button title="This Month" onPress={() => setFilter(FILTERS.MONTH)} />
      </View>

      {/* TOTALS */}
      <Text style={styles.total}>
        Total: <Text style={{ color: '#fbbf24' }}>${total.toFixed(2)}</Text>
      </Text>

      {Object.entries(categoryTotals).map(([cat, amt]) => (
        <Text key={cat} style={styles.categoryTotal}>
          {cat}: <Text style={{ color: '#fbbf24' }}>${amt.toFixed(2)}</Text>
        </Text>
      ))}

      {/* ADD FORM */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Amount"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <TextInput
          style={styles.input}
          placeholder="Category"
          placeholderTextColor="#9ca3af"
          value={category}
          onChangeText={setCategory}
        />

        <TextInput
          style={styles.input}
          placeholder="Note"
          placeholderTextColor="#9ca3af"
          value={note}
          onChangeText={setNote}
        />

        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <Text style={styles.dateButton}>
            Select Date: {date.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={date}
            onChange={(e, selected) => {
              setShowPicker(false);
              if (selected) setDate(selected);
            }}
          />
        )}

        <Button title="Add Expense" onPress={addExpense} />
      </View>

      {/* LIST */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        ListEmptyComponent={<Text style={styles.empty}>No expenses yet.</Text>}
      />

      {/* EDIT MODAL */}
      <Modal visible={editModalVisible} animationType="slide">
        <View style={styles.modal}>
          <Text style={styles.modalHeading}>Edit Expense</Text>

          <TextInput
            style={styles.input}
            value={String(editingExpense?.amount || '')}
            onChangeText={(v) =>
              setEditingExpense({ ...editingExpense, amount: v })
            }
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            value={editingExpense?.category || ''}
            onChangeText={(v) =>
              setEditingExpense({ ...editingExpense, category: v })
            }
          />

          <TextInput
            style={styles.input}
            value={editingExpense?.note || ''}
            onChangeText={(v) =>
              setEditingExpense({ ...editingExpense, note: v })
            }
          />

          <TouchableOpacity onPress={() => setShowEditPicker(true)}>
            <Text style={styles.dateButton}>
              Edit Date: {editDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          {showEditPicker && (
            <DateTimePicker
              value={editDate}
              onChange={(e, selected) => {
                setShowEditPicker(false);
                if (selected) setEditDate(selected);
              }}
            />
          )}

          <Button title="Save Changes" onPress={saveEdit} />

          <Button
            title="Cancel"
            color="red"
            onPress={() => setEditModalVisible(false)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// -----------------------------
// STYLES
// -----------------------------
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#111827' },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  form: {
    marginBottom: 20,
    gap: 10,
  },
  input: {
    padding: 10,
    backgroundColor: '#1f2937',
    color: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  dateButton: {
    color: '#fbbf24',
    marginBottom: 8,
  },
  total: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 8,
  },
  categoryTotal: {
    color: '#e5e7eb',
    marginBottom: 4,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
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
  delete: {
    color: '#f87171',
    fontSize: 24,
    marginLeft: 12,
  },
  empty: {
    color: '#9ca3af',
    marginTop: 20,
    textAlign: 'center',
  },
  modal: {
    flex: 1,
    padding: 16,
    backgroundColor: '#111827',
  },
  modalHeading: {
    fontSize: 22,
    color: '#fff',
    marginBottom: 16,
  },
});
