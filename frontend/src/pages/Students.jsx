import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, ChevronDown, ChevronUp, IndianRupee } from 'lucide-react';
import studentService from '../api/services/studentService';
import paymentService from '../api/services/paymentService';
import toast from 'react-hot-toast';
import { Wand2 } from 'lucide-react';

const BOARDS = ['CBSE', 'ICSE', 'GSEB', 'State Board', 'IB', 'IGCSE'];
const STANDARDS = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'];
const METHODS = ['Cash', 'Online Transfer', 'UPI', 'Cheque', 'Card'];
const EMPTY_FORM = {
  name: '', school: '', standard: '10th', board: 'CBSE', monthlyFee: '', status: 'Active',
  dob: '', fatherName: '', fatherMobile: '', motherName: '', motherMobile: '', address: '', email: ''
};

const StatusBadge = ({ status }) => {
  const map = {
    'Active':      { bg: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
    'Pending Fee': { bg: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
    'Inactive':    { bg: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400' },
    'No Fee Set':  { bg: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
  };
  const s = map[status] || map['Active'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
      {status}
    </span>
  );
};

const avatarColors = [
  'bg-primary-fixed', 'bg-secondary-container', 'bg-tertiary-fixed', 'bg-surface-container-high'
];

// ─── Field helper ─────────────────────────────────────────────────────────────
const Field = ({ label, name, type='text', placeholder, value, onChange, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{label}{required && ' *'}</label>
    {children ?? (
      <input
        required={required}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline/50 text-sm"
      />
    )}
  </div>
);

// ─── School Autocomplete Input ─────────────────────────────────────────────────
// Shows existing school names as suggestions when typing.
// This prevents "Zydus" vs "Zydus School" / "Nirman" vs "Nirman High School" mismatches
// by letting users pick a canonical name from the dropdown.
const SchoolInput = ({ value, onChange, existingSchools }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Filter suggestions: match anywhere in the name, case-insensitive
  const suggestions = value.trim().length === 0
    ? existingSchools
    : existingSchools.filter(s =>
        s.toLowerCase().includes(value.trim().toLowerCase()) &&
        s.toLowerCase() !== value.trim().toLowerCase()
      );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        required
        type="text"
        name="school"
        value={value}
        placeholder="e.g. Zydus School"
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e); setOpen(true); }}
        className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline/50 text-sm"
      />
      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 left-0 right-0 mt-1 bg-surface-container-lowest border border-surface-container-low rounded-md shadow-xl overflow-hidden max-h-48 overflow-y-auto"
          >
            {suggestions.map(school => (
              <li key={school}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click
                    onChange({ target: { name: 'school', value: school } });
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-primary/8 hover:text-primary transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[14px] text-outline">school</span>
                  {school}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Quick Pay Modal ───────────────────────────────────────────────────────────
const QuickPayModal = ({ isOpen, onClose, onSave, student }) => {
  const [months, setMonths] = useState(1);
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMonths(1);
      setMethod('Cash');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const fee = Number(student.monthlyFee) || 0;
  const totalAmount = fee * months;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!totalAmount) { toast.error('Student has no monthly fee set'); return; }
    setSaving(true);
    try {
      await onSave({
        studentId: student.id,
        studentName: student.name,
        amount: totalAmount,
        months,
        date,
        method,
        invoiceId: `INV-${Date.now()}`,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-surface-container-lowest rounded-lg shadow-[0_32px_64px_rgba(25,28,29,0.12)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-surface-container-low">
          <div>
            <h3 className="text-lg font-black text-primary">Record Payment</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">{student.name} · {student.school}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <X size={18} className="text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Fee display */}
          <div className="bg-surface-container-low rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Monthly Fee</p>
              <p className="text-2xl font-black text-primary">
                {fee ? `₹${fee.toLocaleString()}` : <span className="text-sm text-on-surface-variant">Not set</span>}
              </p>
            </div>
            {fee > 0 && (
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total</p>
                <p className="text-2xl font-black text-green-600">₹{totalAmount.toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Months selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Months Paying *</label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(m)}
                  className={`flex-1 min-w-[60px] py-2.5 rounded-md text-sm font-bold transition-all ${
                    months === m
                      ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {m} {m === 1 ? 'mo' : 'mo'}
                </button>
              ))}
            </div>
          </div>

          {/* Method + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Method</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm"
              >
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-surface-container text-on-surface-variant font-bold rounded-md hover:bg-surface-container-high transition-colors text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving || !fee}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-md shadow-lg transition-all active:scale-95 disabled:opacity-60 text-sm">
              {saving ? 'Recording...' : `Record ₹${totalAmount.toLocaleString()}`}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Student Modal ─────────────────────────────────────────────────────────────
const StudentModal = ({ isOpen, onClose, onSave, initialData, existingSchools }) => {
  const [form, setForm] = useState(initialData || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  useEffect(() => {
    setForm(initialData || EMPTY_FORM);
    setShowExtra(false);
  }, [initialData, isOpen]);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, monthlyFee: Number(form.monthlyFee) });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;
  const isEdit = !!initialData?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-xl bg-surface-container-lowest rounded-lg shadow-[0_32px_64px_rgba(25,28,29,0.12)] overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-surface-container-low flex-shrink-0">
          <h3 className="text-lg font-black text-primary">{isEdit ? 'Edit Student' : 'Add New Student'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <X size={18} className="text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-8 space-y-4">

            {/* ── Core fields ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Full Name" name="name" required placeholder="e.g. Pratham Dagli" value={form.name} onChange={handleChange} />
              </div>

              {/* School with autocomplete to prevent Zydus vs Zydus School inconsistencies */}
              <div className="col-span-2">
                <Field label="School Name" name="school" required>
                  <SchoolInput
                    value={form.school}
                    onChange={handleChange}
                    existingSchools={existingSchools}
                  />
                </Field>
              </div>

              <Field label="Standard" name="standard" required value={form.standard} onChange={handleChange}>
                <select name="standard" value={form.standard} onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm">
                  {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Board" name="board" required value={form.board} onChange={handleChange}>
                <select name="board" value={form.board} onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm">
                  {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>

              <Field label="Monthly Fee (₹)" name="monthlyFee" type="number" placeholder="e.g. 4500" value={form.monthlyFee} onChange={handleChange} />

              <Field label="Status" value={form.status} onChange={handleChange}>
                <select name="status" value={form.status} onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm">
                  <option value="Active">Active</option>
                  <option value="Pending Fee">Pending Fee</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </Field>
            </div>

            {/* ── Toggle: Extra info ── */}
            <button
              type="button"
              onClick={() => setShowExtra(v => !v)}
              className="w-full flex items-center justify-between py-3 px-4 bg-surface-container-low rounded-md text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <span>Parent &amp; Contact Details</span>
              {showExtra ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <AnimatePresence>
              {showExtra && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <Field label="Date of Birth" name="dob" type="date" value={form.dob} onChange={handleChange} />
                    <div className="col-span-2">
                      <Field label="Email" name="email" type="email" placeholder="parent@email.com" value={form.email} onChange={handleChange} />
                    </div>
                    <Field label="Father's Name" name="fatherName" placeholder="e.g. Hemang Dagli" value={form.fatherName} onChange={handleChange} />
                    <Field label="Father's Mobile" name="fatherMobile" placeholder="e.g. 9825521974" value={form.fatherMobile} onChange={handleChange} />
                    <Field label="Mother's Name" name="motherName" placeholder="e.g. Dimpi Dagli" value={form.motherName} onChange={handleChange} />
                    <Field label="Mother's Mobile" name="motherMobile" placeholder="e.g. 9879165499" value={form.motherMobile} onChange={handleChange} />
                    <div className="col-span-2">
                      <Field label="Residential Address" name="address" placeholder="e.g. Paldi, Ahmedabad" value={form.address} onChange={handleChange} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-surface-container text-on-surface-variant font-bold rounded-md hover:bg-surface-container-high transition-colors text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-md shadow-lg transition-all active:scale-95 disabled:opacity-60 text-sm">
              {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Student')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Student Detail Drawer ──────────────────────────────────────────────────
const DetailRow = ({ label, value }) => !value ? null : (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{label}</span>
    <span className="text-sm font-medium text-on-surface">{value}</span>
  </div>
);

const StudentDrawer = ({ student, onClose, onEdit, onPay }) => {
  if (!student) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-surface-container-lowest h-full shadow-2xl overflow-y-auto flex flex-col"
      >
        <div className="p-6 border-b border-surface-container-low flex items-center justify-between">
          <h3 className="font-black text-primary">Student Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex-1 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-on-primary font-black text-xl">
              {student.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="font-black text-on-surface text-lg">{student.name}</p>
              <StatusBadge status={student.status} />
            </div>
          </div>

          {/* Academic */}
          <div className="space-y-3">
            <p className="text-xs font-black text-primary uppercase tracking-widest">Academic</p>
            <div className="grid grid-cols-2 gap-4">
              <DetailRow label="School" value={student.school} />
              <DetailRow label="Standard" value={student.standard} />
              <DetailRow label="Board" value={student.board} />
              <DetailRow label="Monthly Fee" value={student.monthlyFee ? `₹${Number(student.monthlyFee).toLocaleString()}` : null} />
            </div>
          </div>

          {/* Personal */}
          {(student.dob || student.email || student.address) && (
            <div className="space-y-3">
              <p className="text-xs font-black text-primary uppercase tracking-widest">Personal</p>
              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="Date of Birth" value={student.dob} />
                <DetailRow label="Email" value={student.email} />
              </div>
              <DetailRow label="Address" value={student.address} />
            </div>
          )}

          {/* Parents */}
          {(student.fatherName || student.motherName) && (
            <div className="space-y-3">
              <p className="text-xs font-black text-primary uppercase tracking-widest">Parents</p>
              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="Father's Name" value={student.fatherName} />
                <DetailRow label="Father's Mobile" value={student.fatherMobile} />
                <DetailRow label="Mother's Name" value={student.motherName} />
                <DetailRow label="Mother's Mobile" value={student.motherMobile} />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-surface-container-low flex flex-col gap-3">
          {/* Quick Pay — prominent green button */}
          <button
            onClick={() => { onPay(student); onClose(); }}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-md text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:shadow-xl transition-all active:scale-95"
          >
            <IndianRupee size={16} />
            Record Payment
            {student.monthlyFee ? ` · ₹${Number(student.monthlyFee).toLocaleString()}` : ''}
          </button>
          <button onClick={() => { onEdit(student); onClose(); }}
            className="w-full py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-md text-sm">
            Edit Student
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Students Page ────────────────────────────────────────────────────────
const Students = () => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [drawerStudent, setDrawerStudent] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [normalizing, setNormalizing] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const PAGE_SIZE = 20;

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const data = await studentService.getAll();
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      const status = error?.response?.status;
      if (status >= 500 || !error.response) {
        toast.error('Could not connect to the server. Is the backend running?');
      } else {
        toast.error(`Failed to load students: ${error.response?.data?.error || error.message}`);
      }
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Derive unique school names for autocomplete — sorted alphabetically
  const existingSchools = [...new Set(
    students.map(s => s.school).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  const handleAdd = async (formData) => {
    try {
      const created = await studentService.create(formData);
      setStudents(prev => [created, ...prev]);
      toast.success(`${formData.name} added successfully!`);
    } catch (error) {
      toast.error('Failed to add student');
      throw error;
    }
  };

  const handleEdit = async (formData) => {
    try {
      await studentService.update(editTarget.id, formData);
      setStudents(prev => prev.map(s => s.id === editTarget.id ? { ...s, ...formData } : s));
      toast.success('Student updated!');
    } catch (error) {
      toast.error('Failed to update student');
      throw error;
    }
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Remove ${student.name}? This cannot be undone.`)) return;
    try {
      await studentService.delete(student.id);
      setStudents(prev => prev.filter(s => s.id !== student.id));
      toast.success(`${student.name} removed.`);
    } catch {
      toast.error('Failed to delete student');
    }
  };

  const handleQuickPay = async (paymentData) => {
    try {
      await paymentService.record(paymentData);
      toast.success(`Payment of ₹${Number(paymentData.amount).toLocaleString()} recorded for ${paymentData.studentName}!`);
      // Optimistically update the student's status to Active
      setStudents(prev => prev.map(s =>
        s.id === paymentData.studentId ? { ...s, status: 'Active' } : s
      ));
    } catch (error) {
      toast.error('Failed to record payment');
      throw error;
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const openPay = (student) => { setPayTarget(student); setPayModalOpen(true); };
  const openAdd = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit = (s) => { setEditTarget(s); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  const handleNormalizeSchools = async () => {
    if (!window.confirm('This will merge duplicate school names (e.g. "Zydus" and "Zydus School") into one canonical name across all student records. Continue?')) return;
    setNormalizing(true);
    try {
      const result = await studentService.normalizeSchools();
      if (result.updatedCount > 0) {
        toast.success(`Fixed ${result.updatedCount} student record${result.updatedCount !== 1 ? 's' : ''} with inconsistent school names.`);
        fetchStudents(); // refresh list
      } else {
        toast.success('No duplicate school names found — everything looks clean!');
      }
    } catch {
      toast.error('Failed to normalize school names');
    } finally {
      setNormalizing(false);
    }
  };

  let filtered = students.filter(s =>
    !searchTerm ||
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.school?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.board?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.fatherMobile?.includes(searchTerm) ||
    s.motherMobile?.includes(searchTerm) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (sortConfig.key && sortConfig.direction) {
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'monthlyFee') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else if (sortConfig.key === 'standard') {
        // Special sorting for standards (e.g. 1st, 2nd... 10th)
        const getStandardValue = (s) => parseInt(s) || 0;
        aVal = getStandardValue(aVal);
        bVal = getStandardValue(bVal);
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {modalOpen && (
          <StudentModal
            isOpen={modalOpen}
            onClose={closeModal}
            onSave={editTarget ? handleEdit : handleAdd}
            initialData={editTarget}
            existingSchools={existingSchools}
          />
        )}
        {drawerStudent && (
          <StudentDrawer
            student={drawerStudent}
            onClose={() => setDrawerStudent(null)}
            onEdit={openEdit}
            onPay={openPay}
          />
        )}
        {payModalOpen && (
          <QuickPayModal
            isOpen={payModalOpen}
            onClose={() => { setPayModalOpen(false); setPayTarget(null); }}
            onSave={handleQuickPay}
            student={payTarget}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-primary">Students</h2>
          <p className="text-on-surface-variant mt-2 text-lg">
            {isLoading ? 'Loading...' : `${students.length} students enrolled`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleNormalizeSchools}
            disabled={normalizing}
            title="Merge duplicate school names"
            className="flex items-center gap-2 px-5 py-3 bg-surface-container-lowest border border-surface-container-low text-on-surface-variant font-semibold rounded-full shadow-sm hover:bg-surface-container transition-all active:scale-95 text-sm disabled:opacity-50"
          >
            <Wand2 size={16} />
            {normalizing ? 'Fixing...' : 'Fix School Names'}
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95">
            <Plus size={20} /> Add Student
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-surface-container-lowest rounded-lg shadow-[0_24px_48px_rgba(25,28,29,0.04)] overflow-hidden">
        <div className="p-6 flex justify-between items-center">
          <div className="relative w-96">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input
              className="w-full bg-surface-container-low rounded-full py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Search name, school, mobile, email..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <p className="text-sm text-on-surface-variant font-medium">
            Showing {paginated.length} of {filtered.length}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-[64px] mb-4 text-outline">person_search</span>
            <p className="text-xl font-semibold">{searchTerm ? 'No students match your search' : 'No students yet'}</p>
            {!searchTerm && (
              <button onClick={openAdd} className="mt-4 flex items-center gap-2 text-primary font-bold">
                <Plus size={16} /> Add your first student
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th 
                    onClick={() => requestSort('name')}
                    className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:bg-surface-container-high transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Student
                      {sortConfig.key === 'name' && (
                        sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => requestSort('school')}
                    className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:bg-surface-container-high transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      School
                      {sortConfig.key === 'school' && (
                        sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => requestSort('standard')}
                    className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-center cursor-pointer hover:bg-surface-container-high transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-center gap-1">
                        Std / Board
                        {sortConfig.key === 'standard' && (
                          sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Contact</th>
                  <th 
                    onClick={() => requestSort('monthlyFee')}
                    className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:bg-surface-container-high transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Fee/Month
                      {sortConfig.key === 'monthlyFee' && (
                        sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => requestSort('status')}
                    className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:bg-surface-container-high transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortConfig.key === 'status' && (
                        sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />
                      )}
                    </div>
                  </th>
                  <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {paginated.map((student, idx) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-surface-container-low/30 transition-colors group cursor-pointer"
                    onClick={() => setDrawerStudent(student)}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-primary font-black text-base`}>
                          {student.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{student.name}</p>
                          <p className="text-xs text-on-surface-variant">#{student.id?.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-medium text-on-surface text-sm">{student.school}</td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-semibold">{student.standard}</span>
                        <span className="text-xs text-on-surface-variant">{student.board}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs text-on-surface-variant">{student.fatherMobile || student.motherMobile || student.email || '—'}</p>
                    </td>
                    <td className="px-6 py-5 font-bold text-primary">
                      {student.monthlyFee ? `₹${Number(student.monthlyFee).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-6 py-5"><StatusBadge status={student.status} /></td>
                    <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        {/* Quick Pay Button */}
                        <button
                          onClick={() => openPay(student)}
                          title="Record Payment"
                          className="p-2 hover:bg-green-50 text-green-600 rounded-full transition-colors bg-surface-container-lowest shadow-sm"
                        >
                          <IndianRupee size={18} />
                        </button>
                        <button onClick={() => openEdit(student)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-full transition-colors bg-surface-container-lowest shadow-sm">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(student)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors bg-surface-container-lowest shadow-sm">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="px-8 py-4 bg-surface-container-low/30 flex justify-between items-center">
                <p className="text-sm text-on-surface-variant font-medium">Page {currentPage} of {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  {Array.from({length:totalPages},(_,i)=>i+1)
                    .slice(Math.max(0,currentPage-3),Math.min(totalPages,currentPage+2))
                    .map(page => (
                      <button key={page} onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full font-bold text-sm transition-all ${
                          page===currentPage ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-primary/10'
                        }`}>{page}</button>
                    ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage===totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Students;
