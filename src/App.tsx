/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { PatientRecord, Appointment, User } from './types';
import { VoiceInterface } from './components/VoiceInterface';
import { AppointmentScheduler } from './components/Calendar';
import { Dashboard } from './components/Dashboard';
import { 
  Stethoscope, 
  LogOut, 
  User as UserIcon, 
  Lock, 
  Mail, 
  Activity,
  HeartPulse,
  LayoutDashboard,
  Calendar as CalendarIcon,
  Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [activeTab, setActiveTab] = useState<'voice' | 'dashboard' | 'calendar'>('voice');
  
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // In a real app, we'd fetch the role from a 'users' collection
        // For this demo, we'll assume the role based on a simple logic or state
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: role // Using the state role for now
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [role]);

  useEffect(() => {
    if (!user) return;

    const recordsQuery = user.role === 'doctor' 
      ? query(collection(db, 'records'), orderBy('timestamp', 'desc'))
      : query(collection(db, 'records'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));

    const unsubRecords = onSnapshot(recordsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PatientRecord));
      setRecords(data);
    }, (err) => {
      console.error("Firestore Records Error:", err);
      // Fallback for mock environment
      if (err.message.includes('insufficient permissions') || err.message.includes('offline')) {
        const mockData: PatientRecord[] = JSON.parse(localStorage.getItem(`records_${user.uid}`) || '[]');
        setRecords(mockData);
      }
    });

    const appointmentsQuery = user.role === 'doctor'
      ? query(collection(db, 'appointments'), orderBy('date', 'asc'))
      : query(collection(db, 'appointments'), where('userId', '==', user.uid), orderBy('date', 'asc'));

    const unsubAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(data);
    }, (err) => {
      console.error("Firestore Appointments Error:", err);
      // Fallback for mock environment
      const mockData: Appointment[] = JSON.parse(localStorage.getItem(`appointments_${user.uid}`) || '[]');
      setAppointments(mockData);
    });

    return () => {
      unsubRecords();
      unsubAppointments();
    };
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      alert(err.message);
      // Mock auth for preview if Firebase fails
      if (err.message.includes('API key not valid') || err.message.includes('network error')) {
        setUser({ uid: 'mock-uid', email, role });
      }
    }
  };

  const handleSignOut = () => signOut(auth);

  const saveRecord = async (data: { symptoms: string; medicines: string; appointments: string; transcription: string }) => {
    if (!user) return;
    const newRecord = {
      userId: user.uid,
      timestamp: new Date().toISOString(),
      ...data
    };

    try {
      await addDoc(collection(db, 'records'), newRecord);
    } catch (err) {
      console.error("Failed to save record:", err);
      // Mock save
      const existing = JSON.parse(localStorage.getItem(`records_${user.uid}`) || '[]');
      const updated = [{ id: Date.now().toString(), ...newRecord }, ...existing];
      localStorage.setItem(`records_${user.uid}`, JSON.stringify(updated));
      setRecords(updated);
    }
    setActiveTab('dashboard');
  };

  const scheduleAppointment = async (apt: Omit<Appointment, 'id' | 'userId' | 'status'>) => {
    if (!user) return;
    const newApt = {
      userId: user.uid,
      status: 'scheduled',
      ...apt
    };

    try {
      await addDoc(collection(db, 'appointments'), newApt);
    } catch (err) {
      console.error("Failed to schedule:", err);
      // Mock save
      const existing = JSON.parse(localStorage.getItem(`appointments_${user.uid}`) || '[]');
      const updated = [{ id: Date.now().toString(), ...newApt }, ...existing];
      localStorage.setItem(`appointments_${user.uid}`, JSON.stringify(updated));
      setAppointments(updated);
    }
    setActiveTab('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Activity className="w-12 h-12 text-blue-600 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/20"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <HeartPulse className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">SymptoTrack AI</h1>
            <p className="text-gray-500 text-center mt-2">Your personal health assistant with voice support</p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === 'signup' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">I am a...</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'patient' | 'doctor')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor / Admin</option>
                </select>
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">SymptoTrack AI</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{user.role} Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
            <UserIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{user.email}</span>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <TabButton 
            active={activeTab === 'voice'} 
            onClick={() => setActiveTab('voice')}
            icon={<Mic className="w-4 h-4" />}
            label="Voice Assistant"
          />
          <TabButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="History & Dashboard"
          />
          <TabButton 
            active={activeTab === 'calendar'} 
            onClick={() => setActiveTab('calendar')}
            icon={<CalendarIcon className="w-4 h-4" />}
            label="Appointments"
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'voice' && (
              <div className="max-w-2xl mx-auto">
                <VoiceInterface onDataExtracted={saveRecord} />
              </div>
            )}
            {activeTab === 'dashboard' && (
              <Dashboard records={records} appointments={appointments} role={user.role} />
            )}
            {activeTab === 'calendar' && (
              <AppointmentScheduler onSchedule={scheduleAppointment} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 p-6 text-center text-gray-400 text-sm">
        &copy; 2026 SymptoTrack AI. All rights reserved. Supporting English & Hindi.
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
          : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
