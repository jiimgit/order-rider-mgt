'use client';
import React, { useState, useEffect } from 'react';
import { Package, User, TrendingUp, LogOut, Lock, UserPlus, Edit2, Trash2, CreditCard, QrCode, X, Navigation, AlertCircle } from 'lucide-react';

const SUPABASE_URL = 'https://esylsugzysfjntukmxks.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzeWxzdWd6eXNmam50dWtteGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDgyODEsImV4cCI6MjA4NDYyNDI4MX0.Ldbk29uDGte1ue7LSAzEoHjAJNjYToAA2zyHWloS2fI';
const PAYNOW_UEN = "202012697W";
const MERCHANT_NAME = "The Food Thinker Pte Ltd";

/* eslint-disable @typescript-eslint/no-explicit-any */
const api = async (endpoint: string, method = 'GET', body: any = null): Promise<any> => {
  const options: any = {
    method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  if (body) options.body = JSON.stringify(body);
  
  console.log(`[API] ${method} ${endpoint}`, body ? JSON.stringify(body) : '');
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options);
    const text = await res.text();
    console.log(`[API Response] Status: ${res.status}`, text);
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e: any) {
      throw new Error(`Invalid JSON response: ${text}`);
    }
    
    if (!res.ok) {
      const errorMsg = data.message || data.error || data.hint || JSON.stringify(data);
      throw new Error(`${res.status}: ${errorMsg}`);
    }
    return data;
  } catch (err) {
    console.error(`[API Error] ${method} ${endpoint}:`, err);
    throw err;
  }
};

const calculateCommissions = (deliveryFee: number, riderTier: number, uplineChain: any[]): any => {
  const platformFee = 1;
  const available = deliveryFee - platformFee;
  let commissions = { platform: platformFee, activeRider: 0, uplines: [] };
  if (riderTier <= 3) {
    const numUplines = riderTier - 1;
    const uplineTotal = numUplines * 2;
    commissions.activeRider = available - uplineTotal;
    uplineChain.slice(0, numUplines).forEach((upline, idx) => {
      commissions.uplines.push({ riderId: upline.id, riderName: upline.name, tier: riderTier - idx - 1, amount: 2 });
    });
  } else {
    commissions.activeRider = deliveryFee * 0.5;
    const uplinePool = available - commissions.activeRider;
    const perUpline = uplinePool / uplineChain.length;
    uplineChain.forEach((upline) => {
      commissions.uplines.push({ riderId: upline.id, riderName: upline.name, tier: upline.tier, amount: perUpline });
    });
  }
  return commissions;
};

const DeliveryPlatform = () => {
  const [auth, setAuth] = useState({ isAuth: false, type: null, id: null });
  const [view, setView] = useState('select');
  const [isReg, setIsReg] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', phone: '', referralCode: '' });
  const [riders, setRiders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [adminView, setAdminView] = useState('customers');
  const [editCust, setEditCust] = useState(null);
  const [editRider, setEditRider] = useState(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmt, setTopUpAmt] = useState('');
  const [payNowQR, setPayNowQR] = useState('');
  const [jobForm, setJobForm] = useState({ pickup: '', delivery: '', timeframe: 'same-day', price: '10' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const curr = auth.type === 'customer' ? customers.find(c => c.id === auth.id) : auth.type === 'rider' ? riders.find(r => r.id === auth.id) : null;
  const activeJob = jobs.find(j => j.rider_id === auth.id && j.status !== 'completed' && j.status !== 'cancelled');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setError('');
      console.log('[LoadData] Starting to fetch data...');
      console.log('[LoadData] Using Supabase URL:', SUPABASE_URL);
      
      const r = await api('riders?select=*');
      console.log('[LoadData] Riders loaded:', r?.length || 0);
      
      const c = await api('customers?select=*');
      console.log('[LoadData] Customers loaded:', c?.length || 0);
      
      const j = await api('jobs?select=*&order=created_at.desc');
      console.log('[LoadData] Jobs loaded:', j?.length || 0);
      
      setRiders(Array.isArray(r) ? r : []);
      setCustomers(Array.isArray(c) ? c : []);
      setJobs(Array.isArray(j) ? j : []);
      console.log('[LoadData] All data loaded successfully!');
    } catch (e: any) { 
      const errorMessage = e.message || 'Unknown error';
      console.error('[LoadData] Error:', e);
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Network error: Cannot reach Supabase. Check your internet connection and Supabase project status.');
      } else if (errorMessage.includes('401') || errorMessage.includes('Invalid API key')) {
        setError('Authentication error: The anon key appears to be invalid. Please verify your Supabase anon key.');
      } else if (errorMessage.includes('404') || errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        setError('Database error: Required tables may not exist. Please create: customers, riders, jobs tables.');
      } else if (errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
        setError('Permission error: Row Level Security (RLS) policies may be blocking access. Check your Supabase RLS settings.');
      } else {
        setError(`Database error: ${errorMessage}`);
      }
    }
    setLoading(false);
  };

  const handleLogin = async (type: string) => {
    try {
      if (type === 'admin' && loginForm.email === 'admin@delivery.com' && loginForm.password === 'admin123') {
        setAuth({ isAuth: true, type: 'admin', id: 'admin1' });
        setLoginForm({ email: '', password: '' });
        return;
      }
      const table = type === 'customer' ? 'customers' : 'riders';
      console.log('Attempting login for:', table, loginForm.email);
      const users = await api(`${table}?email=eq.${encodeURIComponent(loginForm.email)}&password=eq.${encodeURIComponent(loginForm.password)}`);
      console.log('Login response:', users);
      if (users && users.length > 0) {
        setAuth({ isAuth: true, type, id: users[0].id });
        setLoginForm({ email: '', password: '' });
        alert('Login successful!');
      } else {
        alert('Invalid credentials. Please check:\n- Email is correct\n- Password is correct\n- You have registered an account');
      }
    } catch (e: any) {
      console.error('Login error:', e);
      alert('Login error: ' + e.message + '\n\nPlease check:\n1. Database tables exist\n2. RLS policies allow access\n3. Credentials are correct');
    }
  };

  const registerCustomer = async () => {
    if (!regForm.name || !regForm.email || !regForm.password || !regForm.phone) return alert('Please fill in all fields');
    try {
      console.log('Registering customer:', regForm);
      const result = await api('customers', 'POST', { 
        name: regForm.name, 
        email: regForm.email, 
        password: regForm.password, 
        phone: regForm.phone, 
        credits: 20 
      });
      console.log('Registration result:', result);
      alert('Registration successful! You received $20 credits.\n\nYou can now login with:\nEmail: ' + regForm.email + '\nPassword: (your password)');
      setIsReg(false);
      setRegForm({ name: '', email: '', password: '', phone: '', referralCode: '' });
      loadData();
    } catch (e: any) { 
      console.error('Registration error:', e);
      alert('Registration error: ' + e.message + '\n\nPossible issues:\n1. Email already exists\n2. Database connection problem\n3. RLS policy blocking insert'); 
    }
  };

  const registerRider = async () => {
    if (!regForm.name || !regForm.email || !regForm.password || !regForm.phone) return alert('Please fill in all fields');
    let tier = 1, uplineChain = [];
    if (regForm.referralCode) {
      try {
        const ref = await api(`riders?referral_code=eq.${regForm.referralCode.toUpperCase()}`);
        if (!ref || ref.length === 0) return alert('Invalid referral code');
        tier = ref[0].tier + 1;
        uplineChain = [{ id: ref[0].id, name: ref[0].name, tier: ref[0].tier }, ...(ref[0].upline_chain || [])];
      } catch (e: any) {
        return alert('Error checking referral code: ' + e.message);
      }
    }
    const code = regForm.name.substring(0, 4).toUpperCase() + Math.floor(Math.random() * 10000);
    try {
      console.log('Registering rider:', { name: regForm.name, email: regForm.email, tier, code });
      const result = await api('riders', 'POST', { 
        name: regForm.name, 
        email: regForm.email, 
        password: regForm.password, 
        phone: regForm.phone, 
        tier, 
        referral_code: code, 
        upline_chain: uplineChain 
      });
      console.log('Registration result:', result);
      alert(`Registration successful!\n\nYour Details:\n- Tier: ${tier}\n- Referral Code: ${code}\n\nYou can now login with:\nEmail: ${regForm.email}\nPassword: (your password)`);
      setIsReg(false);
      setRegForm({ name: '', email: '', password: '', phone: '', referralCode: '' });
      loadData();
    } catch (e: any) { 
      console.error('Registration error:', e);
      alert('Registration error: ' + e.message + '\n\nPossible issues:\n1. Email already exists\n2. Database connection problem\n3. RLS policy blocking insert'); 
    }
  };

  const createJob = async () => {
    const price = parseFloat(jobForm.price);
    if (price < 3) return alert('Minimum price is $3');
    if (curr.credits < price) return alert('Insufficient credits. Please top up.');
    if (!jobForm.pickup || !jobForm.delivery) return alert('Please fill in pickup and delivery locations');
    try {
      await api('jobs', 'POST', { customer_id: curr.id, customer_name: curr.name, customer_phone: curr.phone, pickup: jobForm.pickup, delivery: jobForm.delivery, timeframe: jobForm.timeframe, price, status: 'posted' });
      await api(`customers?id=eq.${curr.id}`, 'PATCH', { credits: curr.credits - price });
      setJobForm({ pickup: '', delivery: '', timeframe: 'same-day', price: '10' });
      alert('Job posted successfully!');
      loadData();
    } catch (e: any) { alert('Error posting job: ' + e.message); }
  };

  const acceptJob = async (jobId: string) => {
    try {
      await api(`jobs?id=eq.${jobId}`, 'PATCH', { status: 'accepted', rider_id: auth.id, rider_name: curr.name, rider_phone: curr.phone, accepted_at: new Date().toISOString() });
      alert('Job accepted! Customer will be notified via WhatsApp (when integrated).');
      loadData();
    } catch (e: any) { alert('Error accepting job: ' + e.message); }
  };

  const updateStatus = async (status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'picked-up') updateData.picked_up_at = new Date().toISOString();
      if (status === 'on-the-way') updateData.on_the_way_at = new Date().toISOString();
      await api(`jobs?id=eq.${activeJob.id}`, 'PATCH', updateData);
      alert(`Status updated: ${status}. Customer will receive WhatsApp notification (when integrated).`);
      loadData();
    } catch (e: any) { alert('Error updating status: ' + e.message); }
  };

  const completeJob = async () => {
    const comm = calculateCommissions(activeJob.price, curr.tier, curr.upline_chain || []);
    try {
      await api(`jobs?id=eq.${activeJob.id}`, 'PATCH', { status: 'completed', commissions: comm, completed_at: new Date().toISOString() });
      await api(`riders?id=eq.${auth.id}`, 'PATCH', { earnings: curr.earnings + comm.activeRider, completed_jobs: curr.completed_jobs + 1 });
      for (const up of comm.uplines) {
        const upRider = riders.find(r => r.id === up.riderId);
        if (upRider) await api(`riders?id=eq.${up.riderId}`, 'PATCH', { earnings: upRider.earnings + up.amount });
      }
      alert(`Delivery completed! You earned $${comm.activeRider.toFixed(2)}`);
      loadData();
    } catch (e: any) { alert('Error completing job: ' + e.message); }
  };

  const handleTopUp = () => {
    const amt = parseFloat(topUpAmt);
    if (!amt || amt < 5) return alert('Minimum top-up amount is $5');
    setPayNowQR(`PayNow Payment Instructions
━━━━━━━━━━━━━━━━━━━━━━━━━
Merchant: ${MERCHANT_NAME}
UEN: ${PAYNOW_UEN}
Amount: SGD $${amt.toFixed(2)}
Reference: TOP${Date.now()}
━━━━━━━━━━━━━━━━━━━━━━━━━

Steps:
1. Open your banking app
2. Select PayNow
3. Enter UEN: ${PAYNOW_UEN}
4. Enter amount: $${amt.toFixed(2)}
5. Add reference code
6. Complete payment
7. Click "I've Paid" button below`);
  };

  const confirmTopUp = async () => {
    try {
      await api(`customers?id=eq.${auth.id}`, 'PATCH', { credits: curr.credits + parseFloat(topUpAmt) });
      alert('Credits added successfully!');
      setTopUpAmt('');
      setPayNowQR('');
      setShowTopUp(false);
      loadData();
    } catch (e: any) { alert('Error adding credits: ' + e.message); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center max-w-md p-6">
        <Package className="animate-pulse text-blue-600 mx-auto mb-4" size={64} />
        <p className="text-xl font-semibold">Loading platform...</p>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
            <p className="text-red-600 font-semibold flex items-center gap-2">
              <AlertCircle size={20} />
              Connection Error
            </p>
            <p className="text-red-500 text-sm mt-2">{error}</p>
            <div className="mt-4 text-xs text-gray-600">
              <p className="font-semibold mb-1">Troubleshooting:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Check if Supabase project is active</li>
                <li>Verify the anon key is correct</li>
                <li>Ensure tables exist: customers, riders, jobs</li>
                <li>Check RLS policies allow public access</li>
              </ol>
            </div>
            <button 
              onClick={() => { setLoading(true); setError(''); loadData(); }}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (!auth.isAuth) {
    if (view === 'select') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-white mb-4">MLM Delivery Platform</h1>
              <p className="text-lg text-white opacity-90">Choose your portal to get started</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { type: 'admin', icon: TrendingUp, title: 'Admin Portal', color: 'purple', desc: 'Manage platform' },
                { type: 'customer', icon: User, title: 'Customer Portal', color: 'blue', desc: 'Post deliveries' },
                { type: 'rider', icon: Package, title: 'Rider Portal', color: 'green', desc: 'Accept jobs' }
              ].map(({ type, icon: Icon, title, color, desc }) => (
                <button key={type} onClick={() => setView(type)} className="bg-white rounded-2xl p-8 shadow-2xl hover:scale-105 transition-transform">
                  <div className="flex justify-center mb-4">
                    <div className={`bg-${color}-100 p-4 rounded-full`}>
                      <Icon className={`text-${color}-600`} size={48} />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{title}</h2>
                  <p className="text-gray-600 text-sm">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const cfg = {
      admin: { color: 'purple', icon: TrendingUp, bg: 'from-purple-500 to-purple-700', canReg: false },
      customer: { color: 'blue', icon: User, bg: 'from-blue-500 to-blue-700', canReg: true },
      rider: { color: 'green', icon: Package, bg: 'from-green-500 to-green-700', canReg: true }
    }[view];
    const Icon = cfg.icon;

    return (
      <div className={`min-h-screen bg-gradient-to-br ${cfg.bg} flex items-center justify-center p-4`}>
        <div className="max-w-md w-full">
          <button onClick={() => { setView('select'); setIsReg(false); setLoginForm({ email: '', password: '' }); }} className="text-white mb-6 hover:underline">
            ← Back to portal selection
          </button>
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex justify-center mb-6">
              <div className={`bg-${cfg.color}-100 p-4 rounded-full`}>
                <Icon className={`text-${cfg.color}-600`} size={48} />
              </div>
            </div>
            {!isReg ? (
              <>
                <h2 className="text-3xl font-bold text-center mb-2">{view === 'admin' ? 'Admin' : view === 'customer' ? 'Customer' : 'Rider'} Login</h2>
                <p className="text-center text-gray-600 mb-8">Enter your credentials</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input 
                      type="email" 
                      value={loginForm.email} 
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      placeholder="your@email.com" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input 
                      type="password" 
                      value={loginForm.password} 
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} 
                      onKeyPress={(e) => e.key === 'Enter' && handleLogin(view)} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      placeholder="••••••••" 
                    />
                  </div>
                  <button 
                    onClick={() => handleLogin(view)} 
                    className={`w-full bg-${cfg.color}-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-${cfg.color}-700 transition-colors`}
                  >
                    Sign In
                  </button>
                </div>
                {cfg.canReg && (
                  <div className="mt-6 text-center">
                    <p className="text-gray-600 mb-3">Don't have an account?</p>
                    <button 
                      onClick={() => setIsReg(true)} 
                      className={`flex items-center justify-center gap-2 w-full border-2 border-${cfg.color}-600 text-${cfg.color}-600 py-3 rounded-lg font-semibold hover:bg-${cfg.color}-50 transition-colors`}
                    >
                      <UserPlus size={20} />
                      Create New Account
                    </button>
                  </div>
                )}
                {view === 'admin' && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Demo Admin Login:</p>
                    <p className="text-xs text-gray-600">Email: admin@delivery.com</p>
                    <p className="text-xs text-gray-600">Password: admin123</p>
                  </div>
                )}
                {view !== 'admin' && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-800">
                      {view === 'customer' 
                        ? 'New customers get $20 welcome credits upon registration!' 
                        : 'Register to get your unique referral code and start earning!'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-center mb-2">Create Account</h2>
                <p className="text-center text-gray-600 mb-8">Join our platform today</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={regForm.name} 
                      onChange={(e) => setRegForm({...regForm, name: e.target.value})} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                      placeholder="John Doe" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input 
                      type="email" 
                      value={regForm.email} 
                      onChange={(e) => setRegForm({...regForm, email: e.target.value})} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                      placeholder="john@example.com" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input 
                      type="password" 
                      value={regForm.password} 
                      onChange={(e) => setRegForm({...regForm, password: e.target.value})} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                      placeholder="••••••••" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input 
                      type="text" 
                      value={regForm.phone} 
                      onChange={(e) => setRegForm({...regForm, phone: e.target.value})} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                      placeholder="+65 1234 5678" 
                    />
                  </div>
                  {view === 'rider' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Referral Code (Optional)</label>
                      <input 
                        type="text" 
                        value={regForm.referralCode} 
                        onChange={(e) => setRegForm({...regForm, referralCode: e.target.value})} 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                        placeholder="Enter referral code" 
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave blank to become a Tier 1 rider</p>
                    </div>
                  )}
                  <button 
                    onClick={view === 'customer' ? registerCustomer : registerRider} 
                    className={`w-full bg-${cfg.color}-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-${cfg.color}-700 transition-colors`}
                  >
                    Register
                  </button>
                  <button 
                    onClick={() => { setIsReg(false); setRegForm({ name: '', email: '', password: '', phone: '', referralCode: '' }); }} 
                    className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {auth.type === 'admin' ? 'Admin Dashboard' : auth.type === 'customer' ? 'Customer Portal' : 'Rider Portal'}
            </h1>
            {curr && (
              <p className="text-sm text-gray-600">
                {curr.name}
                {auth.type === 'customer' && ` | Credits: $${(curr.credits || 0).toFixed(2)}`}
                {auth.type === 'rider' && ` | Tier ${curr.tier} | Earnings: $${(curr.earnings || 0).toFixed(2)}`}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {auth.type === 'admin' && (
              <>
                <button 
                  onClick={() => setAdminView('customers')} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'customers' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Customers
                </button>
                <button 
                  onClick={() => setAdminView('riders')} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'riders' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Riders
                </button>
                <button 
                  onClick={() => setAdminView('jobs')} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'jobs' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Jobs
                </button>
              </>
            )}
            <button 
              onClick={() => setAuth({ isAuth: false, type: null, id: null })} 
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {auth.type === 'customer' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-blue-100 text-sm">Available Credits</p>
                  <p className="text-5xl font-bold">${(curr.credits || 0).toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => setShowTopUp(true)} 
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-lg"
                >
                  <CreditCard size={20} />
                  Top Up via PayNow
                </button>
              </div>
            </div>

            {showTopUp && (
              <div className="bg-white rounded-lg shadow-xl p-6 border-2 border-blue-500">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <QrCode className="text-blue-600" />
                    PayNow Top-Up
                  </h3>
                  <button 
                    onClick={() => { setShowTopUp(false); setPayNowQR(''); setTopUpAmt(''); }} 
                    className="text-gray-500 hover:text-gray-700 p-2"
                  >
                    <X size={28} />
                  </button>
                </div>
                {!payNowQR ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Payment Details:</p>
                      <p className="text-sm text-blue-800">Merchant: {MERCHANT_NAME}</p>
                      <p className="text-sm text-blue-800">UEN: {PAYNOW_UEN}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Top-Up Amount (minimum $5)</label>
                      <input 
                        type="number" 
                        value={topUpAmt} 
                        onChange={(e) => setTopUpAmt(e.target.value)} 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500" 
                        placeholder="Enter amount" 
                        min="5" 
                        step="0.5"
                      />
                    </div>
                    <button 
                      onClick={handleTopUp} 
                      className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
                    >
                      Generate PayNow Instructions
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
                      <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800">{payNowQR}</pre>
                    </div>
                    <button 
                      onClick={confirmTopUp} 
                      className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      ✓ I've Paid - Add ${topUpAmt} Credits
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-2xl font-bold mb-6">Post New Delivery Job</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Location</label>
                  <input 
                    type="text" 
                    value={jobForm.pickup} 
                    onChange={(e) => setJobForm({...jobForm, pickup: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    placeholder="e.g., 123 Orchard Road" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Location</label>
                  <input 
                    type="text" 
                    value={jobForm.delivery} 
                    onChange={(e) => setJobForm({...jobForm, delivery: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    placeholder="e.g., 456 Marina Bay" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Timeframe</label>
                  <select 
                    value={jobForm.timeframe} 
                    onChange={(e) => setJobForm({...jobForm, timeframe: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="same-day">Same Day Delivery</option>
                    <option value="next-day">Next Day Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Price (minimum $3)</label>
                  <input 
                    type="number" 
                    value={jobForm.price} 
                    onChange={(e) => setJobForm({...jobForm, price: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500" 
                    min="3" 
                    step="0.5"
                    placeholder="10.00"
                  />
                </div>
                <button 
                  onClick={createJob} 
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
                >
                  Post Job - ${jobForm.price}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-2xl font-bold mb-6">My Delivery Jobs</h3>
              {jobs.filter(j => j.customer_id === auth.id).length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No delivery jobs yet</p>
                  <p className="text-sm">Post your first job above!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.filter(j => j.customer_id === auth.id).map(job => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-lg text-gray-900">{job.pickup} → {job.delivery}</p>
                          <p className="text-sm text-gray-600">{job.timeframe}</p>
                          {job.rider_name && <p className="text-sm text-gray-600 mt-1">Rider: {job.rider_name}</p>}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-2xl font-bold text-blue-600">${job.price}</p>
                          <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                            job.status === 'completed' ? 'bg-green-100 text-green-700' :
                            job.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            job.status === 'posted' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {job.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {auth.type === 'rider' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-green-100 text-sm">Total Earnings</p>
                  <p className="text-5xl font-bold">${(curr.earnings || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-green-100 text-sm">Completed Jobs</p>
                  <p className="text-5xl font-bold">{curr.completed_jobs || 0}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-green-400">
                <p className="text-green-100 text-sm">Your Referral Code</p>
                <p className="text-2xl font-bold">{curr.referral_code}</p>
                <p className="text-sm text-green-100 mt-1">Share this code to grow your team!</p>
              </div>
            </div>

            {curr.earnings >= 200 && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <p className="text-yellow-800 font-semibold">🎉 You can now withdraw your earnings! (Feature coming soon)</p>
              </div>
            )}

            {activeJob && (
              <div className="bg-white rounded-lg shadow-xl p-6 border-2 border-blue-500">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Package className="text-blue-600" />
                  Active Delivery
                </h3>
                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                  <p className="font-semibold text-xl text-gray-900 mb-2">{activeJob.pickup} → {activeJob.delivery}</p>
                  <p className="text-gray-700">Customer: {activeJob.customer_name}</p>
                  <p className="text-gray-700">Phone: {activeJob.customer_phone}</p>
                  <p className="text-4xl font-bold text-blue-600 mt-4">${activeJob.price}</p>
                </div>
                <div className="space-y-3">
                  {activeJob.status === 'accepted' && (
                    <button 
                      onClick={() => updateStatus('picked-up')} 
                      className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Package size={20} />
                      Pick Up Package
                    </button>
                  )}
                  {activeJob.status === 'picked-up' && (
                    <button 
                      onClick={() => updateStatus('on-the-way')} 
                      className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Navigation size={20} />
                      On My Way
                    </button>
                  )}
                  {activeJob.status === 'on-the-way' && (
                    <button 
                      onClick={completeJob} 
                      className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      ✓ Complete Delivery
                    </button>
                  )}
                </div>
              </div>
            )}

            {!activeJob && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-6">Available Jobs</h3>
                {jobs.filter(j => j.status === 'posted').length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No jobs available right now</p>
                    <p className="text-sm">Check back soon!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs.filter(j => j.status === 'posted').map(job => {
                      const comm = calculateCommissions(job.price, curr.tier, curr.upline_chain || []);
                      return (
                        <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:border-green-400 hover:shadow-lg transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-lg">{job.pickup} → {job.delivery}</p>
                              <p className="text-sm text-gray-600">{job.timeframe}</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">${job.price}</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg mb-3">
                            <p className="text-sm text-gray-600 mb-1">You will earn:</p>
                            <p className="text-3xl font-bold text-green-600">${comm.activeRider.toFixed(2)}</p>
                            {comm.uplines.length > 0 && (
                              <p className="text-xs text-gray-500 mt-2">
                                Upline commission: ${comm.uplines.reduce((sum, u) => sum + u.amount, 0).toFixed(2)}
                              </p>
                            )}
                          </div>
                          <button 
                            onClick={() => acceptJob(job.id)} 
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                          >
                            Accept Job
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {auth.type === 'admin' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <User className="text-blue-600 mb-2" size={32} />
                <p className="text-gray-600">Customers</p>
                <p className="text-4xl font-bold">{customers.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <Package className="text-green-600 mb-2" size={32} />
                <p className="text-gray-600">Riders</p>
                <p className="text-4xl font-bold">{riders.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <TrendingUp className="text-purple-600 mb-2" size={32} />
                <p className="text-gray-600">Jobs</p>
                <p className="text-4xl font-bold">{jobs.length}</p>
              </div>
            </div>

            {adminView === 'customers' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-2xl font-bold mb-6">All Customers ({customers.length})</h3>
                <div className="space-y-3">
                  {customers.map(c => (
                    <div key={c.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-lg">{c.name}</p>
                          <p className="text-sm text-gray-600">{c.email} | {c.phone}</p>
                          <p className="text-sm font-bold text-green-600 mt-1">Credits: ${(c.credits || 0).toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditCust(c)} className="p-2 bg-blue-100 rounded hover:bg-blue-200"><Edit2 size={18} /></button>
                          <button onClick={async () => { if (window.confirm('Delete customer?')) { await api(`customers?id=eq.${c.id}`, 'DELETE'); loadData(); }}} className="p-2 bg-red-100 rounded hover:bg-red-200"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminView === 'riders' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-2xl font-bold mb-6">All Riders ({riders.length})</h3>
                <div className="space-y-3">
                  {riders.map(r => (
                    <div key={r.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-lg">{r.name} - Tier {r.tier}</p>
                          <p className="text-sm text-gray-600">{r.email} | {r.phone}</p>
                          <p className="text-sm text-gray-600 mt-1">Code: {r.referral_code}</p>
                          <p className="text-sm font-bold text-green-600 mt-1">Earnings: ${(r.earnings || 0).toFixed(2)} | Jobs: {r.completed_jobs || 0}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditRider(r)} className="p-2 bg-blue-100 rounded hover:bg-blue-200"><Edit2 size={18} /></button>
                          <button onClick={async () => { if (window.confirm('Delete rider?')) { await api(`riders?id=eq.${r.id}`, 'DELETE'); loadData(); }}} className="p-2 bg-red-100 rounded hover:bg-red-200"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminView === 'jobs' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-2xl font-bold mb-6">All Jobs ({jobs.length})</h3>
                <div className="space-y-3">
                  {jobs.map(j => (
                    <div key={j.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{j.pickup} → {j.delivery}</p>
                          <p className="text-sm text-gray-600">Customer: {j.customer_name} | Rider: {j.rider_name || 'Unassigned'}</p>
                          <p className="text-sm text-gray-600">Price: ${j.price} | Status: {j.status}</p>
                        </div>
                        <button onClick={async () => { if (window.confirm('Delete job?')) { await api(`jobs?id=eq.${j.id}`, 'DELETE'); loadData(); }}} className="p-2 bg-red-100 rounded hover:bg-red-200"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DeliveryPlatform;
