'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Package, User, TrendingUp, LogOut, Lock, UserPlus, Edit2, Trash2, CreditCard, QrCode, X, Navigation, AlertCircle, Search, Download, ChevronLeft, ChevronRight, FileText, Calendar } from 'lucide-react';

const SUPABASE_URL = 'https://esylsugzysfjntukmxks.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzeWxzdWd6eXNmam50dWtteGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDgyODEsImV4cCI6MjA4NDYyNDI4MX0.Ldbk29uDGte1ue7LSAzEoHjAJNjYToAA2zyHWloS2fI';
const PAYNOW_UEN = "202012697W";
const MERCHANT_NAME = "The Food Thinker Pte Ltd";
const ITEMS_PER_PAGE = 10;

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
  const [editCust, setEditCust] = useState<any>(null);
  const [editRider, setEditRider] = useState<any>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmt, setTopUpAmt] = useState('');
  const [payNowQR, setPayNowQR] = useState('');
  const [jobForm, setJobForm] = useState({ pickup: '', delivery: '', timeframe: 'same-day', price: '10' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Admin search, pagination and filter states
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [riderSearch, setRiderSearch] = useState('');
  const [riderPage, setRiderPage] = useState(1);
  const [jobSearch, setJobSearch] = useState('');
  const [jobPage, setJobPage] = useState(1);
  const [jobDateFrom, setJobDateFrom] = useState('');
  const [jobDateTo, setJobDateTo] = useState('');

  // Export functions
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const key = h.toLowerCase().replace(/ /g, '_');
        let value = row[key] ?? '';
        // Handle special cases
        if (key === 'credits' || key === 'earnings' || key === 'price') value = parseFloat(value || 0).toFixed(2);
        if (key === 'created_at') value = new Date(value).toLocaleString();
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = (data: any[], title: string, headers: string[]) => {
    // Create a printable HTML table
    const tableRows = data.map(row => 
      `<tr>${headers.map(h => {
        const key = h.toLowerCase().replace(/ /g, '_');
        let value = row[key] ?? '';
        if (key === 'credits' || key === 'earnings' || key === 'price') value = '$' + parseFloat(value || 0).toFixed(2);
        if (key === 'created_at') value = new Date(value).toLocaleDateString();
        if (key === 'password') value = '••••••••';
        return `<td style="border:1px solid #ddd;padding:8px;">${value}</td>`;
      }).join('')}</tr>`
    ).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th { background-color: #4CAF50; color: white; padding: 12px 8px; text-align: left; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .header { display: flex; justify-content: space-between; align-items: center; }
          .date { color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p class="date">Generated: ${new Date().toLocaleString()}</p>
        </div>
        <p>Total Records: ${data.length}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  // Filter and paginate customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c: any) => 
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  const paginatedCustomers = useMemo(() => {
    const start = (customerPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, customerPage]);

  const customerTotalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

  // Filter and paginate riders
  const filteredRiders = useMemo(() => {
    return riders.filter((r: any) => 
      r.name?.toLowerCase().includes(riderSearch.toLowerCase()) ||
      r.email?.toLowerCase().includes(riderSearch.toLowerCase()) ||
      r.phone?.includes(riderSearch) ||
      r.referral_code?.toLowerCase().includes(riderSearch.toLowerCase())
    );
  }, [riders, riderSearch]);

  const paginatedRiders = useMemo(() => {
    const start = (riderPage - 1) * ITEMS_PER_PAGE;
    return filteredRiders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRiders, riderPage]);

  const riderTotalPages = Math.ceil(filteredRiders.length / ITEMS_PER_PAGE);

  // Filter and paginate jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j: any) => {
      const matchesSearch = 
        j.customer_name?.toLowerCase().includes(jobSearch.toLowerCase()) ||
        j.rider_name?.toLowerCase().includes(jobSearch.toLowerCase()) ||
        j.pickup?.toLowerCase().includes(jobSearch.toLowerCase()) ||
        j.delivery?.toLowerCase().includes(jobSearch.toLowerCase()) ||
        j.status?.toLowerCase().includes(jobSearch.toLowerCase());
      
      let matchesDate = true;
      if (jobDateFrom) {
        const jobDate = new Date(j.created_at);
        const fromDate = new Date(jobDateFrom);
        matchesDate = matchesDate && jobDate >= fromDate;
      }
      if (jobDateTo) {
        const jobDate = new Date(j.created_at);
        const toDate = new Date(jobDateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && jobDate <= toDate;
      }
      
      return matchesSearch && matchesDate;
    });
  }, [jobs, jobSearch, jobDateFrom, jobDateTo]);

  const paginatedJobs = useMemo(() => {
    const start = (jobPage - 1) * ITEMS_PER_PAGE;
    return filteredJobs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredJobs, jobPage]);

  const jobTotalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);

  // WhatsApp Message Templates
  const whatsAppTemplates = {
    accepted: [
      { id: 1, label: '👋 Job Accepted', message: 'Hi {customer}! I am {rider}, your delivery rider. I have accepted your delivery job from {pickup} to {delivery}. I will pick up your package soon!' },
      { id: 2, label: '📦 Will Collect Soon', message: 'Hello {customer}! This is {rider}. I will be collecting your package from {pickup} shortly. Please ensure it is ready for pickup.' },
      { id: 3, label: '⏰ ETA Update', message: 'Hi {customer}! Your rider {rider} here. I expect to pick up your package in about 15-20 minutes. Thank you!' },
    ],
    'picked-up': [
      { id: 4, label: '✅ Package Collected', message: 'Hi {customer}! Good news - I have collected your package from {pickup}. Now heading to {delivery}!' },
      { id: 5, label: '📦 On My Way Soon', message: 'Hello {customer}! Package picked up successfully. I will be on my way to {delivery} shortly.' },
      { id: 6, label: '🚗 Starting Delivery', message: 'Hi {customer}! Your package is with me now. Starting my journey to deliver it to {delivery}. Stay tuned!' },
    ],
    'on-the-way': [
      { id: 7, label: '🚗 On The Way', message: 'Hi {customer}! I am now on my way to {delivery} with your package. ETA approximately 15-20 minutes.' },
      { id: 8, label: '📍 Almost There', message: 'Hello {customer}! I am getting close to {delivery}. Please be ready to receive your package!' },
      { id: 9, label: '🔔 Arriving Soon', message: 'Hi {customer}! I will arrive at {delivery} in about 5-10 minutes. Please be available to receive your delivery.' },
    ],
    completed: [
      { id: 10, label: '✅ Delivered', message: 'Hi {customer}! Your package has been successfully delivered to {delivery}. Thank you for using our service!' },
      { id: 11, label: '🙏 Thank You', message: 'Hello {customer}! Delivery completed! Thank you for choosing us. Have a great day!' },
    ],
    custom: [
      { id: 12, label: '⏰ Running Late', message: 'Hi {customer}! I apologize but I am running a bit late due to traffic. I will reach {delivery} as soon as possible. Thank you for your patience!' },
      { id: 13, label: '📞 Please Call Me', message: 'Hi {customer}! This is your rider {rider}. Could you please give me a call? I need some clarification about the delivery. Thank you!' },
      { id: 14, label: '📍 Location Help', message: 'Hi {customer}! I am having trouble finding the exact location at {delivery}. Could you please share your live location or provide more details?' },
      { id: 15, label: '🏠 At Location', message: 'Hi {customer}! I have arrived at {delivery}. Please come to collect your package or let me know where to leave it.' },
    ]
  };

  // Generate WhatsApp Click-to-Chat URL
  const generateWhatsAppLink = (phone: string, message: string): string => {
    // Remove any non-numeric characters and ensure proper format
    let cleanPhone = phone.replace(/\D/g, '');
    // Add Singapore country code if not present
    if (cleanPhone.startsWith('8') || cleanPhone.startsWith('9')) {
      cleanPhone = '65' + cleanPhone;
    } else if (!cleanPhone.startsWith('65')) {
      cleanPhone = '65' + cleanPhone;
    }
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  };

  // Replace placeholders in template message
  const formatTemplateMessage = (template: string, job: any, riderName: string): string => {
    return template
      .replace(/{customer}/g, job.customer_name || 'Customer')
      .replace(/{rider}/g, riderName || 'Your Rider')
      .replace(/{pickup}/g, job.pickup || 'pickup location')
      .replace(/{delivery}/g, job.delivery || 'delivery location');
  };

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

  // CRC16-CCITT calculation for PayNow QR
  const calculateCRC16 = (str: string): string => {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    
    for (let i = 0; i < str.length; i++) {
      crc ^= (str.charCodeAt(i) << 8);
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = ((crc << 1) ^ polynomial) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  };

  // Generate proper PayNow QR string following EMVCo standard
  const generatePayNowString = (uen: string, amount: number, refNumber: string, editable: boolean = false): string => {
    const merchantName = MERCHANT_NAME.substring(0, 25).toUpperCase();
    const amountStr = amount.toFixed(2);
    
    // Helper to create TLV (Tag-Length-Value)
    const tlv = (tag: string, value: string): string => {
      return tag + value.length.toString().padStart(2, '0') + value;
    };
    
    // Build Merchant Account Information (ID 26) for PayNow
    let merchantAcctInfo = '';
    merchantAcctInfo += tlv('00', 'SG.PAYNOW');           // Globally unique identifier
    merchantAcctInfo += tlv('01', '2');                   // Proxy type: 2 = UEN
    merchantAcctInfo += tlv('02', uen);                   // Proxy value (UEN)
    merchantAcctInfo += tlv('03', editable ? '1' : '0');  // Amount editable: 0 = No, 1 = Yes
    
    // Build Additional Data Field (ID 62)
    let additionalData = '';
    additionalData += tlv('01', refNumber);              // Bill/Reference number
    
    // Build the QR string
    let qrString = '';
    qrString += tlv('00', '01');                         // Payload Format Indicator
    qrString += tlv('01', '12');                         // Point of Initiation: 12 = Dynamic QR
    qrString += tlv('26', merchantAcctInfo);             // Merchant Account Info (PayNow)
    qrString += tlv('52', '0000');                       // Merchant Category Code
    qrString += tlv('53', '702');                        // Transaction Currency: 702 = SGD
    qrString += tlv('54', amountStr);                    // Transaction Amount
    qrString += tlv('58', 'SG');                         // Country Code
    qrString += tlv('59', merchantName);                 // Merchant Name
    qrString += tlv('60', 'SINGAPORE');                  // Merchant City
    qrString += tlv('62', additionalData);               // Additional Data
    
    // Add CRC placeholder and calculate
    qrString += '6304';
    const crc = calculateCRC16(qrString);
    qrString += crc;
    
    return qrString;
  };

  const handleTopUp = () => {
    const amt = parseFloat(topUpAmt);
    if (!amt || amt < 5) return alert('Minimum top-up amount is $5');
    const refNumber = 'TOP' + Date.now().toString().slice(-8);
    
    // Generate proper PayNow QR string
    const payNowString = generatePayNowString(PAYNOW_UEN, amt, refNumber, false);
    
    // Generate QR code image URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payNowString)}`;
    
    setPayNowQR(JSON.stringify({
      qrUrl: qrCodeUrl,
      payNowString: payNowString,
      amount: amt,
      refNumber: refNumber,
      uen: PAYNOW_UEN,
      merchantName: MERCHANT_NAME
    }));
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
                    {(() => {
                      const qrData = JSON.parse(payNowQR);
                      return (
                        <>
                          <div className="flex justify-center">
                            <div className="bg-white p-4 rounded-lg border-2 border-purple-500 shadow-lg">
                              <img 
                                src={qrData.qrUrl} 
                                alt="PayNow QR Code" 
                                className="w-48 h-48"
                              />
                            </div>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg text-center">
                            <p className="text-lg font-bold text-purple-900">Scan with PayNow</p>
                            <p className="text-2xl font-bold text-purple-700 mt-2">SGD ${qrData.amount.toFixed(2)}</p>
                            <div className="mt-3 text-sm text-purple-800">
                              <p><span className="font-semibold">To:</span> {qrData.merchantName}</p>
                              <p><span className="font-semibold">UEN:</span> {qrData.uen}</p>
                              <p><span className="font-semibold">Ref:</span> {qrData.refNumber}</p>
                            </div>
                          </div>
                          <div className="bg-yellow-50 p-3 rounded-lg">
                            <p className="text-xs text-yellow-800 text-center">
                              Open your banking app → Scan QR → Confirm payment → Click button below
                            </p>
                          </div>
                        </>
                      );
                    })()}
                    <button 
                      onClick={confirmTopUp} 
                      className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      ✓ I've Paid - Add ${topUpAmt} Credits
                    </button>
                    <button 
                      onClick={() => setPayNowQR('')} 
                      className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
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
                
                {/* WhatsApp Notify Customer Button */}
                <button 
                  onClick={() => setShowWhatsAppModal(true)} 
                  className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold text-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 mb-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Notify Customer via WhatsApp
                </button>

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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <h3 className="text-2xl font-bold">All Customers ({filteredCustomers.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => exportToCSV(filteredCustomers, 'customers', ['Name', 'Email', 'Phone', 'Credits', 'Created_at'])}
                      className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
                    >
                      <Download size={16} /> Excel/CSV
                    </button>
                    <button 
                      onClick={() => exportToPDF(filteredCustomers, 'Customers Report', ['Name', 'Email', 'Phone', 'Credits', 'Created_at'])}
                      className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                    >
                      <FileText size={16} /> PDF
                    </button>
                  </div>
                </div>
                
                {/* Search Box */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setCustomerPage(1); }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-3">
                  {paginatedCustomers.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No customers found</p>
                  ) : (
                    paginatedCustomers.map((c: any) => (
                      <div key={c.id} className="border rounded-lg p-4 hover:border-purple-300 transition-colors">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-lg">{c.name}</p>
                            <p className="text-sm text-gray-600">{c.email} | {c.phone}</p>
                            <p className="text-sm font-bold text-green-600 mt-1">Credits: ${(c.credits || 0).toFixed(2)}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditCust({...c, password: ''})} className="p-2 bg-blue-100 rounded hover:bg-blue-200" title="Edit"><Edit2 size={18} /></button>
                            <button onClick={async () => { if (window.confirm('Delete customer?')) { await api(`customers?id=eq.${c.id}`, 'DELETE'); loadData(); }}} className="p-2 bg-red-100 rounded hover:bg-red-200" title="Delete"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {customerTotalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                      onClick={() => setCustomerPage(p => Math.max(1, p - 1))}
                      disabled={customerPage === 1}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    {Array.from({ length: customerTotalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === customerTotalPages || Math.abs(p - customerPage) <= 2)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-2">...</span>}
                          <button
                            onClick={() => setCustomerPage(p)}
                            className={`w-10 h-10 rounded-lg font-medium ${customerPage === p ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))
                    }
                    <button
                      onClick={() => setCustomerPage(p => Math.min(customerTotalPages, p + 1))}
                      disabled={customerPage === customerTotalPages}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {adminView === 'riders' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <h3 className="text-2xl font-bold">All Riders ({filteredRiders.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => exportToCSV(filteredRiders, 'riders', ['Name', 'Email', 'Phone', 'Tier', 'Referral_code', 'Earnings', 'Completed_jobs', 'Created_at'])}
                      className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
                    >
                      <Download size={16} /> Excel/CSV
                    </button>
                    <button 
                      onClick={() => exportToPDF(filteredRiders, 'Riders Report', ['Name', 'Email', 'Phone', 'Tier', 'Referral_code', 'Earnings', 'Completed_jobs'])}
                      className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                    >
                      <FileText size={16} /> PDF
                    </button>
                  </div>
                </div>
                
                {/* Search Box */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by name, email, phone, or referral code..."
                    value={riderSearch}
                    onChange={(e) => { setRiderSearch(e.target.value); setRiderPage(1); }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-3">
                  {paginatedRiders.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No riders found</p>
                  ) : (
                    paginatedRiders.map((r: any) => (
                      <div key={r.id} className="border rounded-lg p-4 hover:border-green-300 transition-colors">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-lg">{r.name} - Tier {r.tier}</p>
                            <p className="text-sm text-gray-600">{r.email} | {r.phone}</p>
                            <p className="text-sm text-gray-600 mt-1">Code: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{r.referral_code}</span></p>
                            <p className="text-sm font-bold text-green-600 mt-1">Earnings: ${(r.earnings || 0).toFixed(2)} | Jobs: {r.completed_jobs || 0}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditRider({...r, password: ''})} className="p-2 bg-blue-100 rounded hover:bg-blue-200" title="Edit"><Edit2 size={18} /></button>
                            <button onClick={async () => { if (window.confirm('Delete rider?')) { await api(`riders?id=eq.${r.id}`, 'DELETE'); loadData(); }}} className="p-2 bg-red-100 rounded hover:bg-red-200" title="Delete"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {riderTotalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                      onClick={() => setRiderPage(p => Math.max(1, p - 1))}
                      disabled={riderPage === 1}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    {Array.from({ length: riderTotalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === riderTotalPages || Math.abs(p - riderPage) <= 2)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-2">...</span>}
                          <button
                            onClick={() => setRiderPage(p)}
                            className={`w-10 h-10 rounded-lg font-medium ${riderPage === p ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))
                    }
                    <button
                      onClick={() => setRiderPage(p => Math.min(riderTotalPages, p + 1))}
                      disabled={riderPage === riderTotalPages}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {adminView === 'jobs' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <h3 className="text-2xl font-bold">All Jobs ({filteredJobs.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => exportToCSV(filteredJobs, 'jobs', ['Customer_name', 'Rider_name', 'Pickup', 'Delivery', 'Price', 'Status', 'Created_at'])}
                      className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
                    >
                      <Download size={16} /> Excel/CSV
                    </button>
                    <button 
                      onClick={() => exportToPDF(filteredJobs, 'Jobs Report', ['Customer_name', 'Rider_name', 'Pickup', 'Delivery', 'Price', 'Status', 'Created_at'])}
                      className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                    >
                      <FileText size={16} /> PDF
                    </button>
                  </div>
                </div>
                
                {/* Search and Date Filter */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="relative md:col-span-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search customer, rider, location, status..."
                      value={jobSearch}
                      onChange={(e) => { setJobSearch(e.target.value); setJobPage(1); }}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="date"
                      value={jobDateFrom}
                      onChange={(e) => { setJobDateFrom(e.target.value); setJobPage(1); }}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="From date"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">From</span>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="date"
                      value={jobDateTo}
                      onChange={(e) => { setJobDateTo(e.target.value); setJobPage(1); }}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="To date"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">To</span>
                  </div>
                </div>
                {(jobDateFrom || jobDateTo) && (
                  <button 
                    onClick={() => { setJobDateFrom(''); setJobDateTo(''); }}
                    className="mb-4 text-sm text-blue-600 hover:underline"
                  >
                    Clear date filter
                  </button>
                )}

                <div className="space-y-3">
                  {paginatedJobs.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No jobs found</p>
                  ) : (
                    paginatedJobs.map((j: any) => (
                      <div key={j.id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-lg">{j.pickup} → {j.delivery}</p>
                            <p className="text-sm text-gray-600">Customer: {j.customer_name} | Rider: {j.rider_name || 'Unassigned'}</p>
                            <p className="text-sm text-gray-600">Price: ${j.price} | Status: <span className={`font-medium ${j.status === 'completed' ? 'text-green-600' : j.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'}`}>{j.status}</span></p>
                            <p className="text-xs text-gray-400 mt-1">Created: {new Date(j.created_at).toLocaleString()}</p>
                          </div>
                          <button onClick={async () => { if (window.confirm('Delete job?')) { await api(`jobs?id=eq.${j.id}`, 'DELETE'); loadData(); }}} className="p-2 bg-red-100 rounded hover:bg-red-200" title="Delete"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {jobTotalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                      onClick={() => setJobPage(p => Math.max(1, p - 1))}
                      disabled={jobPage === 1}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    {Array.from({ length: jobTotalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === jobTotalPages || Math.abs(p - jobPage) <= 2)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-2">...</span>}
                          <button
                            onClick={() => setJobPage(p)}
                            className={`w-10 h-10 rounded-lg font-medium ${jobPage === p ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))
                    }
                    <button
                      onClick={() => setJobPage(p => Math.min(jobTotalPages, p + 1))}
                      disabled={jobPage === jobTotalPages}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Edit Customer Modal */}
        {editCust && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Edit Customer</h3>
                <button onClick={() => setEditCust(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input 
                    type="text" 
                    value={editCust.name} 
                    onChange={(e) => setEditCust({...editCust, name: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input 
                    type="email" 
                    value={editCust.email} 
                    onChange={(e) => setEditCust({...editCust, email: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input 
                    type="text" 
                    value={editCust.phone} 
                    onChange={(e) => setEditCust({...editCust, phone: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Credits</label>
                  <input 
                    type="number" 
                    value={editCust.credits || 0} 
                    onChange={(e) => setEditCust({...editCust, credits: parseFloat(e.target.value)})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password <span className="text-gray-400 font-normal">(leave empty to keep current)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="password" 
                      value={editCust.password || ''} 
                      onChange={(e) => setEditCust({...editCust, password: e.target.value})} 
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                      placeholder="Enter new password"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={() => setEditCust(null)} 
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const updateData: any = {
                          name: editCust.name,
                          email: editCust.email,
                          phone: editCust.phone,
                          credits: editCust.credits
                        };
                        // Only update password if a new one was entered
                        if (editCust.password && editCust.password.trim() !== '') {
                          updateData.password = editCust.password;
                        }
                        await api(`customers?id=eq.${editCust.id}`, 'PATCH', updateData);
                        alert('Customer updated successfully!');
                        setEditCust(null);
                        loadData();
                      } catch (e: any) {
                        alert('Error updating customer: ' + e.message);
                      }
                    }} 
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Rider Modal */}
        {editRider && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Edit Rider</h3>
                <button onClick={() => setEditRider(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input 
                    type="text" 
                    value={editRider.name} 
                    onChange={(e) => setEditRider({...editRider, name: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input 
                    type="email" 
                    value={editRider.email} 
                    onChange={(e) => setEditRider({...editRider, email: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input 
                    type="text" 
                    value={editRider.phone} 
                    onChange={(e) => setEditRider({...editRider, phone: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tier</label>
                  <input 
                    type="number" 
                    value={editRider.tier || 1} 
                    onChange={(e) => setEditRider({...editRider, tier: parseInt(e.target.value)})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Earnings</label>
                  <input 
                    type="number" 
                    value={editRider.earnings || 0} 
                    onChange={(e) => setEditRider({...editRider, earnings: parseFloat(e.target.value)})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password <span className="text-gray-400 font-normal">(leave empty to keep current)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="password" 
                      value={editRider.password || ''} 
                      onChange={(e) => setEditRider({...editRider, password: e.target.value})} 
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                      placeholder="Enter new password"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={() => setEditRider(null)} 
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const updateData: any = {
                          name: editRider.name,
                          email: editRider.email,
                          phone: editRider.phone,
                          tier: editRider.tier,
                          earnings: editRider.earnings
                        };
                        // Only update password if a new one was entered
                        if (editRider.password && editRider.password.trim() !== '') {
                          updateData.password = editRider.password;
                        }
                        await api(`riders?id=eq.${editRider.id}`, 'PATCH', updateData);
                        alert('Rider updated successfully!');
                        setEditRider(null);
                        loadData();
                      } catch (e: any) {
                        alert('Error updating rider: ' + e.message);
                      }
                    }} 
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Template Modal */}
        {showWhatsAppModal && activeJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
              <div className="bg-green-500 p-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Notify Customer
                </h3>
                <button onClick={() => setShowWhatsAppModal(false)} className="text-white hover:bg-green-600 p-2 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-4 bg-green-50 border-b">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Sending to:</span> {activeJob.customer_name} ({activeJob.customer_phone})
                </p>
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Current Status:</span> {activeJob.status.replace('-', ' ').toUpperCase()}
                </p>
              </div>

              <div className="overflow-y-auto max-h-[60vh] p-4">
                {/* Status-based Templates */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    📋 Recommended for Current Status
                  </h4>
                  <div className="space-y-2">
                    {(whatsAppTemplates[activeJob.status as keyof typeof whatsAppTemplates] || []).map((template) => (
                      <a
                        key={template.id}
                        href={generateWhatsAppLink(activeJob.customer_phone, formatTemplateMessage(template.message, activeJob, curr?.name))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full p-3 bg-white border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
                      >
                        <p className="font-semibold text-green-700">{template.label}</p>
                        <p className="text-sm text-gray-600 mt-1">{formatTemplateMessage(template.message, activeJob, curr?.name)}</p>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Other Common Templates */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    💬 Other Messages
                  </h4>
                  <div className="space-y-2">
                    {whatsAppTemplates.custom.map((template) => (
                      <a
                        key={template.id}
                        href={generateWhatsAppLink(activeJob.customer_phone, formatTemplateMessage(template.message, activeJob, curr?.name))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                      >
                        <p className="font-semibold text-gray-700">{template.label}</p>
                        <p className="text-sm text-gray-600 mt-1">{formatTemplateMessage(template.message, activeJob, curr?.name)}</p>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Direct Call Option */}
                <div className="mt-6 pt-4 border-t">
                  <a
                    href={`tel:${activeJob.customer_phone}`}
                    className="block w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-center font-semibold"
                  >
                    📞 Call Customer Directly
                  </a>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t">
                <p className="text-xs text-gray-500 text-center">
                  Clicking a message will open WhatsApp with the pre-filled text. You can edit it before sending.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DeliveryPlatform;
