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
  const remaining = deliveryFee - platformFee;
  
  // New formula: 50% to rider, 50% split among uplines (max $2 each)
  const riderShare = remaining / 2;
  const uplinePool = remaining / 2;
  
  let commissions: any = { 
    platform: platformFee, 
    activeRider: riderShare, 
    uplines: [],
    companyExtra: 0 // Any excess goes to company
  };
  
  if (uplineChain.length === 0) {
    // No uplines - rider gets everything after platform fee
    commissions.activeRider = remaining;
  } else {
    // Calculate upline share - max $2 each, divided equally
    const maxPerUpline = 2;
    const totalMaxUpline = uplineChain.length * maxPerUpline;
    
    if (uplinePool >= totalMaxUpline) {
      // Enough for $2 each - give $2 to each upline, rest to rider
      uplineChain.forEach((upline: any) => {
        commissions.uplines.push({ 
          riderId: upline.id, 
          riderName: upline.name, 
          tier: upline.tier, 
          amount: maxPerUpline 
        });
      });
      // Rider gets their 50% plus any unclaimed from upline pool
      commissions.activeRider = riderShare + (uplinePool - totalMaxUpline);
    } else {
      // Not enough for $2 each - split equally among uplines
      const perUpline = uplinePool / uplineChain.length;
      uplineChain.forEach((upline: any) => {
        commissions.uplines.push({ 
          riderId: upline.id, 
          riderName: upline.name, 
          tier: upline.tier, 
          amount: parseFloat(perUpline.toFixed(2))
        });
      });
      // Handle rounding - any remainder goes to company
      const totalUplinePaid = commissions.uplines.reduce((sum: number, u: any) => sum + u.amount, 0);
      commissions.companyExtra = parseFloat((uplinePool - totalUplinePaid).toFixed(2));
    }
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
  const [jobForm, setJobForm] = useState({ 
    pickup: '', 
    pickupContact: '',
    pickupPhone: '',
    stops: [{ address: '', recipientName: '', recipientPhone: '' }], // Multi-stop support
    timeframe: '', 
    price: '10',
    parcelSize: 'small',
    remarks: ''
  });
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

  // POD (Proof of Delivery) states
  const [podImage, setPodImage] = useState<string | null>(null);
  const [showPodModal, setShowPodModal] = useState(false);
  const podInputRef = useRef<HTMLInputElement>(null);

  // Multi-job support states
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Rider navigation history for back button
  const [riderViewHistory, setRiderViewHistory] = useState<string[]>(['home']);
  const [currentRiderView, setCurrentRiderView] = useState('home');

  // Admin dashboard stats
  const [dashboardStats, setDashboardStats] = useState({
    totalOrdersToday: 0,
    pendingOrders: 0,
    assignedOrders: 0,
    outForDelivery: 0,
    deliveredToday: 0,
    activeRiders: 0,
    totalRevenueToday: 0,
    adminEarningsToday: 0,
    riderEarningsToday: 0
  });

  // Rider Performance Page states (Feature 9)
  const [showRiderPerformance, setShowRiderPerformance] = useState(false);

  // Customer Profile & Order History states (Feature 6 & 7)
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '' });
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);

  // GPS Enforcement state (Feature 11)
  const [gpsPermissionGranted, setGpsPermissionGranted] = useState<boolean | null>(null);
  const [showGpsWarning, setShowGpsWarning] = useState(false);

  // Admin POD Management states (Feature 13)
  const [showPodManagement, setShowPodManagement] = useState(false);
  const [selectedPodJob, setSelectedPodJob] = useState<any>(null);

  // Job filter states for rider (Feature 10)
  const [riderJobFilter, setRiderJobFilter] = useState({ pickup: '', dropoff: '', customer: '' });

  // Referral Tree View states (Feature 12)
  const [showReferralTree, setShowReferralTree] = useState(false);
  const [selectedRiderForTree, setSelectedRiderForTree] = useState<any>(null);

  // Reports & Analytics states (Feature 14)
  const [showReports, setShowReports] = useState(false);
  const [reportType, setReportType] = useState<'financial' | 'operational' | 'rider'>('financial');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

  // Audit Logs states (Feature 15)
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLogFilter, setAuditLogFilter] = useState({ action: '', user: '' });

  // Route Optimization states (Feature 8)
  const [showRouteOptimization, setShowRouteOptimization] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<any[]>([]);

  // Rider Profile & Delivery History states
  const [showRiderProfile, setShowRiderProfile] = useState(false);
  const [showDeliveryHistory, setShowDeliveryHistory] = useState(false);

  // Customer Order History Page state
  const [showOrderHistory, setShowOrderHistory] = useState(false);

  // Customer Bulk Import state
  const [showCustomerBulkImport, setShowCustomerBulkImport] = useState(false);
  const [customerImportedJobs, setCustomerImportedJobs] = useState<any[]>([]);
  const customerFileInputRef = useRef<HTMLInputElement>(null);

  // Admin - Rider Level Management state
  const [showRiderLevelManager, setShowRiderLevelManager] = useState(false);
  const [editingRiderLevel, setEditingRiderLevel] = useState<any>(null);

  // Admin - Commission Configuration state
  const [showCommissionConfig, setShowCommissionConfig] = useState(false);
  const [commissionSettings, setCommissionSettings] = useState({
    platformFee: 1,
    tier1Earnings: 'remaining',
    tier2Override: 2,
    tier3Override: 2,
    tier4PlusRiderPercent: 50
  });

  // Admin - Create Order for Customer state
  const [showAdminCreateOrder, setShowAdminCreateOrder] = useState(false);
  const [adminOrderForm, setAdminOrderForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    pickup: '',
    delivery: '',
    price: '10',
    timeframe: 'same-day',
    parcelSize: 'small',
    remarks: ''
  });

  // Admin - Live Map View state
  const [showLiveMapView, setShowLiveMapView] = useState(false);
  const [allRiderLocations, setAllRiderLocations] = useState<any[]>([]);

  // Admin - Promotions state
  const [showPromotions, setShowPromotions] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [newPromotion, setNewPromotion] = useState({
    code: '',
    discountType: 'fixed',
    discountValue: 5,
    minOrder: 0,
    maxUses: 100,
    expiryDate: ''
  });

  // Admin - Broadcast Messages state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState({
    target: 'all_riders',
    subject: '',
    message: ''
  });

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
      
      // Check for persistent login (Feature 1)
      const savedAuth = localStorage.getItem('moveit_auth');
      if (savedAuth) {
        try {
          const parsedAuth = JSON.parse(savedAuth);
          if (parsedAuth.isAuth && parsedAuth.id) {
            setAuth(parsedAuth);
            setView(parsedAuth.type);
          }
        } catch (e) {
          console.error('Error parsing saved auth:', e);
          localStorage.removeItem('moveit_auth');
        }
      }
    }
  }, []);

  // GPS Permission Check for Riders (Feature 11)
  useEffect(() => {
    if (auth.type === 'rider' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          setGpsPermissionGranted(true);
        } else if (result.state === 'denied') {
          setGpsPermissionGranted(false);
          setShowGpsWarning(true);
        } else {
          // Prompt for permission
          navigator.geolocation.getCurrentPosition(
            () => {
              setGpsPermissionGranted(true);
              setShowGpsWarning(false);
            },
            () => {
              setGpsPermissionGranted(false);
              setShowGpsWarning(true);
            }
          );
        }
        
        // Listen for permission changes
        result.onchange = () => {
          if (result.state === 'granted') {
            setGpsPermissionGranted(true);
            setShowGpsWarning(false);
          } else {
            setGpsPermissionGranted(false);
            setShowGpsWarning(true);
          }
        };
      }).catch(() => {
        // Fallback for browsers that don't support permissions API
        navigator.geolocation.getCurrentPosition(
          () => setGpsPermissionGranted(true),
          () => {
            setGpsPermissionGranted(false);
            setShowGpsWarning(true);
          }
        );
      });
    }
  }, [auth.type]);

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

  // POD (Proof of Delivery) - Feature 2
  const handlePodCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPodImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitPodAndComplete = async (jobId: string) => {
    if (!podImage) {
      alert('Please capture a photo as proof of delivery');
      return;
    }
    
    try {
      // Save POD image reference and complete the job
      await api(`jobs?id=eq.${jobId}`, 'PATCH', {
        status: 'completed',
        completed_at: new Date().toISOString(),
        pod_image: podImage.substring(0, 500) + '...[truncated]', // Store reference (in production, upload to storage)
        pod_timestamp: new Date().toISOString()
      });
      
      // Update rider earnings
      const job = jobs.find((j: any) => j.id === jobId);
      if (job && auth.id) {
        const riderData = riders.find((r: any) => r.id === auth.id);
        if (riderData) {
          const comm = calculateCommissions(job.price, riderData.tier, riderData.upline_chain || []);
          await api(`riders?id=eq.${auth.id}`, 'PATCH', {
            earnings: (riderData.earnings || 0) + comm.activeRider,
            completed_jobs: (riderData.completed_jobs || 0) + 1
          });
        }
      }
      
      setPodImage(null);
      setShowPodModal(false);
      stopGPSTracking();
      alert('Delivery completed with proof of delivery!');
      loadData();
    } catch (e: any) {
      alert('Error completing delivery: ' + e.message);
    }
  };

  // Rider navigation - Back button (Feature 1)
  const navigateRiderView = (newView: string) => {
    setRiderViewHistory(prev => [...prev, currentRiderView]);
    setCurrentRiderView(newView);
  };

  const goBackRider = () => {
    if (riderViewHistory.length > 1) {
      const newHistory = [...riderViewHistory];
      const previousView = newHistory.pop();
      setRiderViewHistory(newHistory);
      setCurrentRiderView(newHistory[newHistory.length - 1] || 'home');
    }
  };

  // Multi-job support - Get active jobs for rider (Feature 5)
  const getActiveJobsForRider = useMemo(() => {
    if (auth.type !== 'rider' || !auth.id) return [];
    return jobs.filter((j: any) => 
      j.rider_id === auth.id && 
      ['accepted', 'picked-up', 'on-the-way'].includes(j.status)
    );
  }, [jobs, auth]);

  // Admin Dashboard Stats (Feature 4)
  const calculateDashboardStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayJobs = jobs.filter((j: any) => new Date(j.created_at) >= today);
    
    const pendingOrders = todayJobs.filter((j: any) => j.status === 'posted').length;
    const assignedOrders = todayJobs.filter((j: any) => j.status === 'accepted').length;
    const outForDelivery = todayJobs.filter((j: any) => ['picked-up', 'on-the-way'].includes(j.status)).length;
    const deliveredToday = todayJobs.filter((j: any) => j.status === 'completed').length;
    
    const totalRevenueToday = todayJobs
      .filter((j: any) => j.status === 'completed')
      .reduce((sum: number, j: any) => sum + (parseFloat(j.price) || 0), 0);
    
    const adminEarningsToday = deliveredToday * 1; // $1 per completed delivery
    const riderEarningsToday = totalRevenueToday - adminEarningsToday;
    
    const activeRiders = riders.filter((r: any) => {
      const riderJobs = jobs.filter((j: any) => 
        j.rider_id === r.id && 
        ['accepted', 'picked-up', 'on-the-way'].includes(j.status)
      );
      return riderJobs.length > 0;
    }).length;
    
    return {
      totalOrdersToday: todayJobs.length,
      pendingOrders,
      assignedOrders,
      outForDelivery,
      deliveredToday,
      activeRiders,
      totalRevenueToday,
      adminEarningsToday,
      riderEarningsToday
    };
  }, [jobs, riders]);

  // Rider Performance Stats (Feature 9)
  const riderPerformanceStats = useMemo(() => {
    if (auth.type !== 'rider' || !auth.id) return null;
    
    const riderJobs = jobs.filter((j: any) => j.rider_id === auth.id);
    const completedJobs = riderJobs.filter((j: any) => j.status === 'completed');
    const cancelledJobs = riderJobs.filter((j: any) => j.status === 'cancelled');
    const acceptedJobs = riderJobs.filter((j: any) => j.status !== 'posted');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayJobs = completedJobs.filter((j: any) => new Date(j.completed_at || j.created_at) >= today);
    const todayEarnings = todayJobs.reduce((sum: number, j: any) => {
      const rider = riders.find((r: any) => r.id === auth.id);
      if (rider) {
        const comm = calculateCommissions(j.price, rider.tier, rider.upline_chain || []);
        return sum + comm.activeRider;
      }
      return sum;
    }, 0);
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekJobs = completedJobs.filter((j: any) => new Date(j.completed_at || j.created_at) >= thisWeek);
    const weekEarnings = weekJobs.reduce((sum: number, j: any) => {
      const rider = riders.find((r: any) => r.id === auth.id);
      if (rider) {
        const comm = calculateCommissions(j.price, rider.tier, rider.upline_chain || []);
        return sum + comm.activeRider;
      }
      return sum;
    }, 0);
    
    return {
      totalJobs: riderJobs.length,
      completedJobs: completedJobs.length,
      cancelledJobs: cancelledJobs.length,
      acceptanceRate: acceptedJobs.length > 0 ? ((acceptedJobs.length / riderJobs.length) * 100).toFixed(1) : '0',
      completionRate: acceptedJobs.length > 0 ? ((completedJobs.length / acceptedJobs.length) * 100).toFixed(1) : '0',
      todayDeliveries: todayJobs.length,
      todayEarnings,
      weekDeliveries: weekJobs.length,
      weekEarnings,
      avgRating: 4.8 // Placeholder - would come from customer ratings
    };
  }, [jobs, riders, auth]);

  // Filtered available jobs for rider (Feature 10)
  const filteredAvailableJobs = useMemo(() => {
    let availableJobs = jobs.filter((j: any) => j.status === 'posted');
    
    if (riderJobFilter.pickup) {
      availableJobs = availableJobs.filter((j: any) => 
        j.pickup?.toLowerCase().includes(riderJobFilter.pickup.toLowerCase())
      );
    }
    if (riderJobFilter.dropoff) {
      availableJobs = availableJobs.filter((j: any) => 
        j.delivery?.toLowerCase().includes(riderJobFilter.dropoff.toLowerCase())
      );
    }
    if (riderJobFilter.customer) {
      availableJobs = availableJobs.filter((j: any) => 
        j.customer_name?.toLowerCase().includes(riderJobFilter.customer.toLowerCase())
      );
    }
    
    return availableJobs;
  }, [jobs, riderJobFilter]);

  // Customer Order History (Feature 7)
  const customerOrderHistory = useMemo(() => {
    if (auth.type !== 'customer' || !auth.id) return { all: [], completed: [], pending: [], cancelled: [] };
    
    const customerJobs = jobs.filter((j: any) => j.customer_id === auth.id);
    const completed = customerJobs.filter((j: any) => j.status === 'completed');
    const pending = customerJobs.filter((j: any) => j.status !== 'completed' && j.status !== 'cancelled');
    const cancelled = customerJobs.filter((j: any) => j.status === 'cancelled');
    
    // Sort by date (newest first)
    const sortedAll = [...customerJobs].sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return { all: sortedAll, completed, pending, cancelled };
  }, [jobs, auth]);

  // Rider Delivery History
  const riderDeliveryHistory = useMemo(() => {
    if (auth.type !== 'rider' || !auth.id) return { all: [], completed: [], active: [], totalEarnings: 0 };
    
    const riderJobs = jobs.filter((j: any) => j.rider_id === auth.id);
    const completed = riderJobs.filter((j: any) => j.status === 'completed');
    const active = riderJobs.filter((j: any) => ['accepted', 'picked-up', 'on-the-way'].includes(j.status));
    
    // Calculate total earnings from completed jobs
    const rider = riders.find((r: any) => r.id === auth.id);
    let totalEarnings = 0;
    if (rider) {
      completed.forEach((job: any) => {
        const comm = calculateCommissions(job.price, rider.tier, rider.upline_chain || []);
        totalEarnings += comm.activeRider;
      });
    }
    
    // Sort by date (newest first)
    const sortedAll = [...riderJobs].sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return { all: sortedAll, completed, active, totalEarnings };
  }, [jobs, riders, auth]);

  // Rider Downline/Subordinate Earnings
  const riderDownlineData = useMemo(() => {
    if (auth.type !== 'rider' || !auth.id) return { downlineRiders: [], totalDownlineEarnings: 0, overrideEarnings: 0 };
    
    const currentRider = riders.find((r: any) => r.id === auth.id);
    if (!currentRider) return { downlineRiders: [], totalDownlineEarnings: 0, overrideEarnings: 0 };
    
    // Find all riders who have this rider in their upline chain
    const downlineRiders = riders.filter((r: any) => 
      r.upline_chain && r.upline_chain.some((u: any) => u.id === auth.id)
    );
    
    // Calculate total earnings from downline
    let totalDownlineEarnings = 0;
    let overrideEarnings = 0;
    
    downlineRiders.forEach((downline: any) => {
      totalDownlineEarnings += (downline.earnings || 0);
    });
    
    // Calculate override earnings from completed jobs where this rider is in upline
    jobs.filter((j: any) => j.status === 'completed' && j.commissions?.uplines).forEach((job: any) => {
      const uplineEntry = job.commissions.uplines.find((u: any) => u.riderId === auth.id);
      if (uplineEntry) {
        overrideEarnings += uplineEntry.amount || 0;
      }
    });
    
    return { downlineRiders, totalDownlineEarnings, overrideEarnings };
  }, [riders, jobs, auth]);

  // Admin POD Management - Jobs with/without POD (Feature 13)
  const podManagementData = useMemo(() => {
    const completedJobs = jobs.filter((j: any) => j.status === 'completed');
    const withPod = completedJobs.filter((j: any) => j.pod_image);
    const withoutPod = completedJobs.filter((j: any) => !j.pod_image);
    
    return { completedJobs, withPod, withoutPod };
  }, [jobs]);

  // Referral Tree Data (Feature 12) - Build hierarchical tree structure
  const referralTreeData = useMemo(() => {
    // Find all tier 1 riders (root nodes)
    const tier1Riders = riders.filter((r: any) => r.tier === 1);
    
    // Build tree recursively
    const buildTree = (rider: any): any => {
      const children = riders.filter((r: any) => 
        r.upline_chain && r.upline_chain.length > 0 && r.upline_chain[0]?.id === rider.id
      );
      return {
        ...rider,
        children: children.map(buildTree),
        totalDownline: countDownline(rider),
        totalEarnings: rider.earnings || 0
      };
    };
    
    // Count all downline riders
    const countDownline = (rider: any): number => {
      const directDownline = riders.filter((r: any) => 
        r.upline_chain && r.upline_chain.length > 0 && r.upline_chain[0]?.id === rider.id
      );
      return directDownline.length + directDownline.reduce((sum: number, r: any) => sum + countDownline(r), 0);
    };
    
    return tier1Riders.map(buildTree);
  }, [riders]);

  // Reports & Analytics Data (Feature 14)
  const reportsData = useMemo(() => {
    let filteredJobs = jobs;
    
    // Apply date filters
    if (reportDateFrom) {
      filteredJobs = filteredJobs.filter((j: any) => new Date(j.created_at) >= new Date(reportDateFrom));
    }
    if (reportDateTo) {
      const toDate = new Date(reportDateTo);
      toDate.setHours(23, 59, 59, 999);
      filteredJobs = filteredJobs.filter((j: any) => new Date(j.created_at) <= toDate);
    }
    
    // Financial Report
    const totalRevenue = filteredJobs.reduce((sum: number, j: any) => sum + (parseFloat(j.price) || 0), 0);
    const completedRevenue = filteredJobs.filter((j: any) => j.status === 'completed')
      .reduce((sum: number, j: any) => sum + (parseFloat(j.price) || 0), 0);
    const adminEarnings = filteredJobs.filter((j: any) => j.status === 'completed').length * 1; // $1 per job
    const riderEarnings = completedRevenue - adminEarnings;
    
    // Calculate override commissions
    let overrideCommissions = 0;
    filteredJobs.filter((j: any) => j.status === 'completed').forEach((job: any) => {
      if (job.commissions?.uplines) {
        overrideCommissions += job.commissions.uplines.reduce((sum: number, u: any) => sum + (u.amount || 0), 0);
      }
    });
    
    // Operational Report
    const totalOrders = filteredJobs.length;
    const completedOrders = filteredJobs.filter((j: any) => j.status === 'completed').length;
    const cancelledOrders = filteredJobs.filter((j: any) => j.status === 'cancelled').length;
    const pendingOrders = filteredJobs.filter((j: any) => ['posted', 'accepted', 'picked-up', 'on-the-way'].includes(j.status)).length;
    const completionRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : '0';
    
    // Average delivery time (for completed jobs with timestamps)
    const deliveryTimes: number[] = [];
    filteredJobs.filter((j: any) => j.status === 'completed' && j.accepted_at && j.completed_at).forEach((job: any) => {
      const start = new Date(job.accepted_at).getTime();
      const end = new Date(job.completed_at).getTime();
      deliveryTimes.push((end - start) / (1000 * 60)); // minutes
    });
    const avgDeliveryTime = deliveryTimes.length > 0 
      ? (deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length).toFixed(0) 
      : 'N/A';
    
    // Rider Performance Report
    const riderPerformance = riders.map((rider: any) => {
      const riderJobs = filteredJobs.filter((j: any) => j.rider_id === rider.id);
      const completed = riderJobs.filter((j: any) => j.status === 'completed').length;
      const total = riderJobs.length;
      const revenue = riderJobs.filter((j: any) => j.status === 'completed')
        .reduce((sum: number, j: any) => sum + (parseFloat(j.price) || 0), 0);
      
      return {
        id: rider.id,
        name: rider.name,
        tier: rider.tier,
        totalJobs: total,
        completedJobs: completed,
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : '0',
        revenue,
        earnings: rider.earnings || 0
      };
    }).filter((r: any) => r.totalJobs > 0).sort((a: any, b: any) => b.completedJobs - a.completedJobs);
    
    // Daily breakdown
    const dailyData: any = {};
    filteredJobs.forEach((job: any) => {
      const date = new Date(job.created_at).toLocaleDateString();
      if (!dailyData[date]) {
        dailyData[date] = { date, orders: 0, completed: 0, revenue: 0 };
      }
      dailyData[date].orders++;
      if (job.status === 'completed') {
        dailyData[date].completed++;
        dailyData[date].revenue += parseFloat(job.price) || 0;
      }
    });
    
    return {
      financial: {
        totalRevenue,
        completedRevenue,
        adminEarnings,
        riderEarnings,
        overrideCommissions
      },
      operational: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        pendingOrders,
        completionRate,
        avgDeliveryTime
      },
      riderPerformance,
      dailyData: Object.values(dailyData).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }, [jobs, riders, reportDateFrom, reportDateTo]);

  // Audit Log helper function (Feature 15)
  const logAuditAction = async (action: string, details: any) => {
    const logEntry = {
      action,
      user_id: auth.id,
      user_type: auth.type,
      details: JSON.stringify(details),
      timestamp: new Date().toISOString(),
      ip_address: 'client-side' // In production, get from server
    };
    
    try {
      await api('audit_logs', 'POST', logEntry);
    } catch (e) {
      console.error('Failed to log audit action:', e);
    }
    
    // Also update local state
    setAuditLogs(prev => [logEntry, ...prev]);
  };

  // Load audit logs
  const loadAuditLogs = async () => {
    try {
      const logs = await api('audit_logs?order=timestamp.desc&limit=100');
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
      // If table doesn't exist, use empty array
      setAuditLogs([]);
    }
  };

  // Route Optimization (Feature 8) - Simple nearest neighbor algorithm
  const optimizeRoute = (jobsToOptimize: any[]) => {
    if (jobsToOptimize.length <= 1) {
      setOptimizedRoute(jobsToOptimize);
      return;
    }
    
    // Simple optimization: sort by pickup location similarity
    // In production, use Google Maps Distance Matrix API
    const optimized = [...jobsToOptimize];
    
    // Group by similar pickup areas (first 3 chars of postal code if available)
    optimized.sort((a, b) => {
      const aPickup = a.pickup?.toLowerCase() || '';
      const bPickup = b.pickup?.toLowerCase() || '';
      return aPickup.localeCompare(bPickup);
    });
    
    setOptimizedRoute(optimized);
    alert('Route optimized! Jobs have been reordered for efficiency.');
  };

  // Generate route URL for Google Maps
  const generateOptimizedRouteUrl = (jobsList: any[]) => {
    if (jobsList.length === 0) return '';
    
    const waypoints = jobsList.map(j => `${encodeURIComponent(j.pickup)}|${encodeURIComponent(j.delivery)}`).join('|');
    const origin = encodeURIComponent(jobsList[0].pickup);
    const destination = encodeURIComponent(jobsList[jobsList.length - 1].delivery);
    
    return `https://www.google.com/maps/dir/${origin}/${jobsList.map(j => encodeURIComponent(j.delivery)).join('/')}`;
  };

  // Calculate projected earnings for a job (Rider Preview)
  const calculateProjectedEarnings = (jobPrice: number) => {
    const rider = riders.find((r: any) => r.id === auth.id);
    if (!rider) return { riderEarns: 0, platformFee: 1, uplineShare: 0 };
    
    const comm = calculateCommissions(jobPrice, rider.tier, rider.upline_chain || []);
    const uplineTotal = comm.uplines.reduce((sum: number, u: any) => sum + u.amount, 0);
    
    return {
      riderEarns: comm.activeRider,
      platformFee: comm.platform,
      uplineShare: uplineTotal
    };
  };

  // Customer bulk import CSV parser
  const handleCustomerBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setCustomerImportedJobs(parsed);
    };
    reader.readAsText(file);
  };

  // Customer import jobs to database
  const customerImportJobs = async () => {
    if (customerImportedJobs.length === 0) {
      alert('No jobs to import');
      return;
    }
    
    const totalCost = customerImportedJobs.reduce((sum, job) => sum + (parseFloat(job.price) || 10), 0);
    if (curr.credits < totalCost) {
      alert(`Insufficient credits. You need $${totalCost.toFixed(2)} but only have $${curr.credits.toFixed(2)}`);
      return;
    }
    
    try {
      let successCount = 0;
      for (const job of customerImportedJobs) {
        await api('jobs', 'POST', {
          customer_id: auth.id,
          customer_name: curr.name,
          customer_phone: curr.phone,
          pickup: job.pickup,
          delivery: job.delivery,
          timeframe: job.timeframe || 'same-day',
          price: parseFloat(job.price) || 10,
          status: 'posted',
          recipient_name: job.recipient_name || null,
          recipient_phone: job.recipient_phone || null,
          parcel_size: job.parcel_size || 'small',
          remarks: job.notes || null
        });
        successCount++;
      }
      
      // Deduct credits
      await api(`customers?id=eq.${auth.id}`, 'PATCH', { 
        credits: curr.credits - totalCost 
      });
      
      alert(`Successfully imported ${successCount} jobs! $${totalCost.toFixed(2)} deducted from credits.`);
      setCustomerImportedJobs([]);
      setShowCustomerBulkImport(false);
      loadData();
    } catch (e: any) {
      alert('Error importing jobs: ' + e.message);
    }
  };

  // Admin - Update rider tier/level
  const updateRiderTier = async (riderId: string, newTier: number) => {
    try {
      await api(`riders?id=eq.${riderId}`, 'PATCH', { tier: newTier });
      await logAuditAction('update_rider_tier', { riderId, newTier });
      alert('Rider tier updated successfully!');
      loadData();
    } catch (e: any) {
      alert('Error updating tier: ' + e.message);
    }
  };

  // Admin - Swap upline/downline positions
  const swapUplineDownline = async (rider1Id: string, rider2Id: string) => {
    try {
      const rider1 = riders.find((r: any) => r.id === rider1Id);
      const rider2 = riders.find((r: any) => r.id === rider2Id);
      
      if (!rider1 || !rider2) {
        alert('Riders not found');
        return;
      }
      
      // Swap their upline chains
      const rider1Upline = rider1.upline_chain || [];
      const rider2Upline = rider2.upline_chain || [];
      
      // Update rider1 with rider2's upline
      await api(`riders?id=eq.${rider1Id}`, 'PATCH', { 
        upline_chain: rider2Upline 
      });
      
      // Update rider2 with rider1's upline
      await api(`riders?id=eq.${rider2Id}`, 'PATCH', { 
        upline_chain: rider1Upline 
      });
      
      await logAuditAction('swap_upline_downline', { 
        rider1Id, rider1Name: rider1.name,
        rider2Id, rider2Name: rider2.name
      });
      
      alert(`Swapped positions: ${rider1.name} ↔ ${rider2.name}\nThis will affect future payouts only.`);
      loadData();
    } catch (e: any) {
      alert('Error swapping positions: ' + e.message);
    }
  };

  // Admin - Create order on behalf of customer
  const adminCreateOrderForCustomer = async () => {
    if (!adminOrderForm.customerId || !adminOrderForm.pickup || !adminOrderForm.delivery) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      await api('jobs', 'POST', {
        customer_id: adminOrderForm.customerId,
        customer_name: adminOrderForm.customerName,
        customer_phone: adminOrderForm.customerPhone,
        pickup: adminOrderForm.pickup,
        delivery: adminOrderForm.delivery,
        timeframe: adminOrderForm.timeframe,
        price: parseFloat(adminOrderForm.price) || 10,
        status: 'posted',
        parcel_size: adminOrderForm.parcelSize,
        remarks: adminOrderForm.remarks,
        created_by_admin: true
      });
      
      await logAuditAction('admin_create_order', { 
        customerId: adminOrderForm.customerId, 
        customerName: adminOrderForm.customerName 
      });
      
      alert('Order created successfully!');
      setAdminOrderForm({
        customerId: '',
        customerName: '',
        customerPhone: '',
        pickup: '',
        delivery: '',
        price: '10',
        timeframe: 'same-day',
        parcelSize: 'small',
        remarks: ''
      });
      setShowAdminCreateOrder(false);
      loadData();
    } catch (e: any) {
      alert('Error creating order: ' + e.message);
    }
  };

  // Admin - Fetch all rider locations for live map
  const fetchAllRiderLocations = async () => {
    try {
      const locations = await api('rider_locations?order=updated_at.desc');
      // Group by rider, keep only latest
      const latestByRider: any = {};
      locations.forEach((loc: any) => {
        if (!latestByRider[loc.rider_id] || new Date(loc.updated_at) > new Date(latestByRider[loc.rider_id].updated_at)) {
          latestByRider[loc.rider_id] = loc;
        }
      });
      setAllRiderLocations(Object.values(latestByRider));
    } catch (e) {
      console.error('Error fetching rider locations:', e);
      setAllRiderLocations([]);
    }
  };

  // Admin - Get delayed/stalled jobs
  const getDelayedJobs = useMemo(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    return jobs.filter((job: any) => {
      if (job.status === 'completed' || job.status === 'cancelled') return false;
      
      // Job accepted but not picked up for 1+ hour
      if (job.status === 'accepted' && job.accepted_at) {
        if (new Date(job.accepted_at) < oneHourAgo) return true;
      }
      
      // Job picked up but not delivered for 2+ hours
      if (job.status === 'picked-up' && job.picked_up_at) {
        if (new Date(job.picked_up_at) < twoHoursAgo) return true;
      }
      
      // Job posted for 2+ hours without acceptance
      if (job.status === 'posted' && job.created_at) {
        if (new Date(job.created_at) < twoHoursAgo) return true;
      }
      
      return false;
    });
  }, [jobs]);

  // Admin - Create promotion
  const createPromotion = async () => {
    if (!newPromotion.code) {
      alert('Please enter a promo code');
      return;
    }
    try {
      await api('promotions', 'POST', {
        code: newPromotion.code.toUpperCase(),
        discount_type: newPromotion.discountType,
        discount_value: newPromotion.discountValue,
        min_order: newPromotion.minOrder,
        max_uses: newPromotion.maxUses,
        expiry_date: newPromotion.expiryDate || null,
        uses_count: 0,
        active: true
      });
      alert('Promotion created!');
      setNewPromotion({ code: '', discountType: 'fixed', discountValue: 5, minOrder: 0, maxUses: 100, expiryDate: '' });
      loadPromotions();
    } catch (e: any) {
      alert('Error creating promotion: ' + e.message);
    }
  };

  // Load promotions
  const loadPromotions = async () => {
    try {
      const promos = await api('promotions?order=created_at.desc');
      setPromotions(Array.isArray(promos) ? promos : []);
    } catch (e) {
      setPromotions([]);
    }
  };

  // Admin - Send broadcast (placeholder - would integrate with actual messaging)
  const sendBroadcast = async () => {
    if (!broadcastMessage.message) {
      alert('Please enter a message');
      return;
    }
    
    // In production, this would integrate with WhatsApp API, SMS, or push notifications
    await logAuditAction('broadcast_sent', {
      target: broadcastMessage.target,
      subject: broadcastMessage.subject,
      recipientCount: broadcastMessage.target === 'all_riders' ? riders.length : 
                       broadcastMessage.target === 'all_customers' ? customers.length : 
                       riders.length + customers.length
    });
    
    alert(`Broadcast scheduled to ${broadcastMessage.target.replace('_', ' ')}!\n\nNote: In production, this would send via WhatsApp/SMS.`);
    setBroadcastMessage({ target: 'all_riders', subject: '', message: '' });
    setShowBroadcast(false);
  };

  // Save customer profile
  const saveCustomerProfile = async () => {
    if (!auth.id) return;
    try {
      await api(`customers?id=eq.${auth.id}`, 'PATCH', {
        name: profileForm.name,
        phone: profileForm.phone,
        saved_address: profileForm.address
      });
      setEditingProfile(false);
      alert('Profile updated successfully!');
      loadData();
    } catch (e: any) {
      alert('Error saving profile: ' + e.message);
    }
  };

  // Add saved address
  const addSavedAddress = async (address: string) => {
    if (!auth.id || !address) return;
    const curr = customers.find((c: any) => c.id === auth.id);
    const existingAddresses = curr?.saved_addresses || [];
    if (existingAddresses.includes(address)) {
      alert('Address already saved');
      return;
    }
    try {
      await api(`customers?id=eq.${auth.id}`, 'PATCH', {
        saved_addresses: [...existingAddresses, address]
      });
      alert('Address saved!');
      loadData();
    } catch (e: any) {
      alert('Error saving address: ' + e.message);
    }
  };

  // Flag POD as invalid (Admin)
  const flagPodInvalid = async (jobId: string) => {
    try {
      await api(`jobs?id=eq.${jobId}`, 'PATCH', {
        pod_flagged: true,
        pod_flagged_at: new Date().toISOString()
      });
      alert('POD flagged as invalid. Rider will be notified.');
      loadData();
    } catch (e: any) {
      alert('Error flagging POD: ' + e.message);
    }
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

  // Singapore Postal Code Lookup using OneMap API (free, no key required)
  const lookupPostalCode = async (postalCode: string): Promise<string | null> => {
    if (!/^\d{6}$/.test(postalCode)) return null;
    
    try {
      const response = await fetch(
        `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        // Format: Block/Building + Street + Singapore + Postal
        const address = [
          result.BLK_NO,
          result.ROAD_NAME,
          result.BUILDING ? `(${result.BUILDING})` : '',
          'Singapore',
          postalCode
        ].filter(Boolean).join(' ');
        return address;
      }
      return null;
    } catch (error) {
      console.error('Postal code lookup failed:', error);
      return null;
    }
  };

  // Handle postal code input for pickup
  const handlePickupPostalCode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setJobForm({ ...jobForm, pickup: value });
    
    if (value.length === 6) {
      const address = await lookupPostalCode(value);
      if (address) {
        setJobForm(prev => ({ ...prev, pickup: address }));
      }
    }
  };

  // Handle postal code input for stops
  const handleStopPostalCode = async (index: number, value: string) => {
    const postalCode = value.replace(/\D/g, '').slice(0, 6);
    const newStops = [...jobForm.stops];
    newStops[index].address = value;
    setJobForm({ ...jobForm, stops: newStops });
    
    // Only lookup if exactly 6 digits and looks like a postal code
    if (postalCode.length === 6 && /^\d{6}$/.test(value)) {
      const address = await lookupPostalCode(postalCode);
      if (address) {
        const updatedStops = [...jobForm.stops];
        updatedStops[index].address = address;
        setJobForm(prev => ({ ...prev, stops: updatedStops }));
      }
    }
  };

  // Generate random reference number for PayNow top-up
  const generateTopUpReference = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I,O,0,1
    let result = 'TOPUP-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Copy live tracking link
  const copyLiveTrackingLink = (job: any) => {
    const url = generateLiveTrackingUrl(job);
    const riderData = riders.find((r: any) => r.id === job.rider_id);
    const message = `🚚 Live Delivery Tracking

Hi! You can track your delivery in real-time:

📍 Live Tracking Link:
${url}

Rider Details:
• Name: ${job.rider_name || 'Assigning...'}
• Phone: ${riderData?.phone || 'N/A'}

After delivery, you can also view your Proof of Delivery (POD) via the same link.

Thank you for your order! 🙏`;

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
    const riderData = riders.find((r: any) => r.id === job.rider_id);
    
    const message = `🚚 Live Delivery Tracking

Hi! You can track your delivery in real-time:

📍 Live Tracking Link:
${liveTrackingUrl}

Rider Details:
• Name: ${job.rider_name || 'Assigning...'}
• Phone: ${riderData?.phone || job.rider_phone || 'N/A'}

After delivery, you can also view your Proof of Delivery (POD) via the same link.

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
        const authData = { isAuth: true, type: 'admin', id: 'admin1' };
        setAuth(authData);
        localStorage.setItem('moveit_auth', JSON.stringify(authData)); // Persistent login
        setLoginForm({ email: '', password: '' });
        return;
      }
      const table = type === 'customer' ? 'customers' : 'riders';
      console.log('Attempting login for:', table, loginForm.email);
      const users = await api(`${table}?email=eq.${encodeURIComponent(loginForm.email)}&password=eq.${encodeURIComponent(loginForm.password)}`);
      console.log('Login response:', users);
      if (users && users.length > 0) {
        const authData = { isAuth: true, type, id: users[0].id };
        setAuth(authData);
        localStorage.setItem('moveit_auth', JSON.stringify(authData)); // Persistent login
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
    const minPrice = 3 + (jobForm.stops.length - 1) * 2; // $3 base + $2 per extra stop
    if (price < minPrice) return alert(`Minimum price is $${minPrice} for ${jobForm.stops.length} stop(s)`);
    if (curr.credits < price) return alert('Insufficient credits. Please top up.');
    if (!jobForm.pickup) return alert('Please fill in pickup location');
    if (!jobForm.stops[0]?.address) return alert('Please fill in at least one drop-off location');
    if (!jobForm.parcelSize) return alert('Please select a parcel size');
    
    // Validate all stops have addresses
    const emptyStops = jobForm.stops.filter(s => !s.address);
    if (emptyStops.length > 0) return alert('Please fill in all drop-off addresses or remove empty stops');
    
    try {
      // For multi-stop, create the job with all stops stored as JSON
      const deliveryAddresses = jobForm.stops.map(s => s.address).join(' → ');
      
      await api('jobs', 'POST', { 
        customer_id: curr.id, 
        customer_name: curr.name, 
        customer_phone: curr.phone, 
        pickup: jobForm.pickup, 
        pickup_contact: jobForm.pickupContact || null,
        pickup_phone: jobForm.pickupPhone || null,
        delivery: deliveryAddresses, // Combined for display
        stops: jobForm.stops, // Full stops array as JSON
        total_stops: jobForm.stops.length,
        timeframe: jobForm.timeframe, 
        price, 
        status: 'posted',
        recipient_name: jobForm.stops[0]?.recipientName || null,
        recipient_phone: jobForm.stops[0]?.recipientPhone || null,
        parcel_size: jobForm.parcelSize,
        remarks: jobForm.remarks || null
      });
      await api(`customers?id=eq.${curr.id}`, 'PATCH', { credits: curr.credits - price });
      setJobForm({ 
        pickup: '', 
        pickupContact: '',
        pickupPhone: '',
        stops: [{ address: '', recipientName: '', recipientPhone: '' }],
        timeframe: '', 
        price: '10', 
        parcelSize: 'small', 
        remarks: '' 
      });
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
    const refNumber = generateTopUpReference(); // e.g., TOPUP-A7X3K9
    
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
      const qrData = JSON.parse(payNowQR);
      await api(`customers?id=eq.${auth.id}`, 'PATCH', { credits: curr.credits + parseFloat(topUpAmt) });
      
      // Log the top-up for admin reference (can be used for approval queue later)
      await logAuditAction('customer_topup', {
        customerId: auth.id,
        customerName: curr.name,
        amount: parseFloat(topUpAmt),
        refNumber: qrData.refNumber,
        status: 'self_confirmed' // For now - later can be 'pending_approval'
      });
      
      alert(`Credits added successfully!\nReference: ${qrData.refNumber}`);
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
                <button 
                  onClick={() => setAdminView('pod')} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'pod' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  📸 POD
                </button>
                <button 
                  onClick={() => setAdminView('referrals')} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'referrals' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  🌳 Referrals
                </button>
                <button 
                  onClick={() => setAdminView('reports')} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'reports' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  📊 Reports
                </button>
                <button 
                  onClick={() => { setAdminView('audit'); loadAuditLogs(); }} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'audit' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  📋 Audit
                </button>
                <button 
                  onClick={() => { setAdminView('settings'); loadPromotions(); }} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'settings' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  ⚙️ Settings
                </button>
              </>
            )}
            <button 
              onClick={() => { 
                setAuth({ isAuth: false, type: null, id: null }); 
                localStorage.removeItem('moveit_auth'); // Clear persistent login
                setCurrentRiderView('home'); // Reset rider view
                setRiderViewHistory(['home']);
              }} 
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
                <div className="flex gap-2">
                  <a 
                    href="https://wa.me/6580201980" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-500 text-white px-4 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-green-600 transition-colors shadow-lg"
                  >
                    💬 Contact Us
                  </a>
                  <button 
                    onClick={() => setShowTopUp(true)} 
                    className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-lg"
                  >
                    <CreditCard size={20} />
                    Top Up
                  </button>
                </div>
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
              
              {/* Postal Code Tip */}
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Enter a 6-digit Singapore postal code to auto-fill the address!
                </p>
              </div>

              <div className="space-y-4">
                {/* Pickup Location */}
                <div className="relative">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-orange-600"></div>
                      <div className="w-0.5 h-full bg-gray-300 min-h-[60px]"></div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                      <input 
                        type="text" 
                        value={jobForm.pickup} 
                        onChange={async (e) => {
                          const value = e.target.value;
                          setJobForm({...jobForm, pickup: value});
                          // Auto-lookup if user enters exactly 6 digits
                          if (/^\d{6}$/.test(value)) {
                            const address = await lookupPostalCode(value);
                            if (address) setJobForm(prev => ({...prev, pickup: address}));
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                        placeholder="Enter postal code (e.g., 238858) or full address" 
                      />
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <input 
                          type="text" 
                          value={jobForm.pickupContact} 
                          onChange={(e) => setJobForm({...jobForm, pickupContact: e.target.value})} 
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                          placeholder="Contact name" 
                        />
                        <input 
                          type="tel" 
                          value={jobForm.pickupPhone} 
                          onChange={(e) => setJobForm({...jobForm, pickupPhone: e.target.value})} 
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                          placeholder="Phone number" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drop-off Locations (Multi-stop) */}
                {jobForm.stops.map((stop, index) => (
                  <div key={index} className="relative">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        {index < jobForm.stops.length - 1 && (
                          <div className="w-0.5 h-4 bg-gray-300"></div>
                        )}
                        <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-600 flex items-center justify-center">
                          {jobForm.stops.length > 1 && (
                            <span className="text-white text-xs font-bold">{index + 1}</span>
                          )}
                        </div>
                        {index < jobForm.stops.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-300 min-h-[60px]"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            {jobForm.stops.length === 1 ? 'Drop-off Location' : `Stop ${index + 1}`}
                          </label>
                          {jobForm.stops.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newStops = jobForm.stops.filter((_, i) => i !== index);
                                setJobForm({...jobForm, stops: newStops});
                              }}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>
                        <input 
                          type="text" 
                          value={stop.address} 
                          onChange={async (e) => {
                            const value = e.target.value;
                            const newStops = [...jobForm.stops];
                            newStops[index].address = value;
                            setJobForm({...jobForm, stops: newStops});
                            // Auto-lookup if user enters exactly 6 digits
                            if (/^\d{6}$/.test(value)) {
                              const address = await lookupPostalCode(value);
                              if (address) {
                                const updatedStops = [...jobForm.stops];
                                updatedStops[index].address = address;
                                setJobForm(prev => ({...prev, stops: updatedStops}));
                              }
                            }
                          }} 
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                          placeholder="Enter postal code or full address" 
                        />
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <input 
                            type="text" 
                            value={stop.recipientName} 
                            onChange={(e) => {
                              const newStops = [...jobForm.stops];
                              newStops[index].recipientName = e.target.value;
                              setJobForm({...jobForm, stops: newStops});
                            }} 
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                            placeholder="Recipient name" 
                          />
                          <input 
                            type="tel" 
                            value={stop.recipientPhone} 
                            onChange={(e) => {
                              const newStops = [...jobForm.stops];
                              newStops[index].recipientPhone = e.target.value;
                              setJobForm({...jobForm, stops: newStops});
                            }} 
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                            placeholder="Phone number" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Stop Button */}
                <button
                  type="button"
                  onClick={() => {
                    setJobForm({
                      ...jobForm, 
                      stops: [...jobForm.stops, { address: '', recipientName: '', recipientPhone: '' }]
                    });
                  }}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-xl">+</span> Add Stop
                </button>

                {/* Delivery Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date</label>
                  <input 
                    type="date" 
                    value={jobForm.timeframe} 
                    onChange={(e) => setJobForm({...jobForm, timeframe: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Price (minimum $3{jobForm.stops.length > 1 ? ` + $2 per extra stop` : ''})
                  </label>
                  <input 
                    type="number" 
                    value={jobForm.price} 
                    onChange={(e) => setJobForm({...jobForm, price: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500" 
                    min={3 + (jobForm.stops.length - 1) * 2} 
                    step="0.5"
                    placeholder="10.00"
                  />
                  {jobForm.stops.length > 1 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Suggested: ${3 + (jobForm.stops.length - 1) * 2} minimum for {jobForm.stops.length} stops
                    </p>
                  )}
                </div>
                
                {/* Parcel Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parcel Size <span className="text-red-500">*</span></label>
                  <select 
                    value={jobForm.parcelSize} 
                    onChange={(e) => setJobForm({...jobForm, parcelSize: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="small">📦 Small (fits in hand, &lt;1kg)</option>
                    <option value="medium">📦📦 Medium (shoebox size, 1-5kg)</option>
                    <option value="large">📦📦📦 Large (luggage size, 5-20kg)</option>
                    <option value="extra-large">🚚 Extra Large (furniture, &gt;20kg)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks / Special Instructions</label>
                  <textarea 
                    value={jobForm.remarks} 
                    onChange={(e) => setJobForm({...jobForm, remarks: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    placeholder="e.g., Fragile items, call before delivery, leave at door..."
                    rows={3}
                  />
                </div>

                <button 
                  onClick={createJob} 
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
                >
                  Post Job - ${jobForm.price} {jobForm.stops.length > 1 ? `(${jobForm.stops.length} stops)` : ''}
                </button>
                
                {/* Bulk Import Option */}
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => setShowCustomerBulkImport(!showCustomerBulkImport)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Upload size={18} />
                    {showCustomerBulkImport ? 'Hide Bulk Import' : 'Bulk Import (CSV)'}
                  </button>
                </div>
              </div>
              
              {/* Customer Bulk Import Section */}
              {showCustomerBulkImport && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                  <h4 className="font-bold text-yellow-800 mb-3">📤 Bulk Import Orders</h4>
                  <p className="text-sm text-yellow-700 mb-4">Upload a CSV file with multiple delivery orders.</p>
                  
                  {/* CSV Template */}
                  <div className="mb-4 p-3 bg-white rounded-lg border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Required CSV Columns:</p>
                    <code className="text-xs text-gray-600">pickup, delivery, price, recipient_name, recipient_phone, parcel_size, notes</code>
                    <button
                      onClick={() => {
                        const template = 'pickup,delivery,price,recipient_name,recipient_phone,parcel_size,notes\n"123 Orchard Rd","456 Marina Bay",12,"John Doe","91234567","small","Handle with care"\n"789 Bugis St","321 Tampines Ave",10,"Jane Smith","98765432","medium",""';
                        const blob = new Blob([template], { type: 'text/csv' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = 'bulk_order_template.csv';
                        link.click();
                      }}
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      Download Template
                    </button>
                  </div>
                  
                  {/* File Upload */}
                  <input
                    ref={customerFileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCustomerBulkImport}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-white hover:file:bg-yellow-600 file:cursor-pointer"
                  />
                  
                  {/* Preview */}
                  {customerImportedJobs.length > 0 && (
                    <div className="mt-4">
                      <p className="font-medium text-gray-700 mb-2">Preview ({customerImportedJobs.length} orders):</p>
                      <div className="max-h-40 overflow-y-auto border rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="p-2 text-left">Pickup</th>
                              <th className="p-2 text-left">Delivery</th>
                              <th className="p-2 text-left">Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerImportedJobs.map((job, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2">{job.pickup?.substring(0, 20)}...</td>
                                <td className="p-2">{job.delivery?.substring(0, 20)}...</td>
                                <td className="p-2 font-medium">${job.price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          Total Cost: <strong>${customerImportedJobs.reduce((sum, j) => sum + (parseFloat(j.price) || 10), 0).toFixed(2)}</strong>
                          <span className="ml-2">(Your credits: ${curr?.credits?.toFixed(2) || '0.00'})</span>
                        </p>
                      </div>
                      <button
                        onClick={customerImportJobs}
                        className="mt-3 w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                      >
                        Import {customerImportedJobs.length} Orders
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">My Delivery Jobs</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowOrderHistory(!showOrderHistory)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      showOrderHistory ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    <FileText size={18} />
                    {showOrderHistory ? 'Hide History' : 'Order History'}
                  </button>
                  <button
                    onClick={() => setShowCustomerProfile(!showCustomerProfile)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      showCustomerProfile ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <User size={18} />
                    {showCustomerProfile ? 'Hide Profile' : 'My Profile'}
                  </button>
                </div>
              </div>

              {/* Customer Order History Page */}
              {showOrderHistory && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <FileText className="text-blue-600" />
                    Order History
                  </h4>
                  
                  {/* Stats Summary */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-white p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{customerOrderHistory.all.length}</p>
                      <p className="text-xs text-gray-600">Total Orders</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{customerOrderHistory.completed.length}</p>
                      <p className="text-xs text-gray-600">Completed</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-yellow-600">{customerOrderHistory.pending.length}</p>
                      <p className="text-xs text-gray-600">In Progress</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">{customerOrderHistory.cancelled.length}</p>
                      <p className="text-xs text-gray-600">Cancelled</p>
                    </div>
                  </div>
                  
                  {/* Order List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {customerOrderHistory.all.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No orders yet</p>
                    ) : (
                      customerOrderHistory.all.map((order: any) => (
                        <div key={order.id} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{order.pickup}</p>
                              <p className="text-sm text-gray-500">→ {order.delivery}</p>
                              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                <span>📅 {new Date(order.created_at).toLocaleDateString()}</span>
                                {order.rider_name && <span>🏍️ {order.rider_name}</span>}
                                {order.parcel_size && <span>📦 {order.parcel_size}</span>}
                              </div>
                              {order.recipient_name && (
                                <p className="text-xs text-gray-500 mt-1">Recipient: {order.recipient_name}</p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xl font-bold text-blue-600">${order.price}</p>
                              <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                                order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                order.status === 'posted' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {(order.status || 'pending').toUpperCase()}
                              </span>
                              {order.completed_at && (
                                <p className="text-xs text-gray-400 mt-1">
                                  ✓ {new Date(order.completed_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Customer Profile Section - Feature 6 */}
              {showCustomerProfile && curr && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-bold text-lg mb-4">👤 My Profile</h4>
                  {editingProfile ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Address</label>
                        <input
                          type="text"
                          value={profileForm.address}
                          onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveCustomerProfile}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingProfile(false)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {curr.name}</p>
                      <p><span className="font-medium">Email:</span> {curr.email}</p>
                      <p><span className="font-medium">Phone:</span> {curr.phone}</p>
                      <p><span className="font-medium">Credits:</span> ${(curr.credits || 0).toFixed(2)}</p>
                      {curr.saved_address && <p><span className="font-medium">Default Address:</span> {curr.saved_address}</p>}
                      <button
                        onClick={() => {
                          setProfileForm({ name: curr.name, phone: curr.phone, address: curr.saved_address || '' });
                          setEditingProfile(true);
                        }}
                        className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        <Edit2 size={16} className="inline mr-1" /> Edit Profile
                      </button>
                    </div>
                  )}
                  
                  {/* Saved Addresses */}
                  {curr.saved_addresses && curr.saved_addresses.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="font-medium mb-2">📍 Saved Addresses</h5>
                      <div className="space-y-1">
                        {curr.saved_addresses.map((addr: string, idx: number) => (
                          <div key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                            <MapPin size={14} /> {addr}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Order History Summary - Feature 7 */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{customerOrderHistory.all.length}</p>
                  <p className="text-xs text-gray-600">Total Orders</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-600">{customerOrderHistory.pending.length}</p>
                  <p className="text-xs text-gray-600">In Progress</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{customerOrderHistory.completed.length}</p>
                  <p className="text-xs text-gray-600">Completed</p>
                </div>
              </div>

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
                          {job.parcel_size && <p className="text-xs text-gray-500">📦 {job.parcel_size}</p>}
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
                      {/* Save address button for completed jobs */}
                      {job.status === 'completed' && (
                        <button
                          onClick={() => addSavedAddress(job.delivery)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          + Save delivery address
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {auth.type === 'rider' && (
          <div className="space-y-6">
            {/* GPS Warning Modal - Feature 11 */}
            {showGpsWarning && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
                  <div className="text-6xl mb-4">📍</div>
                  <h3 className="text-2xl font-bold text-red-600 mb-2">GPS Required</h3>
                  <p className="text-gray-600 mb-4">
                    To use the MoveIt Rider app, you must enable GPS location services. 
                    This is required to track deliveries and update customers in real-time.
                  </p>
                  <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>How to enable:</strong><br/>
                      1. Go to your device Settings<br/>
                      2. Find Location / GPS settings<br/>
                      3. Enable location for this browser/app<br/>
                      4. Return here and refresh
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.geolocation.getCurrentPosition(
                        () => {
                          setGpsPermissionGranted(true);
                          setShowGpsWarning(false);
                        },
                        () => alert('GPS still not enabled. Please enable it in your device settings.')
                      );
                    }}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                  >
                    I've Enabled GPS - Check Again
                  </button>
                </div>
              </div>
            )}

            {/* Back Button - Feature 1 */}
            {riderViewHistory.length > 1 && (
              <button 
                onClick={goBackRider}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-2"
              >
                <ChevronLeft size={20} />
                Back
              </button>
            )}

            {/* Quick Actions Bar */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowRiderProfile(!showRiderProfile)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  showRiderProfile ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-300'
                }`}
              >
                <User size={18} />
                My Profile
              </button>
              <button
                onClick={() => setShowDeliveryHistory(!showDeliveryHistory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  showDeliveryHistory ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-300'
                }`}
              >
                <FileText size={18} />
                Delivery History
              </button>
              <button
                onClick={() => setShowRiderPerformance(!showRiderPerformance)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  showRiderPerformance ? 'bg-green-600 text-white' : 'bg-white text-green-700 border border-green-300'
                }`}
              >
                <BarChart3 size={18} />
                My Performance
              </button>
              {getActiveJobsForRider.length > 1 && (
                <button
                  onClick={() => setShowRouteOptimization(!showRouteOptimization)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                    showRouteOptimization ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-300'
                  }`}
                >
                  <Navigation size={18} />
                  Optimize Route
                </button>
              )}
              {gpsPermissionGranted === false && (
                <button
                  onClick={() => setShowGpsWarning(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium"
                >
                  <AlertCircle size={18} />
                  GPS Disabled
                </button>
              )}
            </div>

            {/* Rider Profile Page */}
            {showRiderProfile && curr && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <User className="text-purple-600" />
                  My Profile
                </h3>
                
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3">👤 Personal Information</h4>
                    <div className="space-y-2">
                      <p><span className="text-gray-500">Name:</span> <strong>{curr.name}</strong></p>
                      <p><span className="text-gray-500">Email:</span> {curr.email}</p>
                      <p><span className="text-gray-500">Phone:</span> {curr.phone}</p>
                      <p><span className="text-gray-500">Member Since:</span> {curr.created_at ? new Date(curr.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-3">🏆 Tier & Referral</h4>
                    <div className="space-y-2">
                      <p><span className="text-gray-500">Current Tier:</span> <strong className="text-purple-600">Tier {curr.tier}</strong></p>
                      <p><span className="text-gray-500">Referral Code:</span> <strong className="text-blue-600">{curr.referral_code}</strong></p>
                      <p><span className="text-gray-500">Downline Riders:</span> <strong>{riderDownlineData.downlineRiders.length}</strong></p>
                      {curr.upline_chain && curr.upline_chain.length > 0 && (
                        <p><span className="text-gray-500">Upline:</span> {curr.upline_chain[0]?.name || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Earnings Overview */}
                <div className="mt-6 bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                  <h4 className="font-semibold mb-3">💰 Earnings Overview</h4>
                  <div className={`grid ${riderDownlineData.downlineRiders.length > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
                    <div className="text-center">
                      <p className="text-3xl font-bold">${(curr.earnings || 0).toFixed(2)}</p>
                      <p className="text-green-100 text-sm">My Trip Earnings</p>
                    </div>
                    {riderDownlineData.downlineRiders.length > 0 && (
                      <div className="text-center">
                        <p className="text-3xl font-bold">${riderDownlineData.overrideEarnings.toFixed(2)}</p>
                        <p className="text-green-100 text-sm">Team Commission</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-3xl font-bold">{curr.completed_jobs || 0}</p>
                      <p className="text-green-100 text-sm">Completed Jobs</p>
                    </div>
                  </div>
                </div>

                {/* Downline Riders - Only show count and names, not their earnings */}
                {riderDownlineData.downlineRiders.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-800 mb-3">👥 My Team ({riderDownlineData.downlineRiders.length})</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {riderDownlineData.downlineRiders.map((downline: any) => (
                        <div key={downline.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{downline.name}</p>
                            <p className="text-xs text-gray-500">Code: {downline.referral_code}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">{downline.completed_jobs || 0} jobs completed</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        💡 You earn team commission when your team members complete deliveries!
                      </p>
                    </div>
                  </div>
                )}

                {/* Share Referral Code */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">📢 Share Your Referral Code</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`Join MoveIt with my code: ${curr.referral_code}`}
                      readOnly
                      className="flex-1 px-3 py-2 border rounded-lg bg-white text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`Join MoveIt as a rider! Use my referral code: ${curr.referral_code}`);
                        alert('Referral message copied!');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rider Delivery History Page */}
            {showDeliveryHistory && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="text-blue-600" />
                  Delivery History
                </h3>
                
                {/* Stats Summary */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{riderDeliveryHistory.all.length}</p>
                    <p className="text-xs text-gray-600">Total Jobs</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{riderDeliveryHistory.completed.length}</p>
                    <p className="text-xs text-gray-600">Completed</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">{riderDeliveryHistory.active.length}</p>
                    <p className="text-xs text-gray-600">Active</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">${riderDeliveryHistory.totalEarnings.toFixed(2)}</p>
                    <p className="text-xs text-gray-600">Total Earned</p>
                  </div>
                </div>

                {/* Delivery List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {riderDeliveryHistory.all.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No deliveries yet. Accept your first job!</p>
                  ) : (
                    riderDeliveryHistory.all.map((delivery: any) => (
                      <div key={delivery.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{delivery.pickup}</p>
                            <p className="text-sm text-gray-500">→ {delivery.delivery}</p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>📅 {new Date(delivery.created_at).toLocaleDateString()}</span>
                              <span>👤 {delivery.customer_name}</span>
                              {delivery.parcel_size && <span>📦 {delivery.parcel_size}</span>}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-xl font-bold text-green-600">${delivery.price}</p>
                            <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                              delivery.status === 'completed' ? 'bg-green-100 text-green-700' :
                              delivery.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              ['accepted', 'picked-up', 'on-the-way'].includes(delivery.status) ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {(delivery.status || 'unknown').toUpperCase()}
                            </span>
                            {delivery.completed_at && (
                              <p className="text-xs text-gray-400 mt-1">
                                ✓ {new Date(delivery.completed_at).toLocaleString()}
                              </p>
                            )}
                            {delivery.pod_image && (
                              <p className="text-xs text-green-500 mt-1">📸 POD Uploaded</p>
                            )}
                          </div>
                        </div>
                        {/* Earnings breakdown for completed jobs */}
                        {delivery.status === 'completed' && delivery.commissions && (
                          <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                            <span>Your earnings: ${delivery.commissions.activeRider?.toFixed(2) || 'N/A'}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Rider Performance Page - Feature 9 */}
            {showRiderPerformance && riderPerformanceStats && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="text-green-600" />
                  My Performance
                </h3>
                
                {/* Today's Stats */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white mb-4">
                  <h4 className="font-semibold mb-2">📅 Today</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-blue-100 text-sm">Deliveries</p>
                      <p className="text-3xl font-bold">{riderPerformanceStats.todayDeliveries}</p>
                    </div>
                    <div>
                      <p className="text-blue-100 text-sm">Earnings</p>
                      <p className="text-3xl font-bold">${riderPerformanceStats.todayEarnings.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                {/* This Week */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold mb-2">📊 This Week</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">Deliveries</p>
                      <p className="text-2xl font-bold text-gray-800">{riderPerformanceStats.weekDeliveries}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Earnings</p>
                      <p className="text-2xl font-bold text-green-600">${riderPerformanceStats.weekEarnings.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600">{riderPerformanceStats.completionRate}%</p>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-600">{riderPerformanceStats.acceptanceRate}%</p>
                    <p className="text-sm text-gray-600">Acceptance Rate</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-yellow-600">⭐ {riderPerformanceStats.avgRating}</p>
                    <p className="text-sm text-gray-600">Avg Rating</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-purple-600">{riderPerformanceStats.completedJobs}</p>
                    <p className="text-sm text-gray-600">Total Completed</p>
                  </div>
                </div>
              </div>
            )}

            {/* Route Optimization - Feature 8 */}
            {showRouteOptimization && getActiveJobsForRider.length > 1 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Navigation className="text-blue-600" />
                  Route Optimization
                </h3>
                
                <p className="text-gray-600 mb-4">
                  You have {getActiveJobsForRider.length} active jobs. Optimize your route for efficiency.
                </p>

                {/* Current Jobs List */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Current Order:</h4>
                  <div className="space-y-2">
                    {(optimizedRoute.length > 0 ? optimizedRoute : getActiveJobsForRider).map((job: any, idx: number) => (
                      <div key={job.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{job.pickup?.substring(0, 30)}...</p>
                          <p className="text-xs text-gray-500">→ {job.delivery?.substring(0, 30)}...</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          job.status === 'picked-up' ? 'bg-yellow-100 text-yellow-700' :
                          job.status === 'on-the-way' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => optimizeRoute(getActiveJobsForRider)}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    🔄 Auto-Optimize Route
                  </button>
                  
                  <a
                    href={generateOptimizedRouteUrl(optimizedRoute.length > 0 ? optimizedRoute : getActiveJobsForRider)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2 text-center"
                  >
                    <MapPin size={18} />
                    Open in Google Maps
                  </a>
                </div>

                {/* Tips */}
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    💡 <strong>Tip:</strong> The optimizer groups nearby pickups together for efficiency. 
                    For best results, pick up all packages before starting deliveries.
                  </p>
                </div>
              </div>
            )}

            {/* Rider Stats Header */}
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
              
              {/* Multi-job indicator - Feature 5 */}
              {getActiveJobsForRider.length > 0 && (
                <div className="mt-4 pt-4 border-t border-green-400">
                  <p className="text-green-100 text-sm">Active Jobs</p>
                  <p className="text-2xl font-bold">{getActiveJobsForRider.length} job(s) in progress</p>
                </div>
              )}
              
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

            {/* Multi-Job List - Feature 5 */}
            {getActiveJobsForRider.length > 1 && (
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h4 className="font-bold text-gray-800 mb-3">📋 Your Active Jobs ({getActiveJobsForRider.length})</h4>
                <div className="space-y-2">
                  {getActiveJobsForRider.map((job: any, idx: number) => (
                    <div 
                      key={job.id} 
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedJobId === job.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-sm">Job #{idx + 1}: {job.pickup?.substring(0, 20) || 'N/A'}...</p>
                          <p className="text-xs text-gray-500">{job.status?.toUpperCase() || 'UNKNOWN'}</p>
                        </div>
                        <span className="text-lg font-bold text-green-600">${job.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
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
                  {/* Show new fields if available */}
                  {activeJob.recipient_name && (
                    <p className="text-gray-700">Recipient: {activeJob.recipient_name} {activeJob.recipient_phone && `(${activeJob.recipient_phone})`}</p>
                  )}
                  {activeJob.parcel_size && (
                    <p className="text-gray-700">Parcel Size: {activeJob.parcel_size}</p>
                  )}
                  {activeJob.remarks && (
                    <p className="text-gray-600 text-sm mt-2 italic">📝 {activeJob.remarks}</p>
                  )}
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
                      onClick={() => setShowPodModal(true)} 
                      className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      📸 Complete with Photo Proof
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* POD (Proof of Delivery) Modal - Feature 2 */}
            {showPodModal && activeJob && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">📸 Proof of Delivery</h3>
                    <button onClick={() => { setShowPodModal(false); setPodImage(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                      <X size={24} />
                    </button>
                  </div>
                  
                  <p className="text-gray-600 mb-4">Please take a photo of the delivered package as proof of delivery.</p>
                  
                  <div className="space-y-4">
                    {/* Camera Input */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {podImage ? (
                        <div className="space-y-3">
                          <img src={podImage} alt="POD" className="max-h-48 mx-auto rounded-lg" />
                          <button 
                            onClick={() => setPodImage(null)}
                            className="text-red-600 text-sm hover:underline"
                          >
                            Remove & Retake
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            ref={podInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePodCapture}
                            className="hidden"
                          />
                          <button
                            onClick={() => podInputRef.current?.click()}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
                          >
                            📷 Take Photo
                          </button>
                          <p className="text-sm text-gray-500 mt-2">or tap to select from gallery</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Submit Button */}
                    <button
                      onClick={() => submitPodAndComplete(activeJob.id)}
                      disabled={!podImage}
                      className={`w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 ${
                        podImage 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      ✓ Submit & Complete Delivery
                    </button>
                    
                    <p className="text-xs text-gray-400 text-center">
                      Photo will be timestamped: {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!activeJob && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-4">Available Jobs</h3>
                
                {/* Job Filter - Feature 10 */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Search size={18} className="text-gray-500" />
                    <span className="font-medium text-gray-700">Filter Jobs</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Pickup location..."
                      value={riderJobFilter.pickup}
                      onChange={(e) => setRiderJobFilter({...riderJobFilter, pickup: e.target.value})}
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Drop-off location..."
                      value={riderJobFilter.dropoff}
                      onChange={(e) => setRiderJobFilter({...riderJobFilter, dropoff: e.target.value})}
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Customer name..."
                      value={riderJobFilter.customer}
                      onChange={(e) => setRiderJobFilter({...riderJobFilter, customer: e.target.value})}
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  {(riderJobFilter.pickup || riderJobFilter.dropoff || riderJobFilter.customer) && (
                    <button
                      onClick={() => setRiderJobFilter({ pickup: '', dropoff: '', customer: '' })}
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {filteredAvailableJobs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No jobs available right now</p>
                    <p className="text-sm">Check back soon!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">{filteredAvailableJobs.length} job(s) available</p>
                    {filteredAvailableJobs.map((job: any) => {
                      const comm = calculateCommissions(job.price, curr.tier, curr.upline_chain || []);
                      return (
                        <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:border-green-400 hover:shadow-lg transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-lg">{job.pickup} → {job.delivery}</p>
                              <p className="text-sm text-gray-600">{job.timeframe}</p>
                              {job.parcel_size && <p className="text-xs text-gray-500">📦 {job.parcel_size}</p>}
                              {job.remarks && <p className="text-xs text-gray-400 italic mt-1">📝 {job.remarks}</p>}
                            </div>
                            <p className="text-2xl font-bold text-gray-900">${job.price}</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg mb-3">
                            <p className="text-sm text-gray-600 mb-1">You will earn:</p>
                            <p className="text-3xl font-bold text-green-600">${comm.activeRider.toFixed(2)}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Platform fee: $1.00
                            </p>
                          </div>
                          <button 
                            onClick={() => acceptJob(job.id)} 
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                            disabled={gpsPermissionGranted === false}
                          >
                            {gpsPermissionGranted === false ? '⚠️ Enable GPS to Accept' : 'Accept Job'}
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
            {/* Enhanced Admin Dashboard - Feature 4 */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-4">📊 Today's Dashboard</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <p className="text-purple-100 text-sm">Total Orders Today</p>
                  <p className="text-3xl font-bold">{calculateDashboardStats.totalOrdersToday}</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <p className="text-purple-100 text-sm">Pending</p>
                  <p className="text-3xl font-bold text-yellow-300">{calculateDashboardStats.pendingOrders}</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <p className="text-purple-100 text-sm">Out for Delivery</p>
                  <p className="text-3xl font-bold text-blue-300">{calculateDashboardStats.outForDelivery}</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <p className="text-purple-100 text-sm">Delivered Today</p>
                  <p className="text-3xl font-bold text-green-300">{calculateDashboardStats.deliveredToday}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <p className="text-purple-100 text-sm">Active Riders</p>
                  <p className="text-2xl font-bold">🏍️ {calculateDashboardStats.activeRiders}</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <p className="text-purple-100 text-sm">Revenue Today</p>
                  <p className="text-2xl font-bold">💰 ${calculateDashboardStats.totalRevenueToday.toFixed(2)}</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <p className="text-purple-100 text-sm">Admin Earnings</p>
                  <p className="text-2xl font-bold">📈 ${calculateDashboardStats.adminEarningsToday.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Quick Stats Cards */}
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

            {/* POD Management Section - Feature 13 */}
            {adminView === 'pod' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-2xl font-bold mb-6">📸 Proof of Delivery Management</h3>
                
                {/* POD Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600">{podManagementData.withPod.length}</p>
                    <p className="text-sm text-gray-600">With POD</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-red-600">{podManagementData.withoutPod.length}</p>
                    <p className="text-sm text-gray-600">Missing POD</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-600">{podManagementData.completedJobs.length}</p>
                    <p className="text-sm text-gray-600">Total Completed</p>
                  </div>
                </div>

                {/* Missing POD Alert */}
                {podManagementData.withoutPod.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">⚠️ Jobs Missing POD ({podManagementData.withoutPod.length})</h4>
                    <p className="text-sm text-red-600 mb-3">These completed jobs do not have proof of delivery photos.</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {podManagementData.withoutPod.slice(0, 5).map((job: any) => (
                        <div key={job.id} className="flex justify-between items-center p-2 bg-white rounded border">
                          <div>
                            <p className="font-medium text-sm">{job.pickup?.substring(0, 20)}... → {job.delivery?.substring(0, 20)}...</p>
                            <p className="text-xs text-gray-500">Rider: {job.rider_name || 'Unknown'}</p>
                          </div>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">No POD</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* POD List */}
                <h4 className="font-semibold text-gray-800 mb-3">Recent Jobs with POD</h4>
                <div className="space-y-3">
                  {podManagementData.withPod.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No POD photos uploaded yet</p>
                  ) : (
                    podManagementData.withPod.slice(0, 10).map((job: any) => (
                      <div key={job.id} className="border rounded-lg p-4 hover:border-purple-300 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold">{job.pickup} → {job.delivery}</p>
                            <p className="text-sm text-gray-600">Rider: {job.rider_name}</p>
                            <p className="text-sm text-gray-600">Customer: {job.customer_name}</p>
                            {job.pod_timestamp && (
                              <p className="text-xs text-gray-400 mt-1">
                                📅 POD taken: {new Date(job.pod_timestamp).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-lg font-bold text-green-600">${job.price}</span>
                            {job.pod_flagged ? (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">⚠️ Flagged</span>
                            ) : (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">✓ Verified</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setSelectedPodJob(job)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                          >
                            View POD
                          </button>
                          {!job.pod_flagged && (
                            <button
                              onClick={() => flagPodInvalid(job.id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                            >
                              Flag Invalid
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Referral Tree View - Feature 12 */}
            {adminView === 'referrals' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-2xl font-bold mb-6">🌳 Referral Tree (Team Hierarchy)</h3>
                
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-purple-600">{riders.filter((r: any) => r.tier === 1).length}</p>
                    <p className="text-sm text-gray-600">Tier 1 (Root)</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-600">{riders.filter((r: any) => r.tier === 2).length}</p>
                    <p className="text-sm text-gray-600">Tier 2</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600">{riders.filter((r: any) => r.tier === 3).length}</p>
                    <p className="text-sm text-gray-600">Tier 3</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-orange-600">{riders.filter((r: any) => r.tier > 3).length}</p>
                    <p className="text-sm text-gray-600">Tier 4+</p>
                  </div>
                </div>

                {/* Tree View */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-4">Hierarchy View</h4>
                  {referralTreeData.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No riders registered yet</p>
                  ) : (
                    <div className="space-y-4">
                      {referralTreeData.map((rootRider: any) => (
                        <div key={rootRider.id} className="border-l-4 border-purple-500 pl-4">
                          {/* Root Rider */}
                          <div 
                            className="bg-purple-50 p-3 rounded-lg cursor-pointer hover:bg-purple-100"
                            onClick={() => setSelectedRiderForTree(selectedRiderForTree?.id === rootRider.id ? null : rootRider)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-bold text-purple-800">👑 {rootRider.name}</p>
                                <p className="text-sm text-purple-600">Tier 1 | Code: {rootRider.referral_code}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-700">Downline: {rootRider.totalDownline}</p>
                                <p className="text-sm text-green-600">Earnings: ${(rootRider.earnings || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Children (Tier 2) */}
                          {rootRider.children && rootRider.children.length > 0 && (
                            <div className="ml-6 mt-2 space-y-2">
                              {rootRider.children.map((child: any) => (
                                <div key={child.id} className="border-l-4 border-blue-400 pl-4">
                                  <div className="bg-blue-50 p-2 rounded-lg">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-semibold text-blue-800">├─ {child.name}</p>
                                        <p className="text-xs text-blue-600">Tier {child.tier} | Code: {child.referral_code}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs text-gray-600">Downline: {child.totalDownline}</p>
                                        <p className="text-xs text-green-600">${(child.earnings || 0).toFixed(2)}</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Grandchildren (Tier 3+) */}
                                  {child.children && child.children.length > 0 && (
                                    <div className="ml-6 mt-1 space-y-1">
                                      {child.children.map((grandchild: any) => (
                                        <div key={grandchild.id} className="border-l-4 border-green-400 pl-4">
                                          <div className="bg-green-50 p-2 rounded-lg">
                                            <div className="flex justify-between items-center">
                                              <div>
                                                <p className="text-sm font-medium text-green-800">├─ {grandchild.name}</p>
                                                <p className="text-xs text-green-600">Tier {grandchild.tier} | {grandchild.referral_code}</p>
                                              </div>
                                              <p className="text-xs text-green-600">${(grandchild.earnings || 0).toFixed(2)}</p>
                                            </div>
                                          </div>
                                          
                                          {/* Great-grandchildren (Tier 4+) */}
                                          {grandchild.children && grandchild.children.length > 0 && (
                                            <div className="ml-4 mt-1 text-xs text-gray-500">
                                              └─ +{grandchild.children.length} more downline...
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Commission Flow Explanation */}
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-2">💰 Commission Flow</h4>
                  <p className="text-sm text-yellow-700">
                    When a job is completed, commissions flow upward through the referral chain:
                  </p>
                  <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                    <li>Platform takes $1 per job</li>
                    <li>Tier 1 rider: Keeps remaining amount</li>
                    <li>Tier 2 rider: $2 goes to upline (Tier 1)</li>
                    <li>Tier 3 rider: $2 each to uplines (Tier 2 & 1)</li>
                    <li>Tier 4+: 50% to rider, 50% split among uplines</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Reports & Analytics - Feature 14 */}
            {adminView === 'reports' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-2xl font-bold mb-6">📊 Reports & Analytics</h3>
                
                {/* Date Filter */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={reportDateFrom}
                      onChange={(e) => setReportDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={reportDateTo}
                      onChange={(e) => setReportDateTo(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="financial">💰 Financial</option>
                      <option value="operational">📦 Operational</option>
                      <option value="rider">🏍️ Rider Performance</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => { setReportDateFrom(''); setReportDateTo(''); }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => {
                        const data = reportType === 'rider' ? reportsData.riderPerformance : reportsData.dailyData;
                        const headers = reportType === 'rider' 
                          ? ['Name', 'Tier', 'Total_Jobs', 'Completed_Jobs', 'Completion_Rate', 'Revenue', 'Earnings']
                          : ['Date', 'Orders', 'Completed', 'Revenue'];
                        exportToCSV(data, `${reportType}_report`, headers);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                    >
                      <Download size={16} /> Export
                    </button>
                  </div>
                </div>

                {/* Financial Report */}
                {reportType === 'financial' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-600">${reportsData.financial.totalRevenue.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Total Revenue</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-600">${reportsData.financial.completedRevenue.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Completed Revenue</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-purple-600">${reportsData.financial.adminEarnings.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Admin Earnings</p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-orange-600">${reportsData.financial.riderEarnings.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Rider Earnings</p>
                      </div>
                      <div className="bg-pink-50 p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-pink-600">${reportsData.financial.overrideCommissions.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Override Commissions</p>
                      </div>
                    </div>

                    {/* Daily Breakdown Chart */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-4">Daily Revenue Breakdown</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left p-3">Date</th>
                              <th className="text-center p-3">Orders</th>
                              <th className="text-center p-3">Completed</th>
                              <th className="text-right p-3">Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportsData.dailyData.slice(0, 14).map((day: any, idx: number) => (
                              <tr key={idx} className="border-t">
                                <td className="p-3">{day.date}</td>
                                <td className="p-3 text-center">{day.orders}</td>
                                <td className="p-3 text-center text-green-600">{day.completed}</td>
                                <td className="p-3 text-right font-medium">${day.revenue.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Operational Report */}
                {reportType === 'operational' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-blue-600">{reportsData.operational.totalOrders}</p>
                        <p className="text-sm text-gray-600">Total Orders</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-green-600">{reportsData.operational.completedOrders}</p>
                        <p className="text-sm text-gray-600">Completed</p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-yellow-600">{reportsData.operational.pendingOrders}</p>
                        <p className="text-sm text-gray-600">Pending</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-red-600">{reportsData.operational.cancelledOrders}</p>
                        <p className="text-sm text-gray-600">Cancelled</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-purple-600">{reportsData.operational.completionRate}%</p>
                        <p className="text-sm text-gray-600">Completion Rate</p>
                      </div>
                      <div className="bg-indigo-50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-indigo-600">{reportsData.operational.avgDeliveryTime}</p>
                        <p className="text-sm text-gray-600">Avg Delivery (min)</p>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-4">Order Status Distribution</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Completed</span>
                            <span>{reportsData.operational.completedOrders}</span>
                          </div>
                          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500" 
                              style={{ width: `${reportsData.operational.totalOrders > 0 ? (reportsData.operational.completedOrders / reportsData.operational.totalOrders) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Pending</span>
                            <span>{reportsData.operational.pendingOrders}</span>
                          </div>
                          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-yellow-500" 
                              style={{ width: `${reportsData.operational.totalOrders > 0 ? (reportsData.operational.pendingOrders / reportsData.operational.totalOrders) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Cancelled</span>
                            <span>{reportsData.operational.cancelledOrders}</span>
                          </div>
                          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500" 
                              style={{ width: `${reportsData.operational.totalOrders > 0 ? (reportsData.operational.cancelledOrders / reportsData.operational.totalOrders) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rider Performance Report */}
                {reportType === 'rider' && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left p-3">Rider</th>
                          <th className="text-center p-3">Tier</th>
                          <th className="text-center p-3">Total Jobs</th>
                          <th className="text-center p-3">Completed</th>
                          <th className="text-center p-3">Rate</th>
                          <th className="text-right p-3">Revenue</th>
                          <th className="text-right p-3">Earnings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsData.riderPerformance.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-gray-500">No rider data available</td>
                          </tr>
                        ) : (
                          reportsData.riderPerformance.map((rider: any, idx: number) => (
                            <tr key={rider.id} className={`border-t ${idx === 0 ? 'bg-yellow-50' : ''}`}>
                              <td className="p-3 font-medium">
                                {idx === 0 && '🏆 '}{rider.name}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                  Tier {rider.tier}
                                </span>
                              </td>
                              <td className="p-3 text-center">{rider.totalJobs}</td>
                              <td className="p-3 text-center text-green-600">{rider.completedJobs}</td>
                              <td className="p-3 text-center">
                                <span className={`${parseFloat(rider.completionRate) >= 80 ? 'text-green-600' : parseFloat(rider.completionRate) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {rider.completionRate}%
                                </span>
                              </td>
                              <td className="p-3 text-right">${rider.revenue.toFixed(2)}</td>
                              <td className="p-3 text-right font-medium text-green-600">${rider.earnings.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Audit Logs - Feature 15 */}
            {adminView === 'audit' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-2xl font-bold mb-6">📋 Audit Logs</h3>
                
                {/* Filter */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Action</label>
                    <select
                      value={auditLogFilter.action}
                      onChange={(e) => setAuditLogFilter({...auditLogFilter, action: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">All Actions</option>
                      <option value="login">Login</option>
                      <option value="logout">Logout</option>
                      <option value="create_job">Create Job</option>
                      <option value="accept_job">Accept Job</option>
                      <option value="complete_job">Complete Job</option>
                      <option value="edit_rider">Edit Rider</option>
                      <option value="edit_customer">Edit Customer</option>
                      <option value="assign_rider">Assign Rider</option>
                      <option value="flag_pod">Flag POD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by User</label>
                    <input
                      type="text"
                      value={auditLogFilter.user}
                      onChange={(e) => setAuditLogFilter({...auditLogFilter, user: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Search user..."
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => setAuditLogFilter({ action: '', user: '' })}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                {/* Audit Log List */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-3">Timestamp</th>
                        <th className="text-left p-3">Action</th>
                        <th className="text-left p-3">User</th>
                        <th className="text-left p-3">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-gray-500">
                            <p>No audit logs available yet</p>
                            <p className="text-xs mt-2">Actions will be logged when users perform operations</p>
                          </td>
                        </tr>
                      ) : (
                        auditLogs
                          .filter((log: any) => {
                            if (auditLogFilter.action && log.action !== auditLogFilter.action) return false;
                            if (auditLogFilter.user && !log.user_id?.toLowerCase().includes(auditLogFilter.user.toLowerCase())) return false;
                            return true;
                          })
                          .slice(0, 50)
                          .map((log: any, idx: number) => (
                            <tr key={idx} className="border-t hover:bg-gray-50">
                              <td className="p-3 text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  log.action?.includes('login') ? 'bg-blue-100 text-blue-700' :
                                  log.action?.includes('create') ? 'bg-green-100 text-green-700' :
                                  log.action?.includes('edit') ? 'bg-yellow-100 text-yellow-700' :
                                  log.action?.includes('delete') ? 'bg-red-100 text-red-700' :
                                  log.action?.includes('complete') ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="p-3 text-sm">
                                <span className="text-gray-700">{log.user_type}</span>
                                <span className="text-gray-400 text-xs ml-1">({log.user_id?.substring(0, 8)}...)</span>
                              </td>
                              <td className="p-3 text-xs text-gray-500 max-w-xs truncate">
                                {log.details?.substring(0, 50)}...
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Info Box */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Audit logs track all admin actions including rider assignments, 
                    level changes, earnings adjustments, and customer edits. Logs are retained for 90 days.
                  </p>
                </div>
              </div>
            )}

            {/* Admin Settings Page */}
            {adminView === 'settings' && (
              <div className="space-y-6">
                {/* Quick Actions Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => setShowAdminCreateOrder(true)}
                    className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-center"
                  >
                    <Package className="mx-auto text-blue-600 mb-2" size={32} />
                    <p className="font-semibold">Create Order</p>
                    <p className="text-xs text-gray-500">For customer</p>
                  </button>
                  <button
                    onClick={() => { setShowLiveMapView(true); fetchAllRiderLocations(); }}
                    className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-center"
                  >
                    <MapPin className="mx-auto text-green-600 mb-2" size={32} />
                    <p className="font-semibold">Live Map</p>
                    <p className="text-xs text-gray-500">Track riders</p>
                  </button>
                  <button
                    onClick={() => setShowPromotions(true)}
                    className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-center"
                  >
                    <CreditCard className="mx-auto text-purple-600 mb-2" size={32} />
                    <p className="font-semibold">Promotions</p>
                    <p className="text-xs text-gray-500">Manage deals</p>
                  </button>
                  <button
                    onClick={() => setShowBroadcast(true)}
                    className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-center"
                  >
                    <Send className="mx-auto text-orange-600 mb-2" size={32} />
                    <p className="font-semibold">Broadcast</p>
                    <p className="text-xs text-gray-500">Send messages</p>
                  </button>
                </div>

                {/* Delayed Jobs Alert */}
                {getDelayedJobs.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                      <AlertCircle className="text-red-600" />
                      ⚠️ Delayed Jobs ({getDelayedJobs.length})
                    </h4>
                    <p className="text-sm text-red-700 mb-3">These jobs may need attention:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {getDelayedJobs.map((job: any) => (
                        <div key={job.id} className="flex justify-between items-center p-2 bg-white rounded border">
                          <div>
                            <p className="font-medium text-sm">{job.pickup?.substring(0, 25)}...</p>
                            <p className="text-xs text-gray-500">Rider: {job.rider_name || 'Unassigned'} | Status: {job.status}</p>
                          </div>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            {job.status === 'posted' ? 'No rider' : 'Delayed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rider Level Management */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <UserCheck className="text-purple-600" />
                    Rider Management
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left p-3">Rider</th>
                          <th className="text-center p-3">Upline</th>
                          <th className="text-center p-3">Jobs</th>
                          <th className="text-center p-3">Earnings</th>
                          <th className="text-center p-3">Team Size</th>
                          <th className="text-center p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riders.map((rider: any) => {
                          const downlineCount = riders.filter((r: any) => 
                            r.upline_chain?.some((u: any) => u.id === rider.id)
                          ).length;
                          const uplineName = rider.upline_chain?.[0]?.name || 'None (Top Level)';
                          return (
                            <tr key={rider.id} className="border-t hover:bg-gray-50">
                              <td className="p-3">
                                <p className="font-medium">{rider.name}</p>
                                <p className="text-xs text-gray-500">{rider.referral_code}</p>
                              </td>
                              <td className="p-3 text-center text-sm text-gray-600">
                                {uplineName}
                              </td>
                              <td className="p-3 text-center">{rider.completed_jobs || 0}</td>
                              <td className="p-3 text-center text-green-600 font-medium">
                                ${(rider.earnings || 0).toFixed(2)}
                              </td>
                              <td className="p-3 text-center">{downlineCount}</td>
                              <td className="p-3 text-center">
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      if (confirm(`Swap ${rider.name} with ${riders.find((r: any) => r.id === e.target.value)?.name}?\n\nThis will only affect future payouts.`)) {
                                        swapUplineDownline(rider.id, e.target.value);
                                      }
                                      e.target.value = '';
                                    }
                                  }}
                                  className="px-2 py-1 border rounded text-xs"
                                >
                                  <option value="">Swap with...</option>
                                  {riders.filter((r: any) => r.id !== rider.id).map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ Note:</strong> Swapping positions only affects <strong>future payouts</strong>. 
                      Past earnings remain unchanged.
                    </p>
                  </div>
                </div>

                {/* Commission Configuration */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold mb-4">💰 Commission Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-3">Current Formula</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">1. Platform Fee:</span> <strong>$1.00</strong> (always deducted first)</p>
                        <p><span className="text-gray-500">2. Remaining:</span> <strong>Job Fee - $1</strong></p>
                        <p><span className="text-gray-500">3. Rider gets:</span> <strong>50%</strong> of remaining</p>
                        <p><span className="text-gray-500">4. Uplines share:</span> <strong>50%</strong> of remaining (max $2 each)</p>
                        <p><span className="text-gray-500">5. Excess:</span> Goes back to rider</p>
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold mb-3">Examples</h4>
                      <div className="space-y-3 text-sm">
                        <div className="p-2 bg-white rounded">
                          <p className="font-medium">$5 job, 1 upline:</p>
                          <p className="text-gray-600">Platform: $1 | Rider: $2 | Upline: $2</p>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <p className="font-medium">$5 job, 3 uplines:</p>
                          <p className="text-gray-600">Platform: $1 | Rider: $2 | Each upline: $0.66</p>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <p className="font-medium">$10 job, 2 uplines:</p>
                          <p className="text-gray-600">Platform: $1 | Rider: $4.50 + $0.50 = $5 | Each upline: $2</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin Create Order Modal */}
        {showAdminCreateOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Create Order for Customer</h3>
                <button onClick={() => setShowAdminCreateOrder(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer</label>
                  <select
                    value={adminOrderForm.customerId}
                    onChange={(e) => {
                      const cust = customers.find((c: any) => c.id === e.target.value);
                      setAdminOrderForm({
                        ...adminOrderForm,
                        customerId: e.target.value,
                        customerName: cust?.name || '',
                        customerPhone: cust?.phone || ''
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address</label>
                  <input
                    type="text"
                    value={adminOrderForm.pickup}
                    onChange={(e) => setAdminOrderForm({...adminOrderForm, pickup: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., 123 Orchard Road"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                  <input
                    type="text"
                    value={adminOrderForm.delivery}
                    onChange={(e) => setAdminOrderForm({...adminOrderForm, delivery: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., 456 Marina Bay"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                    <input
                      type="number"
                      value={adminOrderForm.price}
                      onChange={(e) => setAdminOrderForm({...adminOrderForm, price: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parcel Size</label>
                    <select
                      value={adminOrderForm.parcelSize}
                      onChange={(e) => setAdminOrderForm({...adminOrderForm, parcelSize: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    value={adminOrderForm.remarks}
                    onChange={(e) => setAdminOrderForm({...adminOrderForm, remarks: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                  />
                </div>
                <button
                  onClick={adminCreateOrderForCustomer}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Create Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Map View Modal */}
        {showLiveMapView && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <MapPin className="text-green-600" />
                  Live Rider Locations
                </h3>
                <button onClick={() => setShowLiveMapView(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-600">{allRiderLocations.length}</p>
                  <p className="text-sm text-gray-600">Active Riders on GPS</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {jobs.filter((j: any) => ['accepted', 'picked-up', 'on-the-way'].includes(j.status)).length}
                  </p>
                  <p className="text-sm text-gray-600">Active Deliveries</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                {allRiderLocations.length > 0 ? (
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                      Math.min(...allRiderLocations.map(l => l.longitude)) - 0.02
                    }%2C${
                      Math.min(...allRiderLocations.map(l => l.latitude)) - 0.02
                    }%2C${
                      Math.max(...allRiderLocations.map(l => l.longitude)) + 0.02
                    }%2C${
                      Math.max(...allRiderLocations.map(l => l.latitude)) + 0.02
                    }&layer=mapnik`}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-100">
                    <p className="text-gray-500">No riders currently sharing GPS location</p>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {allRiderLocations.map((loc: any) => {
                  const rider = riders.find((r: any) => r.id === loc.rider_id);
                  return (
                    <div key={loc.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{rider?.name || 'Unknown Rider'}</p>
                        <p className="text-xs text-gray-500">Last update: {new Date(loc.updated_at).toLocaleTimeString()}</p>
                      </div>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=17/${loc.latitude}/${loc.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                      >
                        View on Map
                      </a>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={fetchAllRiderLocations}
                className="mt-4 w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                🔄 Refresh Locations
              </button>
            </div>
          </div>
        )}

        {/* Promotions Modal */}
        {showPromotions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">🎉 Promotions & Deals</h3>
                <button onClick={() => setShowPromotions(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              {/* Create New Promotion */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-3">Create New Promotion</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
                    <input
                      type="text"
                      value={newPromotion.code}
                      onChange={(e) => setNewPromotion({...newPromotion, code: e.target.value.toUpperCase()})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., SAVE10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                    <select
                      value={newPromotion.discountType}
                      onChange={(e) => setNewPromotion({...newPromotion, discountType: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="fixed">Fixed Amount ($)</option>
                      <option value="percent">Percentage (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                    <input
                      type="number"
                      value={newPromotion.discountValue}
                      onChange={(e) => setNewPromotion({...newPromotion, discountValue: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                    <input
                      type="number"
                      value={newPromotion.maxUses}
                      onChange={(e) => setNewPromotion({...newPromotion, maxUses: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={createPromotion}
                  className="mt-4 w-full py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                >
                  Create Promotion
                </button>
              </div>

              {/* Existing Promotions */}
              <h4 className="font-semibold text-gray-800 mb-3">Active Promotions</h4>
              {promotions.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No promotions created yet</p>
              ) : (
                <div className="space-y-2">
                  {promotions.map((promo: any) => (
                    <div key={promo.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-bold text-purple-600">{promo.code}</p>
                        <p className="text-sm text-gray-600">
                          {promo.discount_type === 'fixed' ? `$${promo.discount_value} off` : `${promo.discount_value}% off`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{promo.uses_count || 0} / {promo.max_uses} used</p>
                        <span className={`text-xs px-2 py-1 rounded ${promo.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {promo.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Broadcast Modal */}
        {showBroadcast && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">📢 Broadcast Message</h3>
                <button onClick={() => setShowBroadcast(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Send To</label>
                  <select
                    value={broadcastMessage.target}
                    onChange={(e) => setBroadcastMessage({...broadcastMessage, target: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="all_riders">All Riders ({riders.length})</option>
                    <option value="all_customers">All Customers ({customers.length})</option>
                    <option value="all">Everyone ({riders.length + customers.length})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={broadcastMessage.subject}
                    onChange={(e) => setBroadcastMessage({...broadcastMessage, subject: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Important Update"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={broadcastMessage.message}
                    onChange={(e) => setBroadcastMessage({...broadcastMessage, message: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={4}
                    placeholder="Type your message here..."
                  />
                </div>
                <button
                  onClick={sendBroadcast}
                  className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  Send Broadcast
                </button>
              </div>
            </div>
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

        {/* POD View Modal */}
        {selectedPodJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">📸 Proof of Delivery</h3>
                <button onClick={() => setSelectedPodJob(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold">{selectedPodJob.pickup} → {selectedPodJob.delivery}</p>
                <p className="text-sm text-gray-600">Rider: {selectedPodJob.rider_name}</p>
                <p className="text-sm text-gray-600">Customer: {selectedPodJob.customer_name}</p>
              </div>
              
              {selectedPodJob.pod_image ? (
                <div className="text-center">
                  <img 
                    src={selectedPodJob.pod_image.includes('truncated') ? '/placeholder-pod.png' : selectedPodJob.pod_image} 
                    alt="Proof of Delivery" 
                    className="max-h-64 mx-auto rounded-lg border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" fill="%23f0f0f0"><rect width="200" height="150"/><text x="50%" y="50%" fill="%23999" font-family="Arial" font-size="14" text-anchor="middle">POD Image</text></svg>';
                    }}
                  />
                  {selectedPodJob.pod_timestamp && (
                    <p className="text-sm text-gray-500 mt-2">
                      Captured: {new Date(selectedPodJob.pod_timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No POD image available</p>
                </div>
              )}
              
              <div className="mt-4 flex gap-2">
                {!selectedPodJob.pod_flagged && (
                  <button
                    onClick={() => { flagPodInvalid(selectedPodJob.id); setSelectedPodJob(null); }}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Flag as Invalid
                  </button>
                )}
                <button
                  onClick={() => setSelectedPodJob(null)}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
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
