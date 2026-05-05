import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Search, Download, Filter, X, Plus, Trash2 } from 'lucide-react';
import paymentService from '../api/services/paymentService';
import studentService from '../api/services/studentService';
import { format, isValid } from 'date-fns';
import toast from 'react-hot-toast';

const METHODS = ['Cash', 'Online Transfer', 'UPI', 'Cheque', 'Card'];

const RecordPaymentModal = ({ isOpen, onClose, onSave, students }) => {
  const [form, setForm] = useState({
    studentId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Cash',
    invoiceId: `INV-${Date.now()}`
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        studentId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'Cash',
        invoiceId: `INV-${Date.now()}`
      });
    }
  }, [isOpen]);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentId) { toast.error('Please select a student'); return; }
    setSaving(true);
    try {
      const selectedStudent = students.find(s => s.id === form.studentId);
      await onSave({ ...form, studentName: selectedStudent?.name || '' });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-surface-container-lowest rounded-lg shadow-[0_32px_64px_rgba(25,28,29,0.12)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-8 py-5 border-b border-surface-container-low">
          <h3 className="text-lg font-black text-primary">Record Payment</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <X size={18} className="text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Student *</label>
            <select
              name="studentId"
              value={form.studentId}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm"
            >
              <option value="">— Select a student —</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.school})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Amount (₹) *</label>
              <input
                required
                type="number"
                name="amount"
                min="1"
                value={form.amount}
                onChange={handleChange}
                placeholder="e.g. 4500"
                className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm placeholder:text-outline/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Method</label>
              <select
                name="method"
                value={form.method}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm"
              >
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Invoice #</label>
              <input
                type="text"
                name="invoiceId"
                value={form.invoiceId}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-container text-on-surface-variant font-bold rounded-md hover:bg-surface-container-high transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-md shadow-lg transition-all active:scale-95 disabled:opacity-60 text-sm"
            >
              {saving ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const safeDate = (d) => {
  if (!d) return null;
  const parsed = new Date(d);
  return isValid(parsed) ? parsed : null;
};

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      const [pays, studs] = await Promise.all([
        paymentService.getAll().catch(() => []),
        studentService.getAll().catch(() => []),
      ]);
      setPayments(Array.isArray(pays) ? pays : []);
      setStudents(Array.isArray(studs) ? studs : []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecord = async (formData) => {
    try {
      const created = await paymentService.record(formData);
      setPayments(prev => [{ ...created, date: new Date().toISOString() }, ...prev]);
      toast.success('Payment recorded successfully!');
    } catch (error) {
      toast.error('Failed to record payment');
      throw error;
    }
  };

  const handleDelete = async (payment) => {
    if (!window.confirm(`Delete this payment of ₹${Number(payment.amount).toLocaleString()} for ${payment.studentName}? This cannot be undone.`)) return;
    try {
      await paymentService.delete(payment.id);
      setPayments(prev => prev.filter(p => p.id !== payment.id));
      toast.success('Payment deleted.');
    } catch {
      toast.error('Failed to delete payment');
    }
  };

  const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const filtered = payments.filter(p =>
    !searchTerm ||
    p.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.invoiceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.method?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {modalOpen && (
          <RecordPaymentModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSave={handleRecord}
            students={students}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-primary">Payments</h2>
          <p className="text-on-surface-variant mt-1">
            {isLoading ? 'Loading...' : `${payments.length} transactions · ₹${totalRevenue.toLocaleString()} total`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold rounded-full shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95"
        >
          <Plus size={20} />
          Record Payment
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-lg shadow-[0_24px_48px_rgba(25,28,29,0.04)] overflow-hidden">
        <div className="p-6 flex justify-between items-center">
          <div className="relative w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
            <input
              type="text"
              placeholder="Search name, invoice, method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-surface-container-low rounded-full text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-low text-on-surface-variant font-semibold rounded-full text-sm hover:bg-surface-container transition-colors">
            <Download size={16} />
            Export
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center">
                      <div className="flex flex-col items-center text-on-surface-variant">
                        <Receipt size={48} className="mb-3 text-outline" />
                        <p className="text-lg font-semibold">
                          {searchTerm ? 'No results found' : 'No payments recorded yet'}
                        </p>
                        {!searchTerm && (
                          <button onClick={() => setModalOpen(true)} className="mt-3 text-primary font-bold flex items-center gap-1">
                            <Plus size={16} /> Record first payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((payment, idx) => {
                    const d = safeDate(payment.date || payment.createdAt);
                    return (
                      <motion.tr
                        key={payment.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-surface-container-low/30 transition-colors"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-black text-sm">
                              {(payment.studentName || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-on-surface text-sm">{payment.studentName || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-on-surface-variant">{payment.invoiceId || '—'}</td>
                        <td className="px-6 py-5 text-sm text-on-surface-variant">
                          {d ? format(d, 'dd MMM yyyy') : '—'}
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-semibold bg-surface-container-high px-3 py-1 rounded-full text-on-surface-variant">
                            {payment.method || 'Cash'}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-black text-green-600">
                          +₹{(Number(payment.amount) || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">
                            {payment.status || 'Completed'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => handleDelete(payment)}
                            className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-full transition-colors"
                            title="Delete payment"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
