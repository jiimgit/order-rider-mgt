'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package, User, TrendingUp, LogOut, Lock, UserPlus, Edit2, Trash2, CreditCard, QrCode, X, Navigation, AlertCircle, Search, Download, ChevronLeft, ChevronRight, FileText, Calendar, Upload, MapPin, Eye, UserCheck, BarChart3, Clock, CheckCircle, XCircle, Send, Link } from 'lucide-react';

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

  // New Admin Job Management states
  const [showJobImport, setShowJobImport] = useState(false);
  const [showAssignRider, setShowAssignRider] = useState<any>(null);
  const [showJobSummary, setShowJobSummary] = useState(false);
  const [showRiderTracking, setShowRiderTracking] = useState<any>(null);
  const [importedJobs, setImportedJobs] = useState<any[]>([]);
  const [summaryDateFrom, setSummaryDateFrom] = useState('');
  const [summaryDateTo, setSummaryDateTo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live GPS Tracking states
  const [isTrackingGPS, setIsTrackingGPS] = useState(false);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showLiveMap, setShowLiveMap] = useState<any>(null);
  const [riderLocation, setRiderLocation] = useState<any>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Public tracking page states (no login required)
  const [publicTrackingMode, setPublicTrackingMode] = useState(false);
  const [publicTrackingJob, setPublicTrackingJob] = useState<any>(null);
  const [publicRiderLocation, setPublicRiderLocation] = useState<any>(null);
  const [publicTrackingError, setPublicTrackingError] = useState('');
  const publicRefreshIntervalRef = useRef<any>(null);

  // Check URL for tracking parameter on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const trackingId = urlParams.get('track');
      if (trackingId) {
        loadPublicTracking(trackingId);
      }
    }
  }, []);

  // Load public tracking data (no auth required)
  const loadPublicTracking = async (jobId: string) => {
    setPublicTrackingMode(true);
    setLoading(true);
    try {
      // Fetch job details
      const jobData = await api(`jobs?id=eq.${jobId}`);
      if (jobData && jobData.length > 0) {
        setPublicTrackingJob(jobData[0]);
        // Fetch rider location
        await refreshPublicLocation(jobId);
        // Start auto-refresh every 10 seconds
        if (publicRefreshIntervalRef.current) {
          clearInterval(publicRefreshIntervalRef.current);
        }
        publicRefreshIntervalRef.current = setInterval(() => {
          refreshPublicLocation(jobId);
        }, 10000);
      } else {
        setPublicTrackingError('Order not found');
      }
    } catch (e: any) {
      setPublicTrackingError('Error loading tracking data');
      console.error(e);
    }
    setLoading(false);
  };

  // Refresh public rider location
  const refreshPublicLocation = async (jobId: string) => {
    try {
      const locations = await api(`rider_locations?job_id=eq.${jobId}&order=updated_at.desc&limit=1`);
      if (locations && locations.length > 0) {
        setPublicRiderLocation(locations[0]);
      }
    } catch (e: any) {
      console.error('Error fetching location:', e);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (publicRefreshIntervalRef.current) {
        clearInterval(publicRefreshIntervalRef.current);
      }
    };
  }, []);

  // Start GPS tracking for rider
  const startGPSTracking = async (jobId: string, riderId: string) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        
        // Save to database
        try {
          // First, delete old location for this rider/job
          await api(`rider_locations?rider_id=eq.${riderId}&job_id=eq.${jobId}`, 'DELETE');
          
          // Insert new location
          await api('rider_locations', 'POST', {
            rider_id: riderId,
            job_id: jobId,
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            updated_at: new Date().toISOString()
          });
          console.log('Location updated:', latitude, longitude);
        } catch (e: any) {
          console.error('Error saving location:', e);
        }
      },
      (error) => {
        console.error('GPS Error:', error);
        alert('Unable to get your location. Please enable GPS and try again.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    setGpsWatchId(watchId);
    setIsTrackingGPS(true);
    alert('GPS tracking started! Your location is now being shared.');
  };

  // Stop GPS tracking
  const stopGPSTracking = () => {
    if (gpsWatchId !== null) {
      navigator.geolocation.clearWatch(gpsWatchId);
      setGpsWatchId(null);
    }
    setIsTrackingGPS(false);
    setCurrentLocation(null);
    alert('GPS tracking stopped.');
  };

  // Fetch rider's current location for admin/customer view
  const fetchRiderLocation = async (jobId: string) => {
    try {
      const locations = await api(`rider_locations?job_id=eq.${jobId}&order=updated_at.desc&limit=1`);
      if (locations && locations.length > 0) {
        setRiderLocation(locations[0]);
        return locations[0];
      }
      return null;
    } catch (e: any) {
      console.error('Error fetching rider location:', e);
      return null;
    }
  };

  // Generate shareable live tracking URL
  const generateLiveTrackingUrl = (job: any): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}?track=${job.id}`;
  };

  // Copy live tracking link
  const copyLiveTrackingLink = (job: any) => {
    const url = generateLiveTrackingUrl(job);
    const message = `🚚 *Live Delivery Tracking*

Track your delivery in real-time:
${url}

📦 *Order Details:*
• From: ${job.pickup}
• To: ${job.delivery}
• Rider: ${job.rider_name || 'Assigning...'}
• Status: ${job.status.toUpperCase()}

Thank you for your order!`;

    navigator.clipboard.writeText(message).then(() => {
      alert('Live tracking link copied to clipboard!');
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Live tracking link copied to clipboard!');
    });
  };

  // Download Excel/CSV Template with sample data
  const downloadJobTemplate = () => {
    // Template with headers and sample data
    const template = [
      ['customer_name', 'customer_phone', 'pickup', 'delivery', 'timeframe', 'price', 'notes'],
      ['John Doe', '91234567', '123 Orchard Road #01-01 Singapore 238858', '456 Marina Bay Sands Singapore 018956', 'same-day', '15', 'Handle with care'],
      ['Jane Smith', '98765432', '789 Bugis Street Singapore 188067', '321 Tampines Ave 5 #02-15 Singapore 529651', 'next-day', '12', 'Call before delivery'],
      ['Michael Tan', '87654321', 'Block 123 Jurong West St 21 Singapore 640123', '1 Raffles Place #10-01 Singapore 048616', 'same-day', '18', ''],
      ['Sarah Lee', '96543210', '50 Serangoon North Ave 4 Singapore 555856', '100 Orchard Road Singapore 238840', 'express', '25', 'Fragile items'],
      ['David Wong', '81234567', 'ION Orchard 2 Orchard Turn Singapore 238801', '313 Somerset Singapore 238895', 'same-day', '10', ''],
      ['', '', '', '', '', '', ''],
      ['DELETE THE SAMPLE ROWS ABOVE AND ADD YOUR OWN DATA', '', '', '', '', '', ''],
    ];
    
    // Properly escape CSV values
    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    
    const csvContent = template.map(row => row.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'job_import_template.csv';
    link.click();
  };

  // Parse CSV file
  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g, '_'));
    const data: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 4) {
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        row.price = parseFloat(row.price) || 10;
        row.timeframe = row.timeframe || 'same-day';
        row.status = 'posted';
        data.push(row);
      }
    }
    return data;
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setImportedJobs(parsed);
    };
    reader.readAsText(file);
  };

  // Import jobs to database
  const importJobsToDatabase = async () => {
    if (importedJobs.length === 0) {
      alert('No jobs to import');
      return;
    }
    
    try {
      let successCount = 0;
      for (const job of importedJobs) {
        await api('jobs', 'POST', {
          customer_name: job.customer_name,
          customer_phone: job.customer_phone,
          pickup: job.pickup,
          delivery: job.delivery,
          timeframe: job.timeframe,
          price: job.price,
          status: 'posted',
          notes: job.notes || ''
        });
        successCount++;
      }
      alert(`Successfully imported ${successCount} jobs!`);
      setImportedJobs([]);
      setShowJobImport(false);
      loadData();
    } catch (e: any) {
      alert('Error importing jobs: ' + e.message);
    }
  };

  // Assign rider to job
  const assignRiderToJob = async (jobId: string, riderId: string, riderName: string, riderPhone: string) => {
    try {
      await api(`jobs?id=eq.${jobId}`, 'PATCH', {
        rider_id: riderId,
        rider_name: riderName,
        rider_phone: riderPhone,
        status: 'accepted',
        accepted_at: new Date().toISOString()
      });
      alert('Rider assigned successfully!');
      setShowAssignRider(null);
      loadData();
    } catch (e: any) {
      alert('Error assigning rider: ' + e.message);
    }
  };

  // Generate tracking link (Google Maps route)
  const generateTrackingLink = (job: any): string => {
    return `https://www.google.com/maps/dir/${encodeURIComponent(job.pickup)}/${encodeURIComponent(job.delivery)}`;
  };

  // Generate full tracking message for sharing
  const generateFullTrackingMessage = (job: any): string => {
    const trackingUrl = generateTrackingLink(job);
    const statusEmoji = job.status === 'completed' ? '✅' : job.status === 'on-the-way' ? '🚗' : job.status === 'picked-up' ? '📦' : job.status === 'accepted' ? '👍' : '📋';
    
    return `🚚 *Delivery Tracking*

${statusEmoji} *Status:* ${job.status.toUpperCase().replace('-', ' ')}

📦 *Order Details:*
• From: ${job.pickup}
• To: ${job.delivery}
• Customer: ${job.customer_name}
${job.rider_name ? `• Rider: ${job.rider_name}` : '• Rider: Assigning...'}
${job.rider_phone ? `• Rider Phone: ${job.rider_phone}` : ''}

📍 *Track Route:*
${trackingUrl}

Thank you for using our delivery service!`;
  };

  // Copy tracking link to clipboard
  const copyTrackingLink = (job: any) => {
    const message = generateFullTrackingMessage(job);
    navigator.clipboard.writeText(message).then(() => {
      alert('Tracking information copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Tracking information copied to clipboard!');
    });
  };

  // Generate WhatsApp tracking message
  const generateTrackingWhatsApp = (job: any, customerPhone: string): string => {
    const trackingUrl = generateTrackingLink(job);
    const message = `🚚 *Delivery Update*\n\nHi! Here's your delivery tracking information:\n\n📦 *Order Details:*\n• From: ${job.pickup}\n• To: ${job.delivery}\n• Rider: ${job.rider_name || 'Assigning...'}\n• Status: ${job.status.toUpperCase()}\n\n📍 *Track Route:*\n${trackingUrl}\n\nThank you for your order!`;
    
    let cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('8') || cleanPhone.startsWith('9')) {
      cleanPhone = '65' + cleanPhone;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Generate WhatsApp with LIVE tracking URL
  const generateLiveTrackingWhatsApp = (job: any, customerPhone: string): string => {
    const liveTrackingUrl = generateLiveTrackingUrl(job);
    const statusEmoji = job.status === 'completed' ? '✅' : job.status === 'on-the-way' ? '🚗' : job.status === 'picked-up' ? '📦' : job.status === 'accepted' ? '👍' : '📋';
    
    const message = `🚚 *Live Delivery Tracking*

Hi! Track your delivery in real-time:

📍 *LIVE TRACKING LINK:*
${liveTrackingUrl}

${statusEmoji} *Status:* ${job.status.toUpperCase().replace('-', ' ')}

📦 *Order Details:*
• From: ${job.pickup}
• To: ${job.delivery}
${job.rider_name ? `• Rider: ${job.rider_name}` : ''}
${job.rider_phone ? `• Rider Phone: ${job.rider_phone}` : ''}

Click the link above to see your rider's live location on the map!

Thank you for your order! 🙏`;
    
    let cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('8') || cleanPhone.startsWith('9')) {
      cleanPhone = '65' + cleanPhone;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Job Summary calculations
  const jobSummaryData = useMemo(() => {
    let filtered = jobs;
    
    if (summaryDateFrom) {
      filtered = filtered.filter((j: any) => new Date(j.created_at) >= new Date(summaryDateFrom));
    }
    if (summaryDateTo) {
      const toDate = new Date(summaryDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((j: any) => new Date(j.created_at) <= toDate);
    }
    
    const totalJobs = filtered.length;
    const completedJobs = filtered.filter((j: any) => j.status === 'completed').length;
    const pendingJobs = filtered.filter((j: any) => ['posted', 'accepted', 'picked-up', 'on-the-way'].includes(j.status)).length;
    const cancelledJobs = filtered.filter((j: any) => j.status === 'cancelled').length;
    const totalRevenue = filtered.reduce((sum: number, j: any) => sum + (parseFloat(j.price) || 0), 0);
    const completedRevenue = filtered.filter((j: any) => j.status === 'completed').reduce((sum: number, j: any) => sum + (parseFloat(j.price) || 0), 0);
    
    // Group by rider
    const riderStats: any = {};
    filtered.forEach((j: any) => {
      if (j.rider_name) {
        if (!riderStats[j.rider_name]) {
          riderStats[j.rider_name] = { name: j.rider_name, jobs: 0, completed: 0, revenue: 0 };
        }
        riderStats[j.rider_name].jobs++;
        if (j.status === 'completed') {
          riderStats[j.rider_name].completed++;
          riderStats[j.rider_name].revenue += parseFloat(j.price) || 0;
        }
      }
    });
    
    // Group by date
    const dailyStats: any = {};
    filtered.forEach((j: any) => {
      const date = new Date(j.created_at).toLocaleDateString();
      if (!dailyStats[date]) {
        dailyStats[date] = { date, jobs: 0, revenue: 0 };
      }
      dailyStats[date].jobs++;
      dailyStats[date].revenue += parseFloat(j.price) || 0;
    });
    
    return {
      totalJobs,
      completedJobs,
      pendingJobs,
      cancelledJobs,
      totalRevenue,
      completedRevenue,
      riderStats: Object.values(riderStats),
      dailyStats: Object.values(dailyStats),
      filteredJobs: filtered
    };
  }, [jobs, summaryDateFrom, summaryDateTo]);

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
        <p className="text-xl font-semibold">{publicTrackingMode ? 'Loading tracking...' : 'Loading platform...'}</p>
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

  // PUBLIC TRACKING PAGE - No login required
  if (publicTrackingMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">🚚 Live Delivery Tracking</h1>
            <p className="text-white opacity-90">Track your delivery in real-time</p>
          </div>

          {publicTrackingError ? (
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <XCircle className="text-red-500 mx-auto mb-4" size={64} />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Tracking Not Available</h2>
              <p className="text-gray-600">{publicTrackingError}</p>
              <button
                onClick={() => window.location.href = window.location.origin}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Homepage
              </button>
            </div>
          ) : publicTrackingJob ? (
            <div className="space-y-4">
              {/* Order Status Card */}
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Order Status</h2>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    publicTrackingJob.status === 'completed' ? 'bg-green-100 text-green-700' :
                    publicTrackingJob.status === 'on-the-way' ? 'bg-blue-100 text-blue-700' :
                    publicTrackingJob.status === 'picked-up' ? 'bg-yellow-100 text-yellow-700' :
                    publicTrackingJob.status === 'accepted' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {publicTrackingJob.status === 'on-the-way' ? '🚗 ON THE WAY' :
                     publicTrackingJob.status === 'picked-up' ? '📦 PICKED UP' :
                     publicTrackingJob.status === 'accepted' ? '✅ ACCEPTED' :
                     publicTrackingJob.status === 'completed' ? '🎉 DELIVERED' :
                     publicTrackingJob.status.toUpperCase()}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    {['Posted', 'Accepted', 'Picked Up', 'On The Way', 'Delivered'].map((step, idx) => {
                      const statusOrder = ['posted', 'accepted', 'picked-up', 'on-the-way', 'completed'];
                      const currentIdx = statusOrder.indexOf(publicTrackingJob.status);
                      const isActive = idx <= currentIdx;
                      return (
                        <div key={step} className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {isActive ? '✓' : idx + 1}
                          </div>
                          <span className="text-xs mt-1 text-gray-600 hidden sm:block">{step}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ 
                        width: `${
                          publicTrackingJob.status === 'completed' ? 100 :
                          publicTrackingJob.status === 'on-the-way' ? 75 :
                          publicTrackingJob.status === 'picked-up' ? 50 :
                          publicTrackingJob.status === 'accepted' ? 25 : 0
                        }%` 
                      }}
                    />
                  </div>
                </div>

                {/* Order Details */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <MapPin className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">PICKUP</p>
                      <p className="font-semibold text-gray-800">{publicTrackingJob.pickup}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-red-100 p-2 rounded-full">
                      <MapPin className="text-red-600" size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">DELIVERY</p>
                      <p className="font-semibold text-gray-800">{publicTrackingJob.delivery}</p>
                    </div>
                  </div>
                  {publicTrackingJob.rider_name && (
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <User className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">YOUR RIDER</p>
                        <p className="font-semibold text-gray-800">{publicTrackingJob.rider_name}</p>
                        {publicTrackingJob.rider_phone && (
                          <a href={`tel:${publicTrackingJob.rider_phone}`} className="text-blue-600 text-sm">
                            📞 {publicTrackingJob.rider_phone}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Map Card */}
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <MapPin className="text-orange-500" />
                    Live Location
                  </h2>
                  {publicRiderLocation && (
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      <span className="text-xs text-green-600 font-medium">LIVE</span>
                    </div>
                  )}
                </div>

                {/* Map */}
                <div className="relative" style={{ height: '300px' }}>
                  {publicRiderLocation ? (
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${publicRiderLocation.longitude - 0.008}%2C${publicRiderLocation.latitude - 0.008}%2C${publicRiderLocation.longitude + 0.008}%2C${publicRiderLocation.latitude + 0.008}&layer=mapnik&marker=${publicRiderLocation.latitude}%2C${publicRiderLocation.longitude}`}
                      style={{ border: 0 }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <MapPin className="text-gray-300 mx-auto mb-2" size={48} />
                        <p className="text-gray-500">Waiting for rider location...</p>
                        <p className="text-xs text-gray-400 mt-1">Location will appear when rider starts GPS</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Location Info */}
                <div className="p-4 bg-gray-50 border-t">
                  {publicRiderLocation ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Last updated</p>
                        <p className="font-semibold text-gray-700">
                          {new Date(publicRiderLocation.updated_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => refreshPublicLocation(publicTrackingJob.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        🔄 Refresh
                      </button>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-gray-500">
                      Auto-refreshing every 10 seconds...
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {publicRiderLocation && (
                <div className="grid grid-cols-2 gap-4">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${publicRiderLocation.latitude}&mlon=${publicRiderLocation.longitude}#map=17/${publicRiderLocation.latitude}/${publicRiderLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white p-4 rounded-xl shadow-lg text-center hover:bg-gray-50"
                  >
                    <Eye className="text-blue-600 mx-auto mb-2" size={24} />
                    <p className="font-semibold text-gray-800">Open Full Map</p>
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${publicRiderLocation.latitude},${publicRiderLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white p-4 rounded-xl shadow-lg text-center hover:bg-gray-50"
                  >
                    <Navigation className="text-green-600 mx-auto mb-2" size={24} />
                    <p className="font-semibold text-gray-800">Get Directions</p>
                  </a>
                </div>
              )}

              {/* Footer */}
              <p className="text-center text-white text-sm opacity-75">
                Powered by The Food Thinker Pte Ltd
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (!auth.isAuth) {
    if (view === 'select') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-white mb-4">MoveIt</h1>
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

                {/* GPS Live Tracking Button */}
                <div className="mb-4">
                  {!isTrackingGPS ? (
                    <button 
                      onClick={() => startGPSTracking(activeJob.id, auth.id as string)} 
                      className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <MapPin size={20} />
                      📍 Start Live GPS Tracking
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                          <span className="text-green-800 font-semibold">GPS Tracking Active</span>
                        </div>
                        {currentLocation && (
                          <span className="text-xs text-green-600">
                            {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={stopGPSTracking} 
                        className="w-full bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle size={18} />
                        Stop GPS Tracking
                      </button>
                    </div>
                  )}
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
                      onClick={() => setShowJobSummary(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium"
                    >
                      <BarChart3 size={16} /> Summary
                    </button>
                    <button 
                      onClick={() => setShowJobImport(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
                    >
                      <Upload size={16} /> Import Jobs
                    </button>
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
                            <p className="text-sm text-gray-600">
                              Customer: {j.customer_name} {j.customer_phone && `(${j.customer_phone})`}
                            </p>
                            <p className="text-sm text-gray-600">
                              Rider: {j.rider_name ? (
                                <span className="text-green-600 font-medium">{j.rider_name}</span>
                              ) : (
                                <span className="text-orange-500">Unassigned</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600">
                              Price: <span className="font-medium">${j.price}</span> | 
                              Status: <span className={`font-medium ${j.status === 'completed' ? 'text-green-600' : j.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'}`}>{j.status}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Created: {new Date(j.created_at).toLocaleString()}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {/* Assign Rider Button */}
                            {!j.rider_id && j.status === 'posted' && (
                              <button 
                                onClick={() => setShowAssignRider(j)}
                                className="p-2 bg-blue-100 rounded hover:bg-blue-200 flex items-center gap-1 text-xs text-blue-700" 
                                title="Assign Rider"
                              >
                                <UserCheck size={16} /> Assign
                              </button>
                            )}
                            {/* Live Map Button - Shows for jobs with rider assigned */}
                            {j.rider_id && j.status !== 'completed' && j.status !== 'cancelled' && (
                              <button 
                                onClick={() => setShowLiveMap(j)}
                                className="p-2 bg-orange-100 rounded hover:bg-orange-200 flex items-center gap-1 text-xs text-orange-700" 
                                title="View Live Location"
                              >
                                <Eye size={16} /> Live Map
                              </button>
                            )}
                            {/* Copy Live Tracking Link - Always visible */}
                            <button 
                              onClick={() => copyLiveTrackingLink(j)}
                              className="p-2 bg-indigo-100 rounded hover:bg-indigo-200 flex items-center gap-1 text-xs text-indigo-700" 
                              title="Copy Live Tracking Link"
                            >
                              <MapPin size={16} /> Live Link
                            </button>
                            {/* Send WhatsApp with LIVE Tracking URL */}
                            {j.customer_phone && (
                              <a 
                                href={generateLiveTrackingWhatsApp(j, j.customer_phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1 text-xs" 
                                title="Send Live Tracking via WhatsApp"
                              >
                                <Send size={16} /> WhatsApp
                              </a>
                            )}
                            {/* Delete Button */}
                            <button 
                              onClick={async () => { if (window.confirm('Delete job?')) { await api(`jobs?id=eq.${j.id}`, 'DELETE'); loadData(); }}} 
                              className="p-2 bg-red-100 rounded hover:bg-red-200" 
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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

        {/* Job Import Modal */}
        {showJobImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Import Jobs</h3>
                <button onClick={() => { setShowJobImport(false); setImportedJobs([]); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              {/* Step 1: Download Template */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                  Download Template
                </h4>
                <p className="text-sm text-blue-700 mb-4">Download the CSV template below. It contains column headers and sample data to guide you.</p>
                
                {/* Template Preview Table */}
                <div className="bg-white rounded-lg border overflow-x-auto mb-4">
                  <table className="w-full text-xs">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="p-2 text-left font-semibold text-blue-800">customer_name</th>
                        <th className="p-2 text-left font-semibold text-blue-800">customer_phone</th>
                        <th className="p-2 text-left font-semibold text-blue-800">pickup</th>
                        <th className="p-2 text-left font-semibold text-blue-800">delivery</th>
                        <th className="p-2 text-left font-semibold text-blue-800">timeframe</th>
                        <th className="p-2 text-left font-semibold text-blue-800">price</th>
                        <th className="p-2 text-left font-semibold text-blue-800">notes</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-t">
                        <td className="p-2">John Doe</td>
                        <td className="p-2">91234567</td>
                        <td className="p-2">123 Orchard Rd</td>
                        <td className="p-2">456 Marina Bay</td>
                        <td className="p-2">same-day</td>
                        <td className="p-2">15</td>
                        <td className="p-2">Handle with care</td>
                      </tr>
                      <tr className="border-t bg-gray-50">
                        <td className="p-2">Jane Smith</td>
                        <td className="p-2">98765432</td>
                        <td className="p-2">789 Bugis St</td>
                        <td className="p-2">321 Tampines Ave</td>
                        <td className="p-2">next-day</td>
                        <td className="p-2">12</td>
                        <td className="p-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <button 
                  onClick={downloadJobTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Download size={18} /> Download Template (CSV)
                </button>
              </div>

              {/* Column Descriptions */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-800 mb-3">Column Descriptions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Required</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">customer_name</code>
                      <p className="text-gray-500 text-xs">Customer's full name</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Required</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">customer_phone</code>
                      <p className="text-gray-500 text-xs">Phone number (e.g., 91234567)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Required</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">pickup</code>
                      <p className="text-gray-500 text-xs">Pickup address</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Required</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">delivery</code>
                      <p className="text-gray-500 text-xs">Delivery address</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">Optional</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">timeframe</code>
                      <p className="text-gray-500 text-xs">same-day, next-day, or express</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">Optional</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">price</code>
                      <p className="text-gray-500 text-xs">Delivery price (default: $10)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 md:col-span-2">
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">Optional</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">notes</code>
                      <p className="text-gray-500 text-xs">Special instructions or notes</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Upload File */}
              <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                  Upload Your File
                </h4>
                <p className="text-sm text-green-700 mb-3">After filling in the template, upload your CSV file here.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 file:cursor-pointer"
                />
              </div>

              {/* Preview Imported Jobs */}
              {importedJobs.length > 0 && (
                <div className="mb-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                    Preview & Import ({importedJobs.length} jobs)
                  </h4>
                  <div className="max-h-60 overflow-y-auto border rounded-lg bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-purple-100 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium">#</th>
                          <th className="text-left p-2 font-medium">Customer</th>
                          <th className="text-left p-2 font-medium">Phone</th>
                          <th className="text-left p-2 font-medium">Pickup</th>
                          <th className="text-left p-2 font-medium">Delivery</th>
                          <th className="text-left p-2 font-medium">Price</th>
                          <th className="text-left p-2 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedJobs.map((job, idx) => (
                          <tr key={idx} className="border-t hover:bg-purple-50">
                            <td className="p-2 text-gray-500">{idx + 1}</td>
                            <td className="p-2 font-medium">{job.customer_name}</td>
                            <td className="p-2">{job.customer_phone}</td>
                            <td className="p-2 text-xs">{job.pickup}</td>
                            <td className="p-2 text-xs">{job.delivery}</td>
                            <td className="p-2 font-medium text-green-600">${job.price}</td>
                            <td className="p-2 text-xs text-gray-500">{job.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button 
                    onClick={importJobsToDatabase}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-lg"
                  >
                    <Upload size={20} /> Import {importedJobs.length} Jobs to Database
                  </button>
                </div>
              )}

              {/* Tips */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 Tips</h4>
                <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Save your Excel file as CSV (Comma delimited) format</li>
                  <li>Make sure the first row contains the column headers</li>
                  <li>Phone numbers should be 8 digits without country code</li>
                  <li>Delete the sample data rows before adding your own data</li>
                  <li>Leave optional fields empty if not needed</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Assign Rider Modal */}
        {showAssignRider && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Assign Rider</h3>
                <button onClick={() => setShowAssignRider(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-900">{showAssignRider.pickup} → {showAssignRider.delivery}</p>
                <p className="text-sm text-blue-700">Customer: {showAssignRider.customer_name}</p>
                <p className="text-sm text-blue-700">Price: ${showAssignRider.price}</p>
              </div>

              <h4 className="font-semibold text-gray-700 mb-3">Select a Rider:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {riders.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No riders available</p>
                ) : (
                  riders.map((r: any) => (
                    <button
                      key={r.id}
                      onClick={() => assignRiderToJob(showAssignRider.id, r.id, r.name, r.phone)}
                      className="w-full p-3 border rounded-lg hover:border-green-500 hover:bg-green-50 text-left transition-colors"
                    >
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-sm text-gray-600">{r.phone} | Tier {r.tier} | {r.completed_jobs || 0} jobs completed</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rider Tracking Modal */}
        {showRiderTracking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Track & Notify</h3>
                <button onClick={() => setShowRiderTracking(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4 p-4 bg-green-50 rounded-lg">
                <p className="font-semibold text-green-900">{showRiderTracking.pickup} → {showRiderTracking.delivery}</p>
                <p className="text-sm text-green-700">Rider: {showRiderTracking.rider_name}</p>
                <p className="text-sm text-green-700">Status: {showRiderTracking.status}</p>
              </div>

              {/* View Route on Map */}
              <a
                href={generateTrackingLink(showRiderTracking)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center font-semibold mb-3"
              >
                <MapPin className="inline mr-2" size={18} />
                View Route on Google Maps
              </a>

              {/* Send Tracking to Customer via WhatsApp */}
              {showRiderTracking.customer_phone && (
                <a
                  href={generateTrackingWhatsApp(showRiderTracking, showRiderTracking.customer_phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-center font-semibold mb-3"
                >
                  <Send className="inline mr-2" size={18} />
                  Send Tracking to Customer (WhatsApp)
                </a>
              )}

              {/* Rider Contact */}
              {showRiderTracking.rider_phone && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Contact Rider:</p>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${showRiderTracking.rider_phone}`}
                      className="flex-1 p-2 bg-blue-100 text-blue-700 rounded-lg text-center font-medium hover:bg-blue-200"
                    >
                      📞 Call
                    </a>
                    <a
                      href={`https://wa.me/65${showRiderTracking.rider_phone.replace(/\D/g, '')}?text=Hi ${showRiderTracking.rider_name}, checking on the delivery status for order to ${showRiderTracking.delivery}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 p-2 bg-green-100 text-green-700 rounded-lg text-center font-medium hover:bg-green-200"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Job Summary Modal */}
        {showJobSummary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Orders Summary</h3>
                <button onClick={() => setShowJobSummary(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              {/* Date Filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={summaryDateFrom}
                    onChange={(e) => setSummaryDateFrom(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={summaryDateTo}
                    onChange={(e) => setSummaryDateTo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => { setSummaryDateFrom(''); setSummaryDateTo(''); }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => exportToCSV(jobSummaryData.filteredJobs, 'orders_summary', ['Customer_name', 'Rider_name', 'Pickup', 'Delivery', 'Price', 'Status', 'Created_at'])}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Download size={16} /> Export
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="text-blue-600" size={20} />
                    <span className="text-sm text-blue-700">Total Orders</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-900">{jobSummaryData.totalJobs}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <span className="text-sm text-green-700">Completed</span>
                  </div>
                  <p className="text-3xl font-bold text-green-900">{jobSummaryData.completedJobs}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="text-yellow-600" size={20} />
                    <span className="text-sm text-yellow-700">Pending</span>
                  </div>
                  <p className="text-3xl font-bold text-yellow-900">{jobSummaryData.pendingJobs}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="text-red-600" size={20} />
                    <span className="text-sm text-red-700">Cancelled</span>
                  </div>
                  <p className="text-3xl font-bold text-red-900">{jobSummaryData.cancelledJobs}</p>
                </div>
              </div>

              {/* Revenue Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-700 mb-1">Total Revenue (All Orders)</p>
                  <p className="text-3xl font-bold text-purple-900">${jobSummaryData.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700 mb-1">Completed Revenue</p>
                  <p className="text-3xl font-bold text-green-900">${jobSummaryData.completedRevenue.toFixed(2)}</p>
                </div>
              </div>

              {/* Rider Performance */}
              {jobSummaryData.riderStats.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3">Rider Performance</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left p-3">Rider</th>
                          <th className="text-center p-3">Total Jobs</th>
                          <th className="text-center p-3">Completed</th>
                          <th className="text-right p-3">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobSummaryData.riderStats.map((rider: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="p-3 font-medium">{rider.name}</td>
                            <td className="p-3 text-center">{rider.jobs}</td>
                            <td className="p-3 text-center text-green-600">{rider.completed}</td>
                            <td className="p-3 text-right font-medium">${rider.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Daily Stats */}
              {jobSummaryData.dailyStats.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Daily Breakdown</h4>
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="text-left p-3">Date</th>
                          <th className="text-center p-3">Orders</th>
                          <th className="text-right p-3">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobSummaryData.dailyStats.map((day: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="p-3">{day.date}</td>
                            <td className="p-3 text-center">{day.jobs}</td>
                            <td className="p-3 text-right font-medium">${day.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
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

        {/* Live Map Modal with OpenStreetMap */}
        {showLiveMap && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <MapPin className="text-orange-600" />
                  Live Tracking - {showLiveMap.rider_name || 'Rider'}
                </h3>
                <button onClick={() => { setShowLiveMap(null); setRiderLocation(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-900">{showLiveMap.pickup} → {showLiveMap.delivery}</p>
                <p className="text-sm text-blue-700">Customer: {showLiveMap.customer_name} | Status: {showLiveMap.status}</p>
              </div>

              {/* Map Container */}
              <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '400px' }}>
                <iframe
                  id="live-map-frame"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  src={riderLocation 
                    ? `https://www.openstreetmap.org/export/embed.html?bbox=${riderLocation.longitude - 0.01}%2C${riderLocation.latitude - 0.01}%2C${riderLocation.longitude + 0.01}%2C${riderLocation.latitude + 0.01}&layer=mapnik&marker=${riderLocation.latitude}%2C${riderLocation.longitude}`
                    : `https://www.openstreetmap.org/export/embed.html?bbox=103.6%2C1.2%2C104.0%2C1.5&layer=mapnik`
                  }
                  style={{ border: 0 }}
                ></iframe>
                
                {/* Location Info Overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-95 rounded-lg p-3 shadow-lg">
                  {riderLocation ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                          <span className="font-semibold text-green-700">Rider Location Active</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Lat: {riderLocation.latitude?.toFixed(6)} | Lng: {riderLocation.longitude?.toFixed(6)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Last updated: {new Date(riderLocation.updated_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const loc = await fetchRiderLocation(showLiveMap.id);
                          if (!loc) alert('No location data available. Rider may not have started GPS tracking.');
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        Refresh
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-600 mb-2">Loading rider location...</p>
                      <button
                        onClick={async () => {
                          const loc = await fetchRiderLocation(showLiveMap.id);
                          if (!loc) alert('No location data available. Rider may not have started GPS tracking.');
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        Load Location
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <a
                  href={riderLocation 
                    ? `https://www.openstreetmap.org/?mlat=${riderLocation.latitude}&mlon=${riderLocation.longitude}#map=16/${riderLocation.latitude}/${riderLocation.longitude}`
                    : `https://www.openstreetmap.org/#map=12/1.3521/103.8198`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-blue-600 text-white rounded-lg text-center font-semibold hover:bg-blue-700"
                >
                  Open Full Map
                </a>
                <button
                  onClick={() => copyLiveTrackingLink(showLiveMap)}
                  className="p-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <Link size={18} /> Copy Tracking Link
                </button>
              </div>

              {/* Auto-refresh note */}
              <p className="text-xs text-gray-400 text-center mt-3">
                Click "Refresh" to get the latest rider location. Rider must have GPS tracking enabled.
              </p>
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
