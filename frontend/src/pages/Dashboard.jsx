import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import studentService from '../api/services/studentService';
import paymentService from '../api/services/paymentService';

const StatCard = ({ title, value, icon, trend, trendPositive, loading }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-surface-container-lowest p-6 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between"
  >
    <div className="flex justify-between items-start">
      <div className="p-3 rounded-2xl bg-primary/5 text-primary">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendPositive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
          {trend}
        </span>
      )}
    </div>
    <div className="mt-6">
      <p className="text-sm font-medium text-on-surface-variant uppercase tracking-widest">{title}</p>
      {loading ? (
        <div className="h-8 w-24 mt-1 bg-surface-container animate-pulse rounded-md"></div>
      ) : (
        <h3 className="text-3xl font-black text-on-surface mt-1">{value}</h3>
      )}
    </div>
  </motion.div>
);

const Dashboard = () => {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [studs, pays] = await Promise.all([
          studentService.getAll().catch(() => []),
          paymentService.getAll().catch(() => []),
        ]);
        setStudents(Array.isArray(studs) ? studs : []);
        setPayments(Array.isArray(pays) ? pays : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Computed stats
  const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const now = new Date();
  const monthlyIntake = payments
    .filter(p => {
      const d = new Date(p.date || p.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingStudents = students.filter(s => s.status === 'Pending Fee');

  // Monthly revenue bar chart (last 7 months)
  const barData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (6 - i));
    const month = d.toLocaleString('default', { month: 'short' });
    const value = payments
      .filter(p => {
        const pd = new Date(p.date || p.createdAt);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      })
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { name: month, value };
  });

  const activeStudents = students.filter(s => s.status === 'Active').length;
  const totalStudents = students.length;
  const paidPct = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  const pieData = [
    { name: 'Paid', value: paidPct, color: '#00288e' },
    { name: 'Pending', value: 100 - paidPct, color: '#c3ccfe' },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-primary tracking-tight">Academic Overview</h2>
          <p className="text-on-surface-variant font-medium mt-1">Curating the financial and student health of Learners Zone.</p>
        </div>
        <button
          onClick={() => navigate('/students')}
          className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-primary/20 transition-all active:scale-95 flex items-center gap-3"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
          New Enrollment
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={totalStudents.toLocaleString()}
          icon="school"
          loading={loading}
        />
        <StatCard
          title="Total Collected"
          value={`₹${(totalCollected / 1000).toFixed(1)}k`}
          icon="account_balance"
          loading={loading}
        />
        <StatCard
          title="Monthly Intake"
          value={`₹${(monthlyIntake / 1000).toFixed(1)}k`}
          icon="calendar_month"
          loading={loading}
        />
        <StatCard
          title="Pending Dues"
          value={pendingStudents.length}
          icon="warning"
          trend={pendingStudents.length > 0 ? `${pendingStudents.length} students` : 'All clear'}
          trendPositive={pendingStudents.length === 0}
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-lg shadow-[0_24px_48px_rgba(25,28,29,0.04)]">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h4 className="text-xl font-bold text-primary">Revenue Trends</h4>
              <p className="text-sm text-on-surface-variant">Monthly Fee Collection (last 7 months)</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(v) => [`₹${v.toLocaleString()}`, 'Collected']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === barData.length - 1 ? '#00288e' : '#dde1ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-lg shadow-[0_24px_48px_rgba(25,28,29,0.04)]">
          <h4 className="text-xl font-bold text-primary mb-2">Fee Status</h4>
          <p className="text-sm text-on-surface-variant mb-8">Active vs Pending students</p>
          <div className="relative h-48 flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-primary">{paidPct}%</span>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Active</p>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary"></span>
                <span className="font-medium text-on-surface">Active</span>
              </div>
              <span className="font-bold text-primary">{activeStudents}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-secondary-container"></span>
                <span className="font-medium text-on-surface">Pending/Inactive</span>
              </div>
              <span className="font-bold text-on-surface-variant">{totalStudents - activeStudents}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Students + Mentor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <h4 className="text-xl font-bold text-primary px-2">Students With Pending Fees</h4>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-surface-container animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : pendingStudents.length === 0 ? (
            <div className="bg-surface-container-lowest p-6 rounded-lg flex items-center gap-4">
              <span className="material-symbols-outlined text-green-500 text-[32px]">check_circle</span>
              <p className="text-on-surface-variant font-medium">All students are up to date!</p>
            </div>
          ) : (
            pendingStudents.slice(0, 3).map(student => (
              <div key={student.id} className="bg-surface-container-lowest p-5 rounded-lg flex items-center gap-4 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-full bg-error/10 flex items-center justify-center text-error font-black">
                  {student.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-on-surface">{student.name}</p>
                  <p className="text-xs text-on-surface-variant">{student.school} • {student.standard}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-error">₹{(student.monthlyFee || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tight">Due</p>
                </div>
              </div>
            ))
          )}
          {pendingStudents.length > 3 && (
            <button onClick={() => navigate('/students')} className="text-primary font-bold text-sm ml-2">
              +{pendingStudents.length - 3} more →
            </button>
          )}
        </div>

        <div className="bg-gradient-to-br from-primary-container to-primary p-8 rounded-lg text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h4 className="text-2xl font-black mb-2">Quick Actions</h4>
            <p className="text-primary-fixed-dim text-sm mb-6">Navigate to key sections of the academy.</p>
            <div className="space-y-3">
              {[
                { label: 'Manage Students', icon: 'group', path: '/students' },
                { label: 'Record Payment', icon: 'payments', path: '/payments' },
                { label: 'View Analytics', icon: 'analytics', path: '/analytics' },
                { label: 'Smart Excel Upload', icon: 'upload_file', path: '/smart-update' },
              ].map(action => (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 rounded-lg border border-white/10 transition-all text-sm font-semibold"
                >
                  <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
          <span className="material-symbols-outlined absolute -right-10 -bottom-10 text-white opacity-10 rotate-12" style={{ fontSize: '200px' }}>school</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
