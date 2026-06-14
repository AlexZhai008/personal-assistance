import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Plus, Trash2 } from 'lucide-react';
import type { ParsedExpense } from '../utils/localParser';

interface ExpenseWidgetProps {
  expenses: ParsedExpense[];
  onAddExpense: (exp: ParsedExpense) => void;
  onRemoveExpense: (index: number) => void;
  widgetRef: React.RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
}

export const ExpenseWidget: React.FC<ExpenseWidgetProps> = ({
  expenses,
  onAddExpense,
  onRemoveExpense,
  widgetRef,
  readOnly = false,
}) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('餐饮');

  const totalExpense = expenses
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIncome = expenses
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    const description = desc.trim();
    if (isNaN(amt) || amt <= 0 || !description) return;

    onAddExpense({
      amount: amt,
      category: type === 'income' ? '收入' : category,
      description,
      type,
    });

    setDesc('');
    setAmount('');
  };

  return (
    <div ref={widgetRef} className="sketchy-box paper-grid" style={styles.container}>
      {/* Washi tape decoration */}
      <div className="washi-tape washi-tape-peach" style={styles.tape}>
        今日收支 LEDGER
      </div>

      <div style={styles.content}>
        {/* Ledger Summary Cards */}
        <div style={styles.summaryContainer}>
          <div style={{ ...styles.summaryCard, borderLeft: '3px solid #de7b70' }}>
            <span style={styles.summaryLabel}>今日支出</span>
            <span style={{ ...styles.summaryValue, color: '#de7b70' }}>
              -￥{totalExpense.toFixed(1)}
            </span>
          </div>
          <div style={{ ...styles.summaryCard, borderLeft: '3px solid #8fa89b' }}>
            <span style={styles.summaryLabel}>今日收入</span>
            <span style={{ ...styles.summaryValue, color: '#8fa89b' }}>
              +￥{totalIncome.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Ledger Records List */}
        <div style={styles.list}>
          {expenses.map((exp, index) => {
            const isExp = exp.type === 'expense';
            return (
              <div key={index} style={styles.row}>
                <div style={styles.rowLeft}>
                  <div
                    style={{
                      ...styles.arrowCircle,
                      backgroundColor: isExp ? 'rgba(222, 123, 112, 0.1)' : 'rgba(143, 168, 155, 0.1)',
                      color: isExp ? '#de7b70' : '#8fa89b',
                    }}
                  >
                    {isExp ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                  </div>
                  <div style={styles.itemDetails}>
                    <span style={styles.itemDesc}>{exp.description}</span>
                    <span style={styles.itemCategory}>{exp.category}</span>
                  </div>
                </div>
                <div style={styles.rowRight}>
                  <span
                    style={{
                      ...styles.itemAmount,
                      color: isExp ? '#4a3e3d' : '#8fa89b',
                    }}
                  >
                    {isExp ? '-' : '+'}￥{exp.amount.toFixed(1)}
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() => onRemoveExpense(index)}
                      style={styles.deleteBtn}
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {expenses.length === 0 && (
            <div style={styles.empty}>
              {readOnly ? "这天没有任何收支记录哦~" : "今天还没有任何收支记录哦，在上方写话或在下方记账吧~"}
            </div>
          )}
        </div>

        {/* Manual Ledger Form */}
        {!readOnly && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="text"
              placeholder="商品名/备注"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="sketch-input"
              style={styles.inputDesc}
              required
            />
            <input
              type="number"
              placeholder="金额"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="sketch-input"
              style={styles.inputAmount}
              min="0.01"
              step="0.01"
              required
            />
            <div style={styles.selectors}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'expense' | 'income')}
                style={styles.select}
              >
                <option value="expense">支出</option>
                <option value="income">收入</option>
              </select>
              {type === 'expense' && (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={styles.select}
                >
                  <option value="餐饮">餐饮</option>
                  <option value="交通">交通</option>
                  <option value="购物">购物</option>
                  <option value="娱乐">娱乐</option>
                  <option value="日用">日用</option>
                  <option value="医疗">医疗</option>
                  <option value="其他">其他</option>
                </select>
              )}
            </div>
            <button type="submit" className="sketch-button" style={styles.submitBtn}>
              <Plus size={14} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'relative' as const,
    padding: '28px 16px 16px 16px',
    backgroundColor: 'var(--color-paper)',
    minHeight: '260px',
  },
  tape: {
    top: '-8px',
    right: '20px',
    transform: 'rotate(-2deg)',
    zIndex: 5,
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    height: '100%',
  },
  summaryContainer: {
    display: 'flex',
    gap: '10px',
    marginTop: '6px',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    border: '1.5px solid var(--color-border)',
    borderRadius: '8px',
    padding: '6px 10px',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '1px 1px 2px rgba(0,0,0,0.04)',
  },
  summaryLabel: {
    fontSize: '10px',
    color: 'var(--color-text-muted)',
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: '2px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    maxHeight: '140px',
    overflowY: 'auto' as const,
    paddingRight: '2px',
    minHeight: '80px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    backgroundColor: '#fff',
    border: '1px solid rgba(92, 74, 60, 0.08)',
    borderRadius: '8px',
  },
  rowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  arrowCircle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  itemDesc: {
    fontSize: '13px',
    fontWeight: '600',
  },
  itemCategory: {
    fontSize: '9px',
    color: 'var(--color-text-muted)',
    marginTop: '1px',
  },
  rowRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  itemAmount: {
    fontSize: '13px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#ef4444',
    opacity: 0.6,
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  empty: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    padding: '16px 4px',
    textAlign: 'center' as const,
  },
  form: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    borderTop: '1px dashed var(--color-paper-lines)',
    paddingTop: '10px',
    flexWrap: 'wrap' as const,
  },
  inputDesc: {
    flex: 2,
    fontSize: '12px',
    padding: '4px',
  },
  inputAmount: {
    width: '60px',
    fontSize: '12px',
    padding: '4px',
  },
  selectors: {
    display: 'flex',
    gap: '4px',
  },
  select: {
    fontSize: '11px',
    padding: '3px',
    border: '1.5px solid var(--color-border)',
    borderRadius: '6px',
    backgroundColor: '#fff',
  },
  submitBtn: {
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
