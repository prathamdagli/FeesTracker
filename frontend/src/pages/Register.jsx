import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../config/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Mail, Lock, ArrowRight, School, User } from 'lucide-react';
import toast from 'react-hot-toast';

// Defined at module scope to prevent remount on every keystroke
const InputField = ({ label, name, type = 'text', placeholder, icon: Icon, value, onChange }) => (
  <div className="group flex flex-col gap-2">
    <label className="text-xs font-bold text-on-surface-variant ml-4 tracking-wider uppercase">{label}</label>
    <div className="relative">
      <Icon className="absolute left-5 top-1/2 -translate-y-1/2 text-outline" size={18} />
      <input
        required
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="w-full pl-12 pr-6 py-4 bg-surface-container-low border-none rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-outline/60"
        placeholder={placeholder}
      />
    </div>
  </div>
);

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(user, { displayName: form.name });
      toast.success('Account created! Welcome to the Atelier.');
      navigate('/');
    } catch (error) {
      const msgs = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/operation-not-allowed': 'Email/Password sign-in is not enabled. Please enable it in the Firebase Console under Authentication → Sign-in method.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
      };
      const message = msgs[error.code] || `Registration failed (${error.code}): ${error.message}`;
      toast.error(message, { duration: 6000 });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] bg-secondary-container/10 blur-[100px] rounded-full -z-10"></div>

      <main className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Branding */}
        <div className="hidden lg:flex flex-col gap-8 pr-12">
          <div className="space-y-4">
            <span className="text-primary font-semibold tracking-widest text-xs uppercase">Join the Atelier</span>
            <h1 className="text-6xl font-extrabold text-primary tracking-tight leading-[1.1]">
              Start your journey <br/> <span className="text-on-primary-fixed-variant">today.</span>
            </h1>
            <p className="text-on-surface-variant text-lg max-w-md leading-relaxed">
              Create your Learners Zone admin account and gain full access to students, fees, payments, and analytics.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: 'school', label: 'Manage all students in one place' },
              { icon: 'payments', label: 'Track fees and payment history' },
              { icon: 'analytics', label: 'Real-time analytics and reports' },
              { icon: 'upload_file', label: 'Bulk import via Excel' },
            ].map(item => (
              <div key={item.icon} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                </div>
                <p className="text-on-surface-variant font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Registration Card */}
        <div className="flex justify-center lg:justify-start">
          <div className="bg-surface-container-lowest p-10 md:p-12 rounded-lg w-full max-w-md shadow-[0_24px_48px_rgba(25,28,29,0.06)] flex flex-col gap-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
                <School size={32} />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-primary tracking-tight">Create Account</h2>
                <p className="text-on-surface-variant text-sm font-medium tracking-wide">Learners Zone Academic Atelier</p>
              </div>
            </div>

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <InputField label="Full Name" name="name" placeholder="Dr. Alex Rivera" icon={User} value={form.name} onChange={handleChange} />
              <InputField label="Email Address" name="email" type="email" placeholder="admin@learnerszone.edu" icon={Mail} value={form.email} onChange={handleChange} />
              <InputField label="Password" name="password" type="password" placeholder="Min. 6 characters" icon={Lock} value={form.password} onChange={handleChange} />
              <InputField label="Confirm Password" name="confirm" type="password" placeholder="Re-enter your password" icon={Lock} value={form.confirm} onChange={handleChange} />

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
              >
                <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
                {!isSubmitting && <ArrowRight size={20} />}
              </button>
            </form>

            <div className="flex flex-col gap-4 items-center">
              <div className="flex items-center gap-4 w-full">
                <div className="h-[1px] bg-outline-variant/30 flex-grow"></div>
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest whitespace-nowrap">Already enrolled?</span>
                <div className="h-[1px] bg-outline-variant/30 flex-grow"></div>
              </div>
              <Link to="/login" className="group flex items-center gap-2 text-on-primary-fixed-variant font-bold text-sm">
                Sign in to your account
                <ArrowRight className="transition-transform group-hover:translate-x-1" size={16} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Register;
