import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle, RefreshCw, Phone, User } from 'lucide-react';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';

const SmartUpdate = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    setFile(f);
    setPreview(null);
    setCommitted(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/smart-update/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreview(res.data);

      const { summary, detectedHeaders = [] } = res.data;
      if (summary.skipped > 0) {
        toast.error(`${summary.skipped} row(s) skipped — missing student name. Check column headers.`, { duration: 6000 });
      } else {
        toast.success(`Preview ready! ${summary.new} new · ${summary.updated} to update · ${summary.unchanged} unchanged`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setIsCommitting(true);
    try {
      const res = await apiClient.post('/smart-update/commit', {
        newRecords: preview.newRecords,
        updatedRecords: preview.updatedRecords,
      });
      toast.success(res.data.message);
      setCommitted(true);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Commit failed');
    } finally {
      setIsCommitting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCommitted(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-extrabold tracking-tight text-primary">Smart Update</h2>
        <p className="text-on-surface-variant mt-2 text-lg">
          Bulk import or update student records by uploading your Google Form Excel export.
        </p>
      </div>

      {/* Template hint — matches actual Google Form columns */}
      <div className="bg-primary-fixed/60 border border-primary-fixed rounded-lg p-5 flex items-start gap-4">
        <span className="material-symbols-outlined text-primary mt-0.5">info</span>
        <div>
          <p className="font-bold text-primary text-sm">Supported Excel Columns</p>
          <p className="text-on-surface-variant text-sm mt-1 mb-3">
            Your Excel file should have these column headers (as exported from Google Forms):
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              'Name of the Student',
              'Date of Birth',
              'Grade / Standard',
              'School Name',
              "Father's Name",
              "Father's Mobile Number",
              "Mother's Name",
              "Mother's Mobile Number",
              'Residential Address',
              'Email Address (Student or Parent)',
              'Timestamp',
            ].map(col => (
              <code key={col} className="bg-surface-container px-2 py-0.5 rounded text-xs font-mono text-on-surface">
                {col}
              </code>
            ))}
          </div>
          <p className="text-xs text-on-surface-variant mt-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-green-600">check_circle</span>
            Fee is auto-assigned from your Fee Structure rules (matched by school + standard).
            Board is not required.
          </p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer
          ${isDragging ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant/60 bg-surface-container-lowest hover:border-primary/40 hover:bg-primary-fixed/20'}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {file ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <div>
              <p className="font-bold text-on-surface text-lg">{file.name}</p>
              <p className="text-sm text-on-surface-variant mt-1">
                {(file.size / 1024).toFixed(1)} KB · Ready to preview
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="text-sm text-error font-semibold hover:underline"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload size={28} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-on-surface text-lg">Drop your Excel file here</p>
              <p className="text-sm text-on-surface-variant mt-1">or click to browse · .xlsx, .xls supported</p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Button */}
      {file && !preview && !committed && (
        <div className="flex justify-center">
          <button
            onClick={handlePreview}
            disabled={isUploading}
            className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-full shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-60"
          >
            {isUploading ? (
              <><RefreshCw size={18} className="animate-spin" /> Analyzing...</>
            ) : (
              <><span className="material-symbols-outlined text-[20px]">preview</span> Generate Preview</>
            )}
          </button>
        </div>
      )}

      {/* Preview Results */}
      <AnimatePresence>
        {preview && !committed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'New Records',     count: preview.summary.new,       color: 'bg-green-50 text-green-700 border-green-200', icon: 'person_add' },
                { label: 'Updated Records', count: preview.summary.updated,   color: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'edit' },
                { label: 'Unchanged',       count: preview.summary.unchanged, color: 'bg-slate-50 text-slate-600 border-slate-200', icon: 'check' },
              ].map(card => (
                <div key={card.label} className={`border rounded-lg p-6 flex items-center gap-4 ${card.color}`}>
                  <span className="material-symbols-outlined text-[28px]">{card.icon}</span>
                  <div>
                    <p className="text-3xl font-black">{card.count}</p>
                    <p className="text-sm font-semibold">{card.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Detected headers */}
            {preview.detectedHeaders?.length > 0 && (
              <div className="bg-primary-fixed/40 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">table_view</span>
                <div>
                  <p className="text-sm font-bold text-primary">Detected Excel Columns</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {preview.detectedHeaders.map(h => (
                      <code key={h} className="bg-surface-container px-2 py-0.5 rounded text-xs font-mono text-on-surface">{h}</code>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Skipped rows warning */}
            {preview.skippedRows?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-bold text-red-700 flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  {preview.skippedRows.length} row(s) skipped — student name column not found
                </p>
                <p className="text-sm text-red-600 mb-2">
                  Make sure your Excel has a column named <code className="bg-red-100 px-1 rounded">Name of the Student</code> or <code className="bg-red-100 px-1 rounded">Name</code>
                </p>
              </div>
            )}

            {/* New Records Table */}
            {preview.newRecords.length > 0 && (
              <div className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-green-50 border-b border-green-100">
                  <h4 className="font-bold text-green-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    New Students ({preview.newRecords.length})
                    <span className="text-xs font-normal text-green-600 ml-2">— fee will be auto-assigned from Fee Structure</span>
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-surface-container-low/50">
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">School</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Std</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">DOB</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Father</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Father Mobile</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mother</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mother Mobile</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low">
                      {preview.newRecords.slice(0, 10).map((r, i) => (
                        <tr key={i} className="hover:bg-green-50/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">{r.name}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{r.school || '—'}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{r.standard || '—'}</td>
                          <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{r.dob || '—'}</td>
                          <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{r.fatherName || '—'}</td>
                          <td className="px-4 py-3 text-on-surface-variant">
                            {r.fatherMobile ? <a href={`tel:${r.fatherMobile}`} className="text-primary hover:underline flex items-center gap-1"><Phone size={12}/>{r.fatherMobile}</a> : '—'}
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{r.motherName || '—'}</td>
                          <td className="px-4 py-3 text-on-surface-variant">
                            {r.motherMobile ? <a href={`tel:${r.motherMobile}`} className="text-primary hover:underline flex items-center gap-1"><Phone size={12}/>{r.motherMobile}</a> : '—'}
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">{r.email || '—'}</td>
                        </tr>
                      ))}
                      {preview.newRecords.length > 10 && (
                        <tr><td colSpan={9} className="px-4 py-3 text-sm text-on-surface-variant">
                          +{preview.newRecords.length - 10} more records...
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Updated Records Table */}
            {preview.updatedRecords.length > 0 && (
              <div className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
                  <h4 className="font-bold text-amber-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Records to Update ({preview.updatedRecords.length})
                    <span className="text-xs font-normal text-amber-600 ml-2">— contact info / school / standard changes</span>
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-surface-container-low/50">
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">School</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Std</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Father Mobile</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mother Mobile</th>
                        <th className="px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low">
                      {preview.updatedRecords.slice(0, 10).map((r, i) => (
                        <tr key={i} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-on-surface">{r.name}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{r.school || '—'}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{r.standard || '—'}</td>
                          <td className="px-4 py-3 text-amber-600 font-medium">{r.fatherMobile || '—'}</td>
                          <td className="px-4 py-3 text-amber-600 font-medium">{r.motherMobile || '—'}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{r.email || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Commit / Cancel */}
            {(preview.newRecords.length > 0 || preview.updatedRecords.length > 0) ? (
              <div className="flex justify-center gap-4">
                <button
                  onClick={reset}
                  className="px-8 py-3 bg-surface-container text-on-surface-variant font-bold rounded-full hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommit}
                  disabled={isCommitting}
                  className="flex items-center gap-3 px-10 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-full shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-60"
                >
                  {isCommitting ? (
                    <><RefreshCw size={18} className="animate-spin" /> Committing...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[20px]">cloud_upload</span> Commit to Firestore</>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="flex items-center gap-3 text-on-surface-variant bg-surface-container rounded-full px-8 py-4 font-semibold">
                  <CheckCircle size={20} className="text-green-600" />
                  All records are already up to date!
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      {committed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 py-12"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-black text-primary">Committed Successfully!</h3>
            <p className="text-on-surface-variant mt-2">
              {preview?.summary.new} new + {preview?.summary.updated} updated records saved to Firestore.
            </p>
            <p className="text-sm text-on-surface-variant mt-1">
              Fee and status were auto-assigned from your Fee Structure rules.
            </p>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-8 py-3 bg-surface-container text-on-surface font-bold rounded-full hover:bg-surface-container-high transition-colors"
          >
            <Upload size={18} />
            Upload Another File
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default SmartUpdate;
