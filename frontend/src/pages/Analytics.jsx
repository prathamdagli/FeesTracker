import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, CreditCard, Activity } from 'lucide-react';
import studentService from '../api/services/studentService';
import paymentService from '../api/services/paymentService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Strip common school suffixes so "Zydus" and "Zydus School" group together
const normalizeSchool = (name = '') =>
  name.trim()
    .replace(/\s+(higher secondary|high school|senior secondary|secondary school|public school|school|vidyalaya|vidhyalay|academy|institute|college)\s*$/i, '')
    .trim();

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Returns last N months as { label, year, month (0-indexed) }
const lastNMonths = (n = 6) => {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ label: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), month: d.getMonth() });
  }
  return result;
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, sub, icon: Icon, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_8px_32px_rgba(25,28,29,0.06)] border border-surface-container-low relative overflow-hidden"
  >
    <div className={`absolute top-0 right-0 p-4 opacity-[0.07]`}>
      <Icon className="w-24 h-24 transform translate-x-4 -translate-y-4" />
    </div>
    <div className="flex justify-between items-start mb-3">
      <p className="text-sm font-semibold text-on-surface-variant">{title}</p>
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
    <p className="text-3xl font-black text-on-surface">{value}</p>
    {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
  </motion.div>
);

// ─── Loading skeleton ─────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-surface-container-low rounded-lg ${className}`} />
);

// ─── Analytics Page ───────────────────────────────────────────────────────────
const Analytics = () => {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [studs, pays] = await Promise.all([
          studentService.getAll().catch(() => []),
          paymentService.getAll().catch(() => []),
        ]);
        setStudents(Array.isArray(studs) ? studs : []);
        setPayments(Array.isArray(pays) ? pays : []);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const activeStudents = students.filter(s => s.status === 'Active').length;
  const pendingStudents = students.filter(s => s.status === 'Pending Fee');
  const pendingFees = pendingStudents.reduce((sum, s) => sum + (Number(s.monthlyFee) || 0), 0);

  // Collection rate: students who have paid at least once vs total active
  const paidStudentIds = new Set(payments.map(p => p.studentId));
  const collectionRate = students.length
    ? Math.round((paidStudentIds.size / students.length) * 100)
    : 0;

  // ── Revenue Trend (last 6 months) ────────────────────────────────────────────
  const months = lastNMonths(6);
  const totalMonthlyExpected = students
    .filter(s => s.status === 'Active')
    .reduce((sum, s) => sum + (Number(s.monthlyFee) || 0), 0);

  const revenueData = months.map(({ label, year, month }) => {
    const actual = payments
      .filter(p => {
        const d = new Date(p.date || p.createdAt);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return { name: label, actual, expected: totalMonthlyExpected };
  });

  // ── Payment Status Pie ────────────────────────────────────────────────────────
  const activeCount   = students.filter(s => s.status === 'Active').length;
  const pendingCount  = students.filter(s => s.status === 'Pending Fee').length;
  const inactiveCount = students.filter(s => s.status === 'Inactive').length;
  const noFeeCount    = students.filter(s => s.status === 'No Fee Set').length;
  const total = students.length || 1;

  const paymentStatus = [
    { name: 'Active',      value: Math.round((activeCount   / total) * 100), color: '#10b981', count: activeCount },
    { name: 'Pending Fee', value: Math.round((pendingCount  / total) * 100), color: '#f59e0b', count: pendingCount },
    { name: 'No Fee Set',  value: Math.round((noFeeCount    / total) * 100), color: '#ef4444', count: noFeeCount },
    { name: 'Inactive',    value: Math.round((inactiveCount / total) * 100), color: '#94a3b8', count: inactiveCount },
  ].filter(x => x.count > 0);

  // Collection rate for the donut label
  const collectedPct = paymentStatus.find(p => p.name === 'Active')?.value ?? 0;

  // ── Students by Board (bar chart) ─────────────────────────────────────────────
  const boardMap = {};
  students.forEach(s => {
    const key = s.board || 'Unknown';
    boardMap[key] = (boardMap[key] || 0) + 1;
  });
  const boardData = Object.entries(boardMap)
    .map(([name, students]) => ({ name, students }))
    .sort((a, b) => b.students - a.students);

  // ── Students by School (top 6, normalized) ────────────────────────────────────
  const schoolMap = {};
  students.forEach(s => {
    const key = normalizeSchool(s.school) || 'Unknown';
    schoolMap[key] = (schoolMap[key] || 0) + 1;
  });
  const schoolData = Object.entries(schoolMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const BOARD_COLORS = ['#4f46e5', '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="col-span-2 h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-primary">Analytics</h2>
          <p className="text-on-surface-variant mt-2 text-lg">
            Live data · {students.length} students · {payments.length} transactions
          </p>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          sub={`${payments.length} payments recorded`}
          icon={CreditCard}
          color="bg-indigo-600"
          delay={0}
        />
        <StatCard
          title="Active Students"
          value={activeStudents}
          sub={`of ${students.length} total enrolled`}
          icon={Users}
          color="bg-blue-500"
          delay={0.05}
        />
        <StatCard
          title="Collection Rate"
          value={`${collectionRate}%`}
          sub="students with ≥1 payment"
          icon={TrendingUp}
          color="bg-emerald-500"
          delay={0.1}
        />
        <StatCard
          title="Pending Fees"
          value={`₹${pendingFees.toLocaleString()}`}
          sub={`${pendingStudents.length} student${pendingStudents.length !== 1 ? 's' : ''} pending`}
          icon={Activity}
          color="bg-amber-500"
          delay={0.15}
        />
      </div>

      {/* Revenue Trend + Payment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-6 shadow-[0_8px_32px_rgba(25,28,29,0.06)] border border-surface-container-low"
        >
          <h3 className="text-base font-black text-on-surface mb-1">Revenue Trend</h3>
          <p className="text-xs text-on-surface-variant mb-6">Last 6 months — actual vs expected</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradExpected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={v => v >= 1000 ? `₹${Math.round(v/1000)}k` : `₹${v}`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip
                  formatter={(value, name) => [`₹${Number(value).toLocaleString()}`, name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '10px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                <Area type="monotone" name="Actual (₹)" dataKey="actual" stroke="#4f46e5" strokeWidth={3} fill="url(#gradActual)" />
                <Area type="monotone" name="Expected (₹)" dataKey="expected" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="url(#gradExpected)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Payment Status Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_8px_32px_rgba(25,28,29,0.06)] border border-surface-container-low"
        >
          <h3 className="text-base font-black text-on-surface mb-1">Student Status</h3>
          <p className="text-xs text-on-surface-variant mb-4">by enrollment status</p>
          {students.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-on-surface-variant text-sm">No data yet</div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStatus}
                      cx="50%" cy="50%"
                      innerRadius={58} outerRadius={78}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentStatus.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value}%`, name]}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-on-surface">{collectedPct}%</span>
                  <span className="text-xs text-on-surface-variant">Active</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                {paymentStatus.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-on-surface-variant font-medium">{item.name}</span>
                    </div>
                    <span className="font-black text-on-surface">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom row: Board distribution + Top Schools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students by Board */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_8px_32px_rgba(25,28,29,0.06)] border border-surface-container-low"
        >
          <h3 className="text-base font-black text-on-surface mb-1">Students by Board</h3>
          <p className="text-xs text-on-surface-variant mb-6">Enrollment breakdown</p>
          {boardData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-on-surface-variant text-sm">No data yet</div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={boardData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(79,70,229,0.05)' }}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '10px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="students" name="Students" radius={[6, 6, 0, 0]}>
                    {boardData.map((_, i) => (
                      <Cell key={i} fill={BOARD_COLORS[i % BOARD_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Top Schools (normalized) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_8px_32px_rgba(25,28,29,0.06)] border border-surface-container-low"
        >
          <h3 className="text-base font-black text-on-surface mb-1">Top Schools</h3>
          <p className="text-xs text-on-surface-variant mb-6">Most enrolled (names normalized)</p>
          {schoolData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-on-surface-variant text-sm">No data yet</div>
          ) : (
            <div className="space-y-3">
              {schoolData.map((school, i) => {
                const pct = Math.round((school.count / students.length) * 100);
                return (
                  <div key={school.name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-on-surface truncate max-w-[70%]">{school.name}</span>
                      <span className="text-sm font-black text-primary">{school.count} <span className="text-xs font-medium text-on-surface-variant">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-surface-container-low rounded-full h-2.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.5 + i * 0.05, duration: 0.6 }}
                        className="h-2.5 rounded-full"
                        style={{ backgroundColor: BOARD_COLORS[i % BOARD_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
