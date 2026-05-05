import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Mail, Lock, ArrowRight, School } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      const msgs = {
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      toast.error(msgs[error.code] || 'Login failed. Please try again.');
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
            <span className="text-primary font-semibold tracking-widest text-xs uppercase">The Digital Curator</span>
            <h1 className="text-6xl font-extrabold text-primary tracking-tight leading-[1.1]">
              Curating the future of <br/> <span className="text-on-primary-fixed-variant">Learning.</span>
            </h1>
            <p className="text-on-surface-variant text-lg max-w-md leading-relaxed">
              Welcome to the Learners Zone Academic Atelier. A space designed for intellectual clarity and seamless educational management.
            </p>
          </div>
          <div className="relative group">
            <div className="absolute -inset-4 bg-primary-fixed/30 blur-2xl rounded-xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
            <img
              className="relative rounded-lg shadow-2xl object-cover h-80 w-full"
              alt="Collaborative Space"
              src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2670&auto=format&fit=crop"
            />
          </div>
        </div>

        {/* Right: Auth Card */}
        <div className="flex justify-center lg:justify-start">
          <div className="bg-surface-container-lowest p-10 md:p-14 rounded-lg w-full max-w-md shadow-[0_24px_48px_rgba(25,28,29,0.06)] flex flex-col gap-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
                <School size={32} />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-primary tracking-tight">Learners Zone</h2>
                <p className="text-on-surface-variant text-sm font-medium tracking-wide">Academic Atelier</p>
              </div>
            </div>

            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div className="group flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant ml-4 tracking-wider uppercase">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-outline" size={18} />
                    <input
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-surface-container-low border-none rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-outline/60"
                      placeholder="curator@learnerszone.edu"
                      type="email"
                    />
                  </div>
                </div>

                <div className="group flex flex-col gap-2">
                  <div className="flex justify-between items-center px-4">
                    <label className="text-xs font-bold text-on-surface-variant tracking-wider uppercase">Password</label>
                    <span className="text-[10px] font-bold text-primary tracking-widest uppercase cursor-pointer">Forgot?</span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-outline" size={18} />
                    <input
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-surface-container-low border-none rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-outline/60"
                      placeholder="••••••••••••"
                      type="password"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
              >
                <span>{isSubmitting ? 'Logging In...' : 'Log In'}</span>
                {!isSubmitting && <ArrowRight size={20} />}
              </button>
            </form>

            <div className="flex flex-col gap-4 items-center">
              <div className="flex items-center gap-4 w-full">
                <div className="h-[1px] bg-outline-variant/30 flex-grow"></div>
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest whitespace-nowrap">New to the Atelier?</span>
                <div className="h-[1px] bg-outline-variant/30 flex-grow"></div>
              </div>
              <Link to="/register" className="group flex items-center gap-2 text-on-primary-fixed-variant font-bold text-sm">
                Create an account
                <ArrowRight className="transition-transform group-hover:translate-x-1" size={16} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
