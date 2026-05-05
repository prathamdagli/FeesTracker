import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, School, Trash2, RefreshCw } from 'lucide-react';
import feeService from '../api/services/feeService';
import studentService from '../api/services/studentService';
import toast from 'react-hot-toast';

const BOARDS = ['CBSE', 'ICSE', 'GSEB', 'State Board', 'IB', 'IGCSE'];
const STANDARDS = [
  '1st', '2nd', '3rd', '4th', '5th',
  '6th', '7th', '8th', '9th', '10th', '11th', '12th'
];
const EMPTY_FORM = { school: '', standard: '10th', board: 'CBSE', monthlyFee: '' };

const boardColors = {
  'CBSE':        { bg: 'bg-blue-100',   text: 'text-blue-700' },
  'ICSE':        { bg: 'bg-purple-100', text: 'text-purple-700' },
  'GSEB':        { bg: 'bg-orange-100', text: 'text-orange-700' },
  'State Board': { bg: 'bg-teal-100',   text: 'text-teal-700' },
  'IB':          { bg: 'bg-rose-100',   text: 'text-rose-700' },
  'IGCSE':       { bg: 'bg-indigo-100', text: 'text-indigo-700' },
};

// ─── School Autocomplete Input ─────────────────────────────────────────────────
// Same logic as Students.jsx — shows existing school names to prevent Zydus / Zydus School mismatches
const SchoolInput = ({ value, onChange, existingSchools }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const suggestions = value.trim().length === 0
    ? existingSchools
    : existingSchools.filter(s =>
        s.toLowerCase().includes(value.trim().toLowerCase()) &&
        s.toLowerCase() !== value.trim().toLowerCase()
      );

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
                    e.preventDefault();
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

// ─── Add Fee Modal ─────────────────────────────────────────────────────────────
const AddFeeModal = ({ isOpen, onClose, onSave, existingSchools }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isOpen) setForm(EMPTY_FORM); }, [isOpen]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-surface-container-lowest rounded-lg shadow-[0_32px_64px_rgba(25,28,29,0.12)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-8 py-5 border-b border-surface-container-low">
          <div>
            <h3 className="text-lg font-black text-primary">Add Fee Structure</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">All matching students will be automatically updated</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <X size={18} className="text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* School Name — autocomplete from existing students */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">School Name *</label>
            <SchoolInput value={form.school} onChange={handleChange} existingSchools={existingSchools} />
            <p className="text-[11px] text-on-surface-variant">Pick an existing school name to ensure the fee is assigned correctly</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Standard */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Standard *</label>
              <select
                name="standard"
                value={form.standard}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm"
              >
                {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Board */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Board *</label>
              <select
                name="board"
                value={form.board}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface text-sm"
              >
                {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Monthly Fee */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Monthly Fee (₹) *</label>
            <input
              required
              type="number"
              name="monthlyFee"
              min="1"
              value={form.monthlyFee}
              onChange={handleChange}
              placeholder="e.g. 4500"
              className="w-full px-4 py-3 bg-surface-container-low rounded-md outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline/50 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-surface-container text-on-surface-variant font-bold rounded-md hover:bg-surface-container-high transition-colors text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-md shadow-lg transition-all active:scale-95 disabled:opacity-60 text-sm">
              {saving ? 'Saving...' : 'Save & Apply'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const FeeStructure = () => {
  const [fees, setFees] = useState([]);
  const [existingSchools, setExistingSchools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [reapplying, setReapplying] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      const [feeData, studentData] = await Promise.all([
        feeService.getAll().catch(() => []),
        studentService.getAll().catch(() => []),
      ]);
      setFees(Array.isArray(feeData) ? feeData : []);
      // Derive unique, sorted school names from students for the autocomplete
      const schools = [...new Set(
        (Array.isArray(studentData) ? studentData : []).map(s => s.school).filter(Boolean)
      )].sort((a, b) => a.localeCompare(b));
      setExistingSchools(schools);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (formData) => {
    try {
      const result = await feeService.create(formData);
      setFees(prev => [result, ...prev]);
      const msg = result.studentsUpdated > 0
        ? `Fee saved! ${result.studentsUpdated} student(s) updated automatically.`
        : 'Fee structure saved. No matching students found — check school name, standard & board matches.';
      toast.success(msg, { duration: 6000 });
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Failed to save fee structure';
      toast.error(errMsg);
      throw error;
    }
  };

  const handleDelete = async (fee) => {
    if (!window.confirm(`Delete fee for ${fee.school} — ${fee.standard} (${fee.board})?`)) return;
    try {
      await feeService.delete(fee.id);
      setFees(prev => prev.filter(f => f.id !== fee.id));
      toast.success('Fee structure deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Re-apply all existing fee rules to students (retroactive fix for existing data)
  const handleReApply = async () => {
    if (!window.confirm('Re-apply all fee rules to matching students? This will overwrite any manually-set fees for students who match a rule.')) return;
    setReapplying(true);
    try {
      const result = await feeService.reApplyAll();
      if (result.totalUpdated > 0) {
        toast.success(`Done! ${result.totalUpdated} student record${result.totalUpdated !== 1 ? 's' : ''} updated across ${result.rulesApplied} fee rule${result.rulesApplied !== 1 ? 's' : ''}.`, { duration: 6000 });
      } else {
        toast.success('All students already have the correct fees — nothing to update.');
      }
    } catch {
      toast.error('Failed to re-apply fees');
    } finally {
      setReapplying(false);
    }
  };

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {modalOpen && (
          <AddFeeModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSave={handleCreate}
            existingSchools={existingSchools}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-primary">Fee Structure</h2>
          <p className="text-on-surface-variant mt-2 text-lg">
            Define fees by school, standard, and board. Students are auto-assigned.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fees.length > 0 && (
            <button
              onClick={handleReApply}
              disabled={reapplying}
              title="Re-apply all fee rules to matching students"
              className="flex items-center gap-2 px-5 py-3 bg-surface-container-lowest border border-surface-container-low text-on-surface-variant font-semibold rounded-full shadow-sm hover:bg-surface-container transition-all active:scale-95 text-sm disabled:opacity-50"
            >
              <RefreshCw size={15} className={reapplying ? 'animate-spin' : ''} />
              {reapplying ? 'Applying...' : 'Re-apply Fees'}
            </button>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold rounded-full shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95"
          >
            <Plus size={20} />
            Add Fee Rule
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : fees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-surface-container-lowest rounded-lg">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <School size={28} className="text-primary" />
          </div>
          <p className="text-xl font-bold text-on-surface">No fee rules yet</p>
          <p className="text-on-surface-variant mt-2 mb-6 text-sm">Add your first fee rule to start assigning fees to students</p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-full shadow-lg"
          >
            <Plus size={18} /> Add Fee Rule
          </button>
        </div>
      ) : (
        <>
          {/* Summary line */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-on-surface-variant font-medium">{fees.length} fee rule{fees.length !== 1 ? 's' : ''} configured</p>
          </div>

          {/* Fee Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {fees.map((fee, idx) => {
              const colors = boardColors[fee.board] || { bg: 'bg-slate-100', text: 'text-slate-700' };
              return (
                <motion.div
                  key={fee.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-surface-container-lowest rounded-lg p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group relative overflow-hidden"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[22px]">school</span>
                    </div>
                    <button
                      onClick={() => handleDelete(fee)}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 rounded-full transition-all"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* School name */}
                  <p className="font-black text-primary text-lg leading-tight mb-1 truncate" title={fee.school}>
                    {fee.school}
                  </p>

                  {/* Standard + Board badges */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="bg-surface-container-high text-on-surface-variant text-xs font-bold px-3 py-1 rounded-full">
                      {fee.standard}
                    </span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                      {fee.board}
                    </span>
                  </div>

                  {/* Fee amount */}
                  <div className="mt-5 pt-5 border-t border-surface-container-low flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Monthly Fee</span>
                    <span className="text-2xl font-black text-primary">₹{(fee.monthlyFee || 0).toLocaleString()}</span>
                  </div>

                  {/* Decorative bg element */}
                  <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-primary/5 select-none pointer-events-none" style={{ fontSize: '100px' }}>
                    school
                  </span>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default FeeStructure;
