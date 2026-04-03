'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package, User, TrendingUp, LogOut, Lock, UserPlus, Edit2, Trash2, CreditCard, QrCode, X, Navigation, AlertCircle, Search, Download, ChevronLeft, ChevronRight, FileText, Calendar, Upload, MapPin, Eye, UserCheck, BarChart3, Clock, CheckCircle, XCircle, Send, Link, Check, RefreshCw } from 'lucide-react';

const SUPABASE_URL = 'https://esylsugzysfjntukmxks.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzeWxzdWd6eXNmam50dWtteGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDgyODEsImV4cCI6MjA4NDYyNDI4MX0.Ldbk29uDGte1ue7LSAzEoHjAJNjYToAA2zyHWloS2fI';
const PAYNOW_UEN = "202012697W";
const MERCHANT_NAME = "The Food Thinker Pte Ltd";
const ITEMS_PER_PAGE = 10;

/* eslint-disable @typescript-eslint/no-explicit-any */
const api = async (endpoint: string, method = 'GET', body: any = null, retries = 2): Promise<any> => {
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
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const text = await res.text();
      console.log(`[API Response] Status: ${res.status}`, text.substring(0, 200));
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e: any) {
        throw new Error(`Invalid JSON response: ${text}`);
      }
      
      if (!res.ok) {
        const errorMsg = data.message || data.error || data.hint || JSON.stringify(data);
        // If timeout error, retry
        if (errorMsg.includes('timeout') && attempt < retries) {
          console.log(`[API] Timeout, retrying... (attempt ${attempt + 1}/${retries})`);
          await new Promise(r => setTimeout(r, 1000)); // Wait 1 second before retry
          continue;
        }
        throw new Error(`${res.status}: ${errorMsg}`);
      }
      return data;
    } catch (err: any) {
      // If aborted (timeout) or network error, retry
      if ((err.name === 'AbortError' || err.message?.includes('timeout')) && attempt < retries) {
        console.log(`[API] Request timeout, retrying... (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      console.error(`[API Error] ${method} ${endpoint}:`, err);
      throw err;
    }
  }
  throw new Error('Max retries reached');
};

// Haversine formula to calculate distance between two lat/lng points in km
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Extract 6-digit Singapore postal code from an address string
const extractPostalCode = (address: string): string | null => {
  const match = address.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
};

// Extract general area name from Singapore address
const extractAreaName = (address: string): string => {
  if (!address) return '';
  const upper = address.toUpperCase();
  
  // Known Singapore estates/areas - check for these first
  const areas = [
    'ANG MO KIO', 'BEDOK', 'BISHAN', 'BUKIT BATOK', 'BUKIT MERAH', 'BUKIT PANJANG', 
    'BUKIT TIMAH', 'CENTRAL', 'CHOA CHU KANG', 'CLEMENTI', 'GEYLANG', 'HOUGANG',
    'JURONG EAST', 'JURONG WEST', 'KALLANG', 'MARINE PARADE', 'PASIR RIS', 'PUNGGOL',
    'QUEENSTOWN', 'SENGKANG', 'SERANGOON', 'TAMPINES', 'TOA PAYOH', 'WOODLANDS',
    'YISHUN', 'SEMBAWANG', 'SIMEI', 'CHANGI', 'CANBERRA', 'TENGAH', 'ORCHARD',
    'TANJONG PAGAR', 'CHINATOWN', 'LITTLE INDIA', 'BUGIS', 'LAVENDER', 'NOVENA',
    'NEWTON', 'RIVER VALLEY', 'TIONG BAHRU', 'ALEXANDRA', 'HARBOURFRONT', 'SENTOSA',
    'MARINA BAY', 'RAFFLES PLACE', 'CITY HALL', 'DHOBY GHAUT', 'BOON LAY', 'PIONEER',
    'LAKESIDE', 'DOVER', 'HOLLAND', 'COMMONWEALTH', 'REDHILL', 'MOUNTBATTEN',
    'KATONG', 'SIGLAP', 'EAST COAST', 'UPPER SERANGOON', 'KOVAN', 'LORONG CHUAN',
    'MACPHERSON', 'POTONG PASIR', 'BIDADARI', 'EUNOS', 'PAYA LEBAR', 'UBI',
    'KEMBANGAN', 'TANAH MERAH', 'UPPER CHANGI', 'LOYANG', 'FLORA', 'FERNVALE',
    'ANCHORVALE', 'COMPASSVALE', 'RIVERVALE', 'SUMANG', 'MATILDA', 'WATERWAY',
    'ADMIRALTY', 'MARSILING', 'SPRINGLEAF', 'LENTOR', 'MAYFLOWER',
    'FLORENCE', 'UPPER THOMSON', 'THOMSON', 'MARYMOUNT', 'BRADDELL',
    'BENDEMEER', 'BOON KENG', 'FARRER PARK', 'ROCHOR', 'JALAN BESAR',
    'TUAS', 'KRANJI', 'LIM CHU KANG', 'MANDAI', 'SELETAR', 'YISHUN'
  ];
  
  for (const area of areas) {
    if (upper.includes(area)) {
      // Title case
      return area.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
    }
  }
  
  // Try to extract building/estate name from parentheses e.g. "(TREASURE CREST)"
  const bracketMatch = address.match(/\(([^)]+)\)/);
  if (bracketMatch) {
    const name = bracketMatch[1].trim();
    if (name.length > 3 && name.length < 30) {
      return name.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }
  
  // Try to extract road name (take first meaningful words before Singapore/postal)
  const roadMatch = address.match(/\d*[A-Z]?\s+([A-Z][A-Z\s]+?)(?:\s+(?:Singapore|S\d{6}|\d{6}|#))/i);
  if (roadMatch) {
    const road = roadMatch[1].trim();
    if (road.length > 3) {
      return road.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }
  
  // Fallback: take first 20 chars
  return address.substring(0, 20) + (address.length > 20 ? '...' : '');
};

// Format date/time in Singapore timezone (SGT, UTC+8)
const formatSGT = (dateStr: string | Date): string => {
  try {
    return new Date(dateStr).toLocaleString('en-SG', { 
      timeZone: 'Asia/Singapore',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return new Date(dateStr).toLocaleString();
  }
};

const formatSGTDate = (dateStr: string | Date): string => {
  try {
    return new Date(dateStr).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' });
  } catch {
    return new Date(dateStr).toLocaleDateString();
  }
};

const formatSGTTime = (dateStr: string | Date): string => {
  try {
    return new Date(dateStr).toLocaleTimeString('en-SG', { 
      timeZone: 'Asia/Singapore',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return new Date(dateStr).toLocaleTimeString();
  }
};

// Format delivery date from yyyy-mm-dd to dd-mm-yyyy
const formatDeliveryDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

const calculateCommissions = (deliveryFee: number, riderTier: number, uplineChain: any[], totalStops: number = 1): any => {
  const platformFee = 1 * totalStops; // $1 per drop-off
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
  const [editJob, setEditJob] = useState<any>(null);
  const [showCreateRider, setShowCreateRider] = useState(false);
  const [createRiderForm, setCreateRiderForm] = useState({ name: '', email: '', password: '', phone: '', tier: 1, employment_type: 'part-time', vehicle_type: 'bike', referralCode: '' });
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmt, setTopUpAmt] = useState('');
  const [payNowQR, setPayNowQR] = useState('');
  const [jobForm, setJobForm] = useState({ 
    pickup: '', 
    pickupUnitNo: '', // New unit no field
    pickupContact: '',
    pickupPhone: '',
    stops: [{ address: '', unitNo: '', recipientName: '', recipientPhone: '' }], // Multi-stop support with unit no
    timeframe: '', 
    deliveryDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }),
    price: '10',
    parcelSize: 'small',
    remarks: ''
  });
  const [useMyProfile, setUseMyProfile] = useState(true); // Auto-fill pickup contact with customer profile
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
  const [showManualJobForm, setShowManualJobForm] = useState(false);
  const [adminJobForm, setAdminJobForm] = useState({
    customerName: '',
    customerPhone: '',
    pickup: '',
    pickupUnitNo: '',
    pickupContact: '',
    pickupPhone: '',
    stops: [{ address: '', unitNo: '', recipientName: '', recipientPhone: '' }],
    timeframe: '',
    deliveryDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }),
    price: '10',
    parcelSize: 'small',
    remarks: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live GPS Tracking states
  const [isTrackingGPS, setIsTrackingGPS] = useState(false);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showLiveMap, setShowLiveMap] = useState<any>(null);
  const [riderLocation, setRiderLocation] = useState<any>(null);
  const [allRiderLocations, setAllRiderLocations] = useState<any[]>([]); // All rider GPS locations for admin
  const [selectedJobsForAccept, setSelectedJobsForAccept] = useState<string[]>([]); // Multi-job selection
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // POD (Proof of Delivery) states
  const [podImage, setPodImage] = useState<string | null>(null);
  const [showPodModal, setShowPodModal] = useState(false);
  const [podStopIndex, setPodStopIndex] = useState<number>(0); // Current stop being photographed
  const [stopPods, setStopPods] = useState<any[]>([]); // Array of {stopIndex, image, timestamp, address}
  const podInputRef = useRef<HTMLInputElement>(null);
  const podGalleryRef = useRef<HTMLInputElement>(null); // Separate ref for gallery selection

  // Rider online status and notifications
  const [riderIsOnline, setRiderIsOnline] = useState(false);
  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(false);
  const [showCustomerWallet, setShowCustomerWallet] = useState<any>(null);
  const [riderHasGPS, setRiderHasGPS] = useState(false);
  const [newJobNotifications, setNewJobNotifications] = useState<any[]>([]);
  const [lastJobCheck, setLastJobCheck] = useState<string | null>(null);

  // Customer urgent/boost states
  const [showBoostModal, setShowBoostModal] = useState<any>(null);
  const [boostAmount, setBoostAmount] = useState('');

  // Admin wallet viewer
  const [viewingWallet, setViewingWallet] = useState<any>(null);

  // Multi-job support states
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [expandedActiveJob, setExpandedActiveJob] = useState(false);

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
  const [jobDistanceCache, setJobDistanceCache] = useState<Record<string, {distances: number[], totalDistance: number}>>({});

  // GPS Enforcement state (Feature 11)
  const [gpsPermissionGranted, setGpsPermissionGranted] = useState<boolean | null>(null);
  const [showGpsWarning, setShowGpsWarning] = useState(false);

  // Admin POD Management states (Feature 13)
  const [showPodManagement, setShowPodManagement] = useState(false);
  const [selectedPodJob, setSelectedPodJob] = useState<any>(null);
  const [viewingPodImage, setViewingPodImage] = useState<string | null>(null); // For fullscreen POD view

  // Admin Withdrawal Management states
  const [showWithdrawalManagement, setShowWithdrawalManagement] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState({ status: 'all', search: '', dateFrom: '', dateTo: '' });

  // Rider Withdrawal Form state
  const [withdrawMethod, setWithdrawMethod] = useState<'paynow' | 'bank'>('paynow');
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    fullName: '',
    mobileNumber: '',
    bankName: '',
    paynowNo: '',
    bankAccountNo: ''
  });

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
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState<any>(null);
  const [promoError, setPromoError] = useState('');
  const [editingPromo, setEditingPromo] = useState<any>(null);
  const [customerNotifications, setCustomerNotifications] = useState<any[]>([]);
  const [prevJobStatuses, setPrevJobStatuses] = useState<any>({});

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
      
      // Handle direct portal access via URL parameter
      const portalParam = urlParams.get('portal');
      if (portalParam && ['customer', 'rider', 'admin'].includes(portalParam)) {
        setView(portalParam);
      }
      
      // Handle Stripe payment return
      const topupStatus = urlParams.get('topup');
      const sessionId = urlParams.get('session_id');
      if (topupStatus === 'success' && sessionId) {
        // Payment successful - show success message and reload data
        setTimeout(() => {
          alert('🎉 Payment successful! Your credits have been added to your account.');
          // Clear URL parameters
          window.history.replaceState({}, '', window.location.pathname);
          loadData();
        }, 500);
      } else if (topupStatus === 'cancelled') {
        alert('Payment was cancelled. No charges were made.');
        window.history.replaceState({}, '', window.location.pathname);
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

  // GPS Permission Check for Riders (Feature 11) - Non-blocking, lenient check
  useEffect(() => {
    if (auth.type === 'rider' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      // Try to get position with lenient settings - don't block the rider
      navigator.geolocation.getCurrentPosition(
        () => {
          setGpsPermissionGranted(true);
          setShowGpsWarning(false);
        },
        () => {
          // Don't block - just set to null (unknown) instead of false
          // GPS will be checked again when rider tries to go online or accept a job
          setGpsPermissionGranted(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000 // Accept cached position up to 1 minute old
        }
      );
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
  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePodCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setPodImage(compressed);
    }
  };

  // Submit POD for current stop immediately to database
  const submitStopPod = async () => {
    if (!podImage || !activeJob) return;
    const stops = activeJob.stops || [];
    const totalStops = stops.length || 1;
    const stopAddress = stops[podStopIndex]?.address || `Drop-off ${podStopIndex + 1}`;
    
    const newPod = {
      stopIndex: podStopIndex,
      image: podImage,
      timestamp: new Date().toISOString(),
      address: stopAddress
    };
    
    try {
      // Get existing pod_images from the job (in case some stops already submitted)
      const freshJob = await api(`jobs?id=eq.${activeJob.id}`);
      const existingPodImages = (freshJob && freshJob[0]?.pod_images) || [];
      
      // Replace or add this stop's photo
      const updatedPodImages = [...existingPodImages.filter((p: any) => p.stopIndex !== podStopIndex), newPod]
        .sort((a: any, b: any) => a.stopIndex - b.stopIndex);
      
      const updatedPodStops = updatedPodImages.map((p: any) => ({ 
        stopIndex: p.stopIndex, timestamp: p.timestamp, address: p.address, hasImage: true 
      }));
      
      // Save to database immediately — customer and admin can see it right away
      await api(`jobs?id=eq.${activeJob.id}`, 'PATCH', {
        pod_images: updatedPodImages,
        pod_stops: updatedPodStops,
        pod_image: updatedPodImages[0]?.image || podImage, // backward compatibility
        pod_timestamp: new Date().toISOString()
      });
      
      // Update local state
      setStopPods(updatedPodImages);
      setPodImage(null);
      
      if (podStopIndex < totalStops - 1) {
        // More stops to go — advance to next
        setPodStopIndex(podStopIndex + 1);
        alert(`✅ Drop-off ${podStopIndex + 1} photo submitted!\n\nProceeding to Drop-off ${podStopIndex + 2}.`);
      } else {
        // Last stop — photo saved, now rider can complete the job
        alert(`✅ Drop-off ${podStopIndex + 1} photo submitted!\n\nAll ${totalStops} drop-offs have photos. You can now complete the delivery.`);
      }
      
      loadData();
    } catch (e: any) {
      alert('Error submitting photo: ' + e.message);
    }
  };

  const submitPodAndComplete = async (jobId: string) => {
    const totalStops = activeJob?.stops?.length || 1;
    
    if (totalStops > 1) {
      // For multi-stop: check all stops have photos in the database
      const freshJob = await api(`jobs?id=eq.${jobId}`);
      const savedPods = (freshJob && freshJob[0]?.pod_images) || [];
      if (savedPods.length < totalStops) {
        alert(`Please submit photos for all ${totalStops} drop-offs before completing.\nYou have ${savedPods.length}/${totalStops} photos submitted.`);
        return;
      }
    } else {
      // For single-stop: require current photo
      if (!podImage && stopPods.length === 0) {
        alert('Please capture a photo as proof of delivery');
        return;
      }
    }
    
    try {
      if (totalStops === 1) {
        // Single stop — save photo and complete in one go
        const podData = [{
          stopIndex: 0,
          image: podImage,
          timestamp: new Date().toISOString(),
          address: activeJob?.stops?.[0]?.address || activeJob?.delivery || 'Delivery'
        }];
        
        await api(`jobs?id=eq.${jobId}`, 'PATCH', {
          status: 'completed',
          completed_at: new Date().toISOString(),
          pod_image: podImage,
          pod_timestamp: new Date().toISOString(),
          pod_stops: podData.map(p => ({ stopIndex: p.stopIndex, timestamp: p.timestamp, address: p.address, hasImage: true })),
          pod_images: podData
        });
      } else {
        // Multi-stop — photos already submitted per stop, just mark as completed
        await api(`jobs?id=eq.${jobId}`, 'PATCH', {
          status: 'completed',
          completed_at: new Date().toISOString()
        });
      }
      
      // Update rider earnings
      const job = jobs.find((j: any) => j.id === jobId);
      if (job && auth.id) {
        const riderData = riders.find((r: any) => r.id === auth.id);
        if (riderData) {
          const comm = calculateCommissions(job.price, riderData.tier, riderData.upline_chain || [], job.total_stops || 1);
          
          await api(`riders?id=eq.${auth.id}`, 'PATCH', {
            earnings: (riderData.earnings || 0) + comm.activeRider,
            completed_jobs: (riderData.completed_jobs || 0) + 1
          });
          
          for (const up of comm.uplines) {
            const upRider = riders.find((r: any) => r.id === up.riderId);
            if (upRider) {
              await api(`riders?id=eq.${up.riderId}`, 'PATCH', { 
                earnings: (upRider.earnings || 0) + up.amount 
              });
            }
          }
          
          await api(`jobs?id=eq.${jobId}`, 'PATCH', { commissions: comm });
        }
      }
      
      setPodImage(null);
      setStopPods([]);
      setPodStopIndex(0);
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
    
    const todayJobs = jobs.filter((j: any) => j.created_at && new Date(j.created_at) >= today);
    
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
      riderEarningsToday,
      totalStripeReceived: customers.reduce((sum: any, c: any) => sum + (c.credits || 0), 0) + jobs.filter((j: any) => j.status !== 'cancelled').reduce((sum: number, j: any) => sum + (parseFloat(j.price) || 0), 0),
      totalCustomerWallets: customers.reduce((sum: any, c: any) => sum + (c.credits || 0), 0)
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
    const todayJobs = completedJobs.filter((j: any) => {
      const dateStr = j.completed_at || j.created_at;
      return dateStr && new Date(dateStr) >= today;
    });
    const todayEarnings = todayJobs.reduce((sum: number, j: any) => {
      const rider = riders.find((r: any) => r.id === auth.id);
      if (rider) {
        const comm = calculateCommissions(j.price, rider.tier, rider.upline_chain || [], j.total_stops || 1);
        return sum + comm.activeRider;
      }
      return sum;
    }, 0);
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekJobs = completedJobs.filter((j: any) => {
      const dateStr = j.completed_at || j.created_at;
      return dateStr && new Date(dateStr) >= thisWeek;
    });
    const weekEarnings = weekJobs.reduce((sum: number, j: any) => {
      const rider = riders.find((r: any) => r.id === auth.id);
      if (rider) {
        const comm = calculateCommissions(j.price, rider.tier, rider.upline_chain || [], j.total_stops || 1);
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
    
    // Sort: urgent/boosted jobs first, then by creation date (newest first)
    availableJobs.sort((a: any, b: any) => {
      if (a.is_urgent && !b.is_urgent) return -1;
      if (!a.is_urgent && b.is_urgent) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
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
        const comm = calculateCommissions(job.price, rider.tier, rider.upline_chain || [], job.total_stops || 1);
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
      const date = formatSGTDate(job.created_at);
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
      const logs = await api('audit_logs?order=timestamp.desc&limit=50');
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
      // If table doesn't exist, use empty array
      setAuditLogs([]);
    }
  };

  // Load withdrawal requests for admin management
  const loadWithdrawalRequests = async () => {
    try {
      const logs = await api('audit_logs?action=eq.withdrawal_request&order=timestamp.desc');
      // Parse details if it's a string
      const parsed = (Array.isArray(logs) ? logs : []).map((log: any) => ({
        ...log,
        details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
      }));
      setWithdrawalRequests(parsed);
    } catch (e) {
      console.error('Failed to load withdrawal requests:', e);
      setWithdrawalRequests([]);
    }
  };

  // Approve/Reject withdrawal request
  const processWithdrawalRequest = async (requestId: string, action: 'approved' | 'rejected' | 'completed', request: any) => {
    try {
      // Update the withdrawal request status
      await api(`audit_logs?id=eq.${requestId}`, 'PATCH', {
        details: JSON.stringify({
          ...request.details,
          status: action,
          processedAt: action === 'completed' ? request.details.processedAt : new Date().toISOString(),
          completedAt: action === 'completed' ? new Date().toISOString() : request.details.completedAt,
          processedBy: 'admin'
        })
      });

      // If rejected, return the balance to rider (since it was deducted on submission)
      if (action === 'rejected') {
        const rider = riders.find(r => r.id === request.details.riderId);
        if (rider) {
          const newEarnings = (rider.earnings || 0) + request.details.amount;
          await api(`riders?id=eq.${request.details.riderId}`, 'PATCH', {
            earnings: newEarnings
          });
        }
      }

      // Log the action
      await logAuditAction(`withdrawal_${action}`, {
        requestId,
        riderId: request.details.riderId,
        riderName: request.details.riderName,
        amount: request.details.amount,
        withdrawMethod: request.details.withdrawMethod,
        bankName: request.details.bankName
      });

      // Show appropriate message
      if (action === 'approved') {
        const paymentDetails = request.details.withdrawMethod === 'paynow' 
          ? `PayNow: ${request.details.paynowNo}` 
          : `Bank: ${request.details.bankName} - ${request.details.bankAccountNo}`;
        alert(`Withdrawal request APPROVED!\n\nRider: ${request.details.riderName}\nAmount: $${request.details.amount?.toFixed(2)}\n${paymentDetails}\n\nThe rider will be notified that the request is being processed.`);
      } else if (action === 'rejected') {
        alert(`Withdrawal request REJECTED.\n\nRider: ${request.details.riderName}\nAmount: $${request.details.amount?.toFixed(2)}\n\nThe balance has been returned to the rider. The rider will be notified to resubmit if needed.`);
      } else if (action === 'completed') {
        alert(`Payment COMPLETED!\n\nRider: ${request.details.riderName}\nAmount: $${request.details.amount?.toFixed(2)}\n\nThe rider will be notified that payment has been received.`);
      }
      
      loadWithdrawalRequests();
      loadData(); // Refresh rider data
    } catch (e: any) {
      alert('Error processing request: ' + e.message);
    }
  };

  // Export withdrawal report
  const exportWithdrawalReport = (format: 'csv' | 'pdf') => {
    const filteredRequests = withdrawalRequests.filter((req: any) => {
      if (withdrawalFilter.status !== 'all') {
        const status = req.details?.status || 'pending';
        if (status !== withdrawalFilter.status) return false;
      }
      if (withdrawalFilter.search && !req.details?.riderName?.toLowerCase().includes(withdrawalFilter.search.toLowerCase())) return false;
      if (withdrawalFilter.dateFrom && new Date(req.timestamp) < new Date(withdrawalFilter.dateFrom)) return false;
      if (withdrawalFilter.dateTo && new Date(req.timestamp) > new Date(withdrawalFilter.dateTo + 'T23:59:59')) return false;
      return true;
    });

    if (format === 'csv') {
      const headers = ['Date', 'Full Name', 'Mobile', 'Amount', 'Method', 'Bank', 'PayNow/Account No', 'Status'];
      const rows = filteredRequests.map((req: any) => [
        formatSGTDate(req.timestamp),
        req.details?.fullName || req.details?.riderName || 'N/A',
        req.details?.mobileNumber || req.details?.riderPhone || 'N/A',
        `$${req.details?.amount?.toFixed(2) || '0.00'}`,
        req.details?.withdrawMethod || 'N/A',
        req.details?.bankName || 'N/A',
        req.details?.withdrawMethod === 'paynow' ? (req.details?.paynowNo || 'N/A') : (req.details?.bankAccountNo || 'N/A'),
        req.details?.status || 'pending'
      ]);
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `withdrawal_report_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }

    if (format === 'pdf') {
      // Calculate totals
      const totalAmount = filteredRequests.reduce((sum: number, req: any) => sum + (req.details?.amount || 0), 0);
      const pendingCount = filteredRequests.filter((r: any) => r.details?.status === 'pending').length;
      const approvedCount = filteredRequests.filter((r: any) => r.details?.status === 'approved').length;
      const rejectedCount = filteredRequests.filter((r: any) => r.details?.status === 'rejected').length;

      // Generate HTML for PDF
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Withdrawal Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #7C3AED; padding-bottom: 20px; }
            .header h1 { color: #7C3AED; margin: 0; }
            .header p { color: #666; margin: 5px 0; }
            .summary { display: flex; justify-content: space-around; margin-bottom: 30px; }
            .summary-box { text-align: center; padding: 15px 25px; border-radius: 8px; }
            .summary-box.pending { background: #FEF3C7; }
            .summary-box.approved { background: #D1FAE5; }
            .summary-box.rejected { background: #FEE2E2; }
            .summary-box.total { background: #E0E7FF; }
            .summary-box h3 { margin: 0; font-size: 24px; }
            .summary-box p { margin: 5px 0 0; font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #7C3AED; color: white; padding: 12px; text-align: left; }
            td { padding: 10px 12px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background: #f9f9f9; }
            .status { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
            .status.pending { background: #FEF3C7; color: #92400E; }
            .status.approved { background: #D1FAE5; color: #065F46; }
            .status.rejected { background: #FEE2E2; color: #991B1B; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            .amount { text-align: right; font-weight: bold; color: #059669; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>💰 Withdrawal Report</h1>
            <p>Generated: ${formatSGT(new Date())}</p>
            ${withdrawalFilter.dateFrom || withdrawalFilter.dateTo ? 
              `<p>Period: ${withdrawalFilter.dateFrom || 'Start'} to ${withdrawalFilter.dateTo || 'Present'}</p>` : ''}
          </div>

          <div class="summary">
            <div class="summary-box pending">
              <h3>${pendingCount}</h3>
              <p>Pending</p>
            </div>
            <div class="summary-box approved">
              <h3>${approvedCount}</h3>
              <p>Approved</p>
            </div>
            <div class="summary-box rejected">
              <h3>${rejectedCount}</h3>
              <p>Rejected</p>
            </div>
            <div class="summary-box total">
              <h3>$${totalAmount.toFixed(2)}</h3>
              <p>Total Amount</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Rider Name</th>
                <th>Phone</th>
                <th>Amount</th>
                <th>Account</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRequests.map((req: any) => `
                <tr>
                  <td>${formatSGTDate(req.timestamp)}</td>
                  <td>${req.details?.riderName || 'N/A'}</td>
                  <td>${req.details?.riderPhone || 'N/A'}</td>
                  <td class="amount">$${req.details?.amount?.toFixed(2) || '0.00'}</td>
                  <td>${req.details?.account || 'N/A'}</td>
                  <td><span class="status ${req.details?.status || 'pending'}">${(req.details?.status || 'pending').toUpperCase()}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>MoveIt Delivery Platform - Withdrawal Report</p>
            <p>Total Records: ${filteredRequests.length}</p>
          </div>
        </body>
        </html>
      `;

      // Open print dialog (user can save as PDF)
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
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
  const calculateProjectedEarnings = (jobPrice: number, totalStops: number = 1) => {
    const rider = riders.find((r: any) => r.id === auth.id);
    if (!rider) return { riderEarns: 0, platformFee: 1, uplineShare: 0 };
    
    const comm = calculateCommissions(jobPrice, rider.tier, rider.upline_chain || [], totalStops);
    const uplineTotal = comm.uplines.reduce((sum: number, u: any) => sum + u.amount, 0);
    
    return {
      riderEarns: comm.activeRider,
      platformFee: comm.platform,
      uplineShare: uplineTotal
    };
  };

  // Customer bulk import CSV parser
  const handleCustomerBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Handle Excel files using SheetJS loaded via script
      try {
        // Load SheetJS if not already loaded
        if (!(window as any).XLSX) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load XLSX library'));
            document.head.appendChild(script);
          });
        }
        const XLSX = (window as any).XLSX;
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setCustomerImportedJobs(jsonData);
      } catch (err) {
        console.error('Error parsing Excel file:', err);
        alert('Error reading Excel file. Please try CSV format or check file contents.');
      }
    } else {
      // Handle CSV files
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setCustomerImportedJobs(parsed);
      };
      reader.readAsText(file);
    }
  };

  // Customer import jobs to database
  const customerImportJobs = async () => {
    if (customerImportedJobs.length === 0) {
      alert('No jobs to import');
      return;
    }
    
    const totalCost = customerImportedJobs.reduce((sum, job) => sum + (parseFloat(job.price) || 10), 0);
    
    // Fetch fresh credits from database to avoid stale state
    const freshCust = await api(`customers?id=eq.${auth.id}`);
    const freshCredits = freshCust && freshCust.length > 0 ? (freshCust[0].credits || 0) : (curr.credits || 0);
    if (freshCredits < totalCost) {
      alert(`Insufficient credits. You need $${totalCost.toFixed(2)} but only have $${freshCredits.toFixed(2)}`);
      return;
    }
    
    try {
      let successCount = 0;
      for (const job of customerImportedJobs) {
        const pickupAddr = job.pickup_unit_no ? `${job.pickup} ${job.pickup_unit_no}` : job.pickup;
        const deliveryAddr = job.delivery_unit_no ? `${job.delivery} ${job.delivery_unit_no}` : job.delivery;
        await api('jobs', 'POST', {
          customer_id: auth.id,
          customer_name: curr.name,
          customer_phone: curr.phone,
          pickup: pickupAddr,
          delivery: deliveryAddr,
          stops: [{ address: job.delivery || '', unitNo: job.delivery_unit_no || '', recipientName: job.recipient_name || '', recipientPhone: job.recipient_phone || '' }],
          total_stops: 1,
          timeframe: job.delivery_slot || '6am-11am',
          delivery_slot: job.delivery_slot || '6am-11am',
          delivery_date: job.delivery_date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }),
          price: parseFloat(job.price) || 10,
          status: 'posted',
          recipient_name: job.recipient_name || null,
          recipient_phone: job.recipient_phone || null,
          parcel_size: job.parcel_size || 'small',
          remarks: job.notes || null
        });
        successCount++;
      }
      
      // Deduct credits using fresh value
      await api(`customers?id=eq.${auth.id}`, 'PATCH', { 
        credits: freshCredits - totalCost 
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

  // Admin - Assign new upline to a rider
  const assignUpline = async (riderId: string, newUplineId: string | null) => {
    try {
      const rider = riders.find((r: any) => r.id === riderId);
      if (!rider) { alert('Rider not found'); return; }
      
      if (newUplineId === null) {
        // Remove upline — make this rider top level (Tier 1)
        await api(`riders?id=eq.${riderId}`, 'PATCH', { 
          upline_chain: [],
          tier: 1
        });
        
        await logAuditAction('assign_upline', { 
          riderId, riderName: rider.name,
          action: 'removed_upline',
          newTier: 1
        });
        
        await loadData();
        alert(`${rider.name} is now Top Level (Tier 1) with no upline.`);
      } else {
        const newUpline = riders.find((r: any) => r.id === newUplineId);
        if (!newUpline) { alert('Upline rider not found'); return; }
        
        // Prevent circular reference — can't set someone as upline if they are in this rider's downline
        const isDownline = (checkId: string, chain: any[]): boolean => {
          for (const u of chain) {
            if (u.id === riderId) return true;
          }
          return false;
        };
        if (isDownline(riderId, newUpline.upline_chain || [])) {
          alert(`Cannot set ${newUpline.name} as upline because ${rider.name} is already in their upline chain. This would create a circular reference.`);
          return;
        }
        
        // Build new upline chain: [newUpline, ...newUpline's upline chain]
        const newUplineChain = [
          { id: newUpline.id, name: newUpline.name, tier: newUpline.tier },
          ...(newUpline.upline_chain || [])
        ];
        const newTier = (newUpline.tier || 1) + 1;
        
        // Update the rider
        await api(`riders?id=eq.${riderId}`, 'PATCH', { 
          upline_chain: newUplineChain,
          tier: newTier
        });
        
        // Also update any downline riders of this rider — their upline chains need to include the new chain
        for (const r of riders) {
          if (r.id === riderId || r.id === newUplineId) continue;
          const chain = r.upline_chain || [];
          const riderIdx = chain.findIndex((u: any) => u.id === riderId);
          if (riderIdx >= 0) {
            // This rider has the moved rider in their upline — update the chain from that point
            const updatedChain = [
              ...chain.slice(0, riderIdx), // keep entries above the moved rider
              { id: rider.id, name: rider.name, tier: newTier }, // updated moved rider
              ...newUplineChain // new upline chain
            ];
            const updatedTier = updatedChain.length + 1;
            await api(`riders?id=eq.${r.id}`, 'PATCH', { 
              upline_chain: updatedChain,
              tier: updatedTier
            });
          }
        }
        
        await logAuditAction('assign_upline', { 
          riderId, riderName: rider.name,
          newUplineId, newUplineName: newUpline.name,
          newTier
        });
        
        await loadData();
        alert(`${rider.name} is now under ${newUpline.name} (Tier ${newTier}).\nAll downline references updated.`);
      }
    } catch (e: any) {
      alert('Error assigning upline: ' + e.message);
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

  // Customer - Redeem promo code
  const redeemPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code.');
      return;
    }
    setPromoError('');
    setPromoDiscount(null);
    
    try {
      const promos = await api(`promotions?code=eq.${promoCode.toUpperCase()}`);
      if (!promos || promos.length === 0) {
        setPromoError("Sorry, the code you've entered is fully redeemed or invalid.");
        return;
      }
      
      const promo = promos[0];
      
      // Check if active
      if (promo.active === false) {
        setPromoError("Sorry, the code you've entered is fully redeemed or invalid.");
        return;
      }
      
      // Check if max uses reached
      if (promo.max_uses && (promo.uses_count || 0) >= promo.max_uses) {
        setPromoError("Sorry, the code you've entered is fully redeemed or invalid.");
        return;
      }
      
      // Check expiry
      if (promo.expiry_date && new Date(promo.expiry_date) < new Date()) {
        setPromoError("Sorry, the code you've entered is fully redeemed or invalid.");
        return;
      }
      
      // Valid promo!
      setPromoDiscount(promo);
      setPromoError('');
    } catch (e: any) {
      setPromoError("Sorry, the code you've entered is fully redeemed or invalid.");
    }
  };

  // Calculate discounted price
  const getDiscountedPrice = (originalPrice: number): number => {
    if (!promoDiscount) return originalPrice;
    if (promoDiscount.discount_type === 'fixed') {
      return Math.max(0, originalPrice - promoDiscount.discount_value);
    } else {
      return Math.max(0, originalPrice * (1 - promoDiscount.discount_value / 100));
    }
  };

  // Admin - Edit promotion
  const updatePromotion = async () => {
    if (!editingPromo) return;
    try {
      await api(`promotions?id=eq.${editingPromo.id}`, 'PATCH', {
        code: editingPromo.code,
        discount_type: editingPromo.discount_type,
        discount_value: editingPromo.discount_value,
        min_order: editingPromo.min_order,
        max_uses: editingPromo.max_uses,
        expiry_date: editingPromo.expiry_date || null,
        active: editingPromo.active
      });
      alert('Promotion updated!');
      setEditingPromo(null);
      loadPromotions();
    } catch (e: any) {
      alert('Error updating promotion: ' + e.message);
    }
  };

  // Admin - Delete promotion
  const deletePromotion = async (promoId: string) => {
    if (!window.confirm('Delete this promotion? This cannot be undone.')) return;
    try {
      await api(`promotions?id=eq.${promoId}`, 'DELETE');
      alert('Promotion deleted!');
      loadPromotions();
    } catch (e: any) {
      alert('Error deleting promotion: ' + e.message);
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

  // Lookup coordinates for a postal code using OneMap API
  const lookupCoordinates = async (postalCode: string): Promise<{lat: number, lng: number} | null> => {
    if (!/^\d{6}$/.test(postalCode)) return null;
    try {
      const response = await fetch(
        `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return {
          lat: parseFloat(data.results[0].LATITUDE),
          lng: parseFloat(data.results[0].LONGITUDE)
        };
      }
      return null;
    } catch (error) {
      console.error('Coordinate lookup failed:', error);
      return null;
    }
  };

  // Cache for coordinate lookups to avoid duplicate API calls
  const coordsCacheRef = useRef<Record<string, {lat: number, lng: number} | null>>({});
  
  // Lookup coordinates with caching
  const lookupCoordinatesCached = async (postalCode: string): Promise<{lat: number, lng: number} | null> => {
    if (coordsCacheRef.current[postalCode] !== undefined) {
      return coordsCacheRef.current[postalCode];
    }
    const result = await lookupCoordinates(postalCode);
    coordsCacheRef.current[postalCode] = result;
    return result;
  };

  // Calculate distances between pickup and all stops for a job
  const calculateJobDistances = async (pickupAddress: string, stops: any[]): Promise<{distances: number[], totalDistance: number} | null> => {
    try {
      const pickupPostal = extractPostalCode(pickupAddress);
      if (!pickupPostal) return null;

      const pickupCoords = await lookupCoordinatesCached(pickupPostal);
      if (!pickupCoords) return null;

      const distances: number[] = [];
      let prevCoords = pickupCoords;
      let totalDistance = 0;

      for (const stop of stops) {
        const fullStopAddr = `${stop.address || ''} ${stop.unitNo || ''}`;
        const stopPostal = extractPostalCode(fullStopAddr);
        if (!stopPostal) { distances.push(0); continue; }
        
        const stopCoords = await lookupCoordinatesCached(stopPostal);
        if (!stopCoords) { distances.push(0); continue; }

        const dist = haversineDistance(prevCoords.lat, prevCoords.lng, stopCoords.lat, stopCoords.lng);
        const rounded = parseFloat(dist.toFixed(1));
        distances.push(rounded);
        totalDistance += rounded;
        prevCoords = stopCoords;
      }

      return { distances, totalDistance: parseFloat(totalDistance.toFixed(1)) };
    } catch (error) {
      console.error('[Distance] Calculation failed:', error);
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

  // Generate random Order ID for new delivery jobs
  const generateOrderId = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const nums = '0123456789';
    let result = 'ORD-';
    // Add 2 letters
    for (let i = 0; i < 2; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Add 6 numbers
    for (let i = 0; i < 6; i++) {
      result += nums.charAt(Math.floor(Math.random() * nums.length));
    }
    return result;
  };

  // Fetch and cache distances for a job
  const fetchJobDistances = async (jobId: string, pickup: string, stops: any[]) => {
    const result = await calculateJobDistances(pickup, stops);
    if (result) {
      setJobDistanceCache(prev => {
        if (prev[jobId]) return prev;
        return { ...prev, [jobId]: result };
      });
    }
  };

  // Auto-calculate distances for all visible jobs - process sequentially with delay
  const distanceProcessingRef = useRef(false);
  useEffect(() => {
    if (jobs.length === 0 || distanceProcessingRef.current) return;
    
    const uncachedJobs = jobs.filter((job: any) => {
      const stops = job.stops || [];
      return !jobDistanceCache[job.id] && stops.length > 0 && job.pickup && extractPostalCode(job.pickup);
    });
    
    if (uncachedJobs.length === 0) return;
    
    distanceProcessingRef.current = true;
    
    const processDistances = async () => {
      for (const job of uncachedJobs) {
        await fetchJobDistances(job.id, job.pickup, job.stops || []);
        // Small delay between jobs to avoid overwhelming the OneMap API
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      distanceProcessingRef.current = false;
    };
    processDistances();
  }, [jobs.length]);

  // Reusable improved job detail card
  const renderJobDetailCard = (job: any, showDeliveryFee: boolean = true) => {
    const stops = job.stops || [];
    const cachedDist = jobDistanceCache[job.id];

    return (
      <div className="space-y-3">
        {/* Urgent Label */}
        {job.is_urgent && (
          <div className="bg-red-50 p-2 rounded-lg border border-red-200 text-center">
            <p className="text-sm font-bold text-red-700">🔥 URGENT — Priority Order {job.boost_amount ? `(+$${job.boost_amount})` : ''}</p>
          </div>
        )}

        {/* Order ID & Delivery Slot */}
        <div className="flex justify-between items-start">
          <div>
            {job.order_id && (
              <p className="text-sm font-bold text-purple-600">Order ID: #{job.order_id}</p>
            )}
            {job.delivery_date && (
              <p className="text-sm text-gray-600">📅 Delivery Date: {formatDeliveryDate(job.delivery_date)}</p>
            )}
            {(job.timeframe || job.delivery_slot) && (
              <p className="text-sm text-gray-600">🕐 Delivery Slot: {job.timeframe || job.delivery_slot}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            job.status === 'completed' ? 'bg-green-100 text-green-700' :
            job.status === 'cancelled' ? 'bg-red-100 text-red-700' :
            job.status === 'posted' ? 'bg-yellow-100 text-yellow-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {job.status.toUpperCase()}
          </span>
        </div>

        {/* Parcel Information */}
        {job.parcel_size && (
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-xs font-medium text-gray-500 uppercase">Parcel Information</p>
            <p className="text-sm">📦 Parcel Size: <span className="font-medium capitalize">{job.parcel_size}</span></p>
          </div>
        )}

        {/* Remarks */}
        {job.remarks && (
          <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
            <p className="text-sm text-gray-700 italic">📝 <span className="font-medium">Remarks:</span> {job.remarks}</p>
          </div>
        )}

        {/* Pickup Location */}
        <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-400">
          <p className="text-xs font-medium text-orange-600 uppercase mb-1">Pickup Location</p>
          <p className="text-sm font-medium text-gray-800">🟠 {job.pickup}</p>
          {job.pickup_contact && (
            <p className="text-xs text-gray-500 mt-1">Contact: {job.pickup_contact} {job.pickup_phone && `(${job.pickup_phone})`}</p>
          )}
        </div>

        {/* Route Overview */}
        {stops.length > 0 && (
          <div className="bg-blue-50 p-2 rounded text-center">
            <p className="text-xs font-medium text-blue-600 uppercase mb-1">Route Overview</p>
            <p className="text-sm font-medium text-blue-800">
              Pickup{stops.map((_: any, i: number) => ` → Drop-off ${i + 1}`).join('')}
            </p>
          </div>
        )}

        {/* Drop-off Locations */}
        {stops.length > 0 ? (
          <div className="space-y-2">
            {stops.map((stop: any, index: number) => (
              <div key={index} className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                <p className="text-xs font-medium text-green-600 uppercase mb-1">
                  Drop-off {index + 1}
                </p>
                <p className="text-sm font-medium text-gray-800">📍 {stop.address} {stop.unitNo || ''}</p>
                {stop.recipientName && (
                  <p className="text-xs text-gray-500 mt-1">Recipient: {stop.recipientName} {stop.recipientPhone && `(${stop.recipientPhone})`}</p>
                )}
                {cachedDist && cachedDist.distances[index] > 0 && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    📏 Distance from {index === 0 ? 'pickup' : `drop-off ${index}`}: {cachedDist.distances[index]} km
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Fallback for jobs without stops array
          <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
            <p className="text-xs font-medium text-green-600 uppercase mb-1">Drop-off</p>
            <p className="text-sm font-medium text-gray-800">📍 {job.delivery}</p>
          </div>
        )}

        {/* Total Distance */}
        {cachedDist && cachedDist.totalDistance > 0 && (
          <div className="bg-purple-50 p-2 rounded text-center">
            <p className="text-xs font-medium text-purple-600 uppercase">Total Distance</p>
            <p className="text-lg font-bold text-purple-700">{cachedDist.totalDistance} km</p>
          </div>
        )}

        {/* Delivery Fee */}
        {showDeliveryFee && (
          <div className="bg-blue-50 p-2 rounded">
            <p className="text-xs font-medium text-blue-600 uppercase">Delivery Fee</p>
            <p className="text-lg font-bold text-blue-700">${parseFloat(job.price).toFixed(2)}</p>
          </div>
        )}

      </div>
    );
  };

  // Delivery time slots
  const DELIVERY_SLOTS = [
    { value: '6am-11am', label: '6am – 11am (cut off 9am)' },
    { value: '12pm-5pm', label: '12pm – 5pm (cut off 3pm)' },
    { value: '6pm-11pm', label: '6pm – 11pm (cut off 9pm)' }
  ];

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
      ['customer_name', 'customer_phone', 'pickup', 'pickup_unit_no', 'delivery', 'delivery_unit_no', 'recipient_name', 'recipient_phone', 'delivery_slot', 'delivery_date', 'parcel_size', 'price', 'notes'],
      ['John Doe', '91234567', '123 Orchard Road Singapore 238858', '#01-01', '456 Marina Bay Sands Singapore 018956', '#05-10', 'Alice Tan', '81234567', '6am-11am', '2026-03-16', 'small', '15', 'Handle with care'],
      ['Jane Smith', '98765432', '789 Bugis Street Singapore 188067', 'N/A', '321 Tampines Ave 5 Singapore 529651', '#02-15', 'Bob Lee', '92345678', '12pm-5pm', '2026-03-17', 'medium', '12', 'Call before delivery'],
      ['', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['DELETE THE SAMPLE ROWS ABOVE AND ADD YOUR OWN DATA', '', '', '', '', '', '', '', '', '', '', '', ''],
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
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Handle Excel files using SheetJS loaded via script
      try {
        // Load SheetJS if not already loaded
        if (!(window as any).XLSX) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load XLSX library'));
            document.head.appendChild(script);
          });
        }
        const XLSX = (window as any).XLSX;
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setImportedJobs(jsonData);
      } catch (err) {
        console.error('Error parsing Excel file:', err);
        alert('Error reading Excel file. Please try CSV format or check file contents.');
      }
    } else {
      // Handle CSV files
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setImportedJobs(parsed);
      };
      reader.readAsText(file);
    }
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
        const pickupAddr = job.pickup_unit_no ? `${job.pickup} ${job.pickup_unit_no}` : job.pickup;
        const deliveryAddr = job.delivery_unit_no ? `${job.delivery} ${job.delivery_unit_no}` : job.delivery;
        await api('jobs', 'POST', {
          customer_name: job.customer_name,
          customer_phone: job.customer_phone,
          pickup: pickupAddr,
          delivery: deliveryAddr,
          stops: [{ address: job.delivery || '', unitNo: job.delivery_unit_no || '', recipientName: job.recipient_name || '', recipientPhone: job.recipient_phone || '' }],
          total_stops: 1,
          timeframe: job.delivery_slot || '6am-11am',
          delivery_slot: job.delivery_slot || '6am-11am',
          delivery_date: job.delivery_date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }),
          price: job.price,
          status: 'posted',
          recipient_name: job.recipient_name || null,
          recipient_phone: job.recipient_phone || null,
          parcel_size: job.parcel_size || 'small',
          remarks: job.notes || null
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
      const riderData = riders.find((r: any) => r.id === riderId);
      await api(`jobs?id=eq.${jobId}`, 'PATCH', {
        rider_id: riderId,
        rider_name: riderName,
        rider_phone: riderPhone,
        rider_vehicle_type: riderData?.vehicle_type || 'bike',
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
      const date = formatSGTDate(j.created_at);
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
        if (key === 'created_at') value = formatSGT(value);
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
        if (key === 'created_at') value = formatSGTDate(value);
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
          <p class="date">Generated: ${formatSGT(new Date())}</p>
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
      { id: 1, label: '📍 Live Tracking Link', message: `🚚 Live Delivery Tracking

Hi! You can track your delivery in real-time:

📍 Live Tracking Link:
{tracking_link}

Rider Details:
• Name: {rider}
• Phone: {rider_phone}

After delivery, you can also view your Proof of Delivery (POD) via the same link.

Thank you for your order! 🙏` },
      { id: 2, label: '👋 Job Accepted', message: 'Hi {customer}! I am {rider}, your delivery rider. I have accepted your delivery job from {pickup} to {delivery}. I will pick up your package soon!' },
      { id: 3, label: '⏰ ETA Update', message: 'Hi {customer}! Your rider {rider} here. I expect to pick up your package in about 15-20 minutes. Thank you!' },
    ],
    'picked-up': [
      { id: 4, label: '📍 Live Tracking Link', message: `🚚 Live Delivery Tracking

Hi! You can track your delivery in real-time:

📍 Live Tracking Link:
{tracking_link}

Rider Details:
• Name: {rider}
• Phone: {rider_phone}

After delivery, you can also view your Proof of Delivery (POD) via the same link.

Thank you for your order! 🙏` },
      { id: 5, label: '✅ Package Collected', message: 'Hi {customer}! Good news - I have collected your package from {pickup}. Now heading to {delivery}!' },
      { id: 6, label: '🚗 Starting Delivery', message: 'Hi {customer}! Your package is with me now. Starting my journey to deliver it to {delivery}. Stay tuned!' },
    ],
    'on-the-way': [
      { id: 7, label: '📍 Live Tracking Link', message: `🚚 Live Delivery Tracking

Hi! You can track your delivery in real-time:

📍 Live Tracking Link:
{tracking_link}

Rider Details:
• Name: {rider}
• Phone: {rider_phone}

After delivery, you can also view your Proof of Delivery (POD) via the same link.

Thank you for your order! 🙏` },
      { id: 8, label: '🚗 On The Way', message: 'Hi {customer}! I am now on my way to {delivery} with your package. ETA approximately 15-20 minutes.' },
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
  const formatTemplateMessage = (template: string, job: any, riderName: string, riderPhone?: string): string => {
    const trackingLink = generateLiveTrackingUrl(job);
    return template
      .replace(/{customer}/g, job.customer_name || 'Customer')
      .replace(/{rider}/g, riderName || 'Your Rider')
      .replace(/{rider_phone}/g, riderPhone || 'N/A')
      .replace(/{pickup}/g, job.pickup || 'pickup location')
      .replace(/{delivery}/g, job.delivery || 'delivery location')
      .replace(/{tracking_link}/g, trackingLink);
  };

  const curr = auth.type === 'customer' ? customers.find(c => c.id === auth.id) : auth.type === 'rider' ? riders.find(r => r.id === auth.id) : null;
  // Multi-job capability: get ALL active jobs for this rider
  const activeJobsList = jobs.filter(j => j.rider_id === auth.id && j.status !== 'completed' && j.status !== 'cancelled');
  // For backwards compatibility, activeJob is the currently selected one or first one
  const activeJob = selectedJobId ? activeJobsList.find(j => j.id === selectedJobId) : activeJobsList[0];

  useEffect(() => { loadData(); }, []);
  
  // Timeout to prevent indefinite loading - show login page after 8 seconds even if loading fails
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (loading && !auth.isAuth) {
        console.log('[Timeout] Loading took too long, showing login page');
        setLoading(false);
      }
    }, 8000); // 8 seconds timeout for faster UX
    return () => clearTimeout(loadingTimeout);
  }, [loading, auth.isAuth]);
  
  // Auto-refresh data every 120 seconds (2 minutes) to reduce bandwidth usage
  useEffect(() => {
    if (auth.isAuth) {
      const interval = setInterval(() => {
        loadData();
      }, 120000); // 120 seconds (2 minutes)
      return () => clearInterval(interval);
    }
  }, [auth.isAuth]);

  const loadData = async () => {
    try {
      setError('');
      console.log('[LoadData] Starting to fetch data...');
      console.log('[LoadData] Using Supabase URL:', SUPABASE_URL);
      
      const r = await api('riders?select=*');
      console.log('[LoadData] Riders loaded:', r?.length || 0);
      
      const c = await api('customers?select=*');
      console.log('[LoadData] Customers loaded:', c?.length || 0);
      
      const j = await api('jobs?select=*&order=created_at.desc&limit=100');
      console.log('[LoadData] Jobs loaded:', j?.length || 0);
      
      // Also load audit logs for withdrawal notifications
      const logs = await api('audit_logs?order=timestamp.desc&limit=50');
      console.log('[LoadData] Audit logs loaded:', logs?.length || 0);
      
      // Load all rider locations for admin (to check GPS status)
      const riderLocs = await api('rider_locations?order=updated_at.desc');
      console.log('[LoadData] Rider locations loaded:', riderLocs?.length || 0);
      
      // Parse details if it's a string
      const parsedLogs = (Array.isArray(logs) ? logs : []).map((log: any) => ({
        ...log,
        details: typeof log.details === 'string' ? (() => { try { return JSON.parse(log.details); } catch { return log.details; } })() : log.details
      }));
      
      setRiders(Array.isArray(r) ? r : []);
      setCustomers(Array.isArray(c) ? c : []);
      setJobs(Array.isArray(j) ? j : []);
      setAuditLogs(parsedLogs);
      setAllRiderLocations(Array.isArray(riderLocs) ? riderLocs : []);
      
      // Customer notifications — check for job status changes
      if (auth.type === 'customer' && auth.id && Array.isArray(j)) {
        const myJobs = j.filter((job: any) => job.customer_id === auth.id);
        const newNotifs: any[] = [];
        
        myJobs.forEach((job: any) => {
          const prevStatus = prevJobStatuses[job.id];
          if (prevStatus && prevStatus !== job.status) {
            if (job.status === 'accepted' && prevStatus === 'posted') {
              newNotifs.push({
                id: `${job.id}-accepted-${Date.now()}`,
                type: 'accepted',
                message: `🏍️ Your delivery ${job.order_id || ''} has been accepted by ${job.rider_name || 'a rider'}!`,
                jobId: job.id,
                timestamp: new Date().toISOString()
              });
            } else if (job.status === 'picked-up') {
              newNotifs.push({
                id: `${job.id}-pickedup-${Date.now()}`,
                type: 'picked-up',
                message: `📦 Your parcel ${job.order_id || ''} has been picked up by ${job.rider_name || 'the rider'}!`,
                jobId: job.id,
                timestamp: new Date().toISOString()
              });
            } else if (job.status === 'on-the-way') {
              newNotifs.push({
                id: `${job.id}-otw-${Date.now()}`,
                type: 'on-the-way',
                message: `🚚 Your delivery ${job.order_id || ''} is on the way!`,
                jobId: job.id,
                timestamp: new Date().toISOString()
              });
            } else if (job.status === 'completed' && prevStatus !== 'completed') {
              newNotifs.push({
                id: `${job.id}-completed-${Date.now()}`,
                type: 'completed',
                message: `✅ Your delivery ${job.order_id || ''} has been completed by ${job.rider_name || 'the rider'}!`,
                jobId: job.id,
                timestamp: new Date().toISOString()
              });
            }
          }
        });
        
        if (newNotifs.length > 0) {
          setCustomerNotifications(prev => [...newNotifs, ...prev].slice(0, 20));
          // Play sound for new notifications
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczGjleqN/telerant7VxORFaKq8CkfEEyU4ery7F3MBUvXZzG2bFhKBMoWJnF3bJfJBAmU5C/2bNlKxUrVpW+1rRoLBkwX5u9y6tvNCA0YZ69yKdwNSQ6bKe6w6BqMiI4a6q+xaRvNyk+dLHAwp5pMiU+');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch (e) {}
          
          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            newNotifs.forEach(n => {
              new Notification('MoveIt Logistics', { body: n.message, icon: '/icons/manifest-icon-192.maskable.png' });
            });
          }
        }
        
        // Save current statuses for next comparison
        const statusMap: any = {};
        myJobs.forEach((job: any) => { statusMap[job.id] = job.status; });
        setPrevJobStatuses(statusMap);
      }
      
      // Also set withdrawal requests from audit logs
      const withdrawals = (Array.isArray(logs) ? logs : []).filter((log: any) => log.action === 'withdrawal_request');
      setWithdrawalRequests(withdrawals);
      
      console.log('[LoadData] All data loaded successfully!');
    } catch (e: any) { 
      const errorMessage = e.message || 'Unknown error';
      console.error('[LoadData] Error:', e);
      
      if (errorMessage.includes('timeout') || errorMessage.includes('AbortError') || errorMessage.includes('Max retries')) {
        setError('Database is slow to respond. Please click Retry.');
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Network error: Cannot reach database. Check your internet connection.');
      } else if (errorMessage.includes('401') || errorMessage.includes('Invalid API key')) {
        setError('Authentication error: The API key appears to be invalid.');
      } else if (errorMessage.includes('404') || errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        setError('Database error: Required tables may not exist.');
      } else if (errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
        setError('Permission error: Row Level Security may be blocking access.');
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
        // Update last_login timestamp
        try {
          await api(`${table}?id=eq.${users[0].id}`, 'PATCH', { last_login: new Date().toISOString() });
        } catch (e) {
          console.log('Failed to update last_login:', e);
        }
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
        credits: 0 
      });
      console.log('Registration result:', result);
      alert('Registration successful!\n\nYou can now login with:\nEmail: ' + regForm.email + '\nPassword: (your password)');
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

  // Customer - Boost/Urgent order to attract drivers faster
  const boostOrder = async (jobId: string, extraAmount: number) => {
    if (!extraAmount || extraAmount <= 0) {
      alert('Please enter a valid boost amount');
      return;
    }
    try {
      const freshCust = await api(`customers?id=eq.${auth.id}`);
      const freshCredits = freshCust && freshCust.length > 0 ? (freshCust[0].credits || 0) : 0;
      if (freshCredits < extraAmount) {
        alert(`Insufficient credits. Your balance is $${freshCredits.toFixed(2)}.`);
        return;
      }
      
      const job = jobs.find((j: any) => j.id === jobId);
      if (!job) return;
      
      const newPrice = parseFloat(job.price) + extraAmount;
      
      await api(`jobs?id=eq.${jobId}`, 'PATCH', { 
        price: newPrice, 
        is_urgent: true,
        boosted_at: new Date().toISOString(),
        boost_amount: (job.boost_amount || 0) + extraAmount
      });
      
      // Deduct credits
      await api(`customers?id=eq.${auth.id}`, 'PATCH', { credits: freshCredits - extraAmount });
      
      await logAuditAction('boost_order', {
        jobId, orderId: job.order_id,
        originalPrice: job.price, newPrice,
        boostAmount: extraAmount
      });
      
      setShowBoostModal(null);
      setBoostAmount('');
      alert(`Order boosted! Price increased to $${newPrice.toFixed(2)}.\n$${extraAmount.toFixed(2)} deducted from credits.\n\nYour order will be shown as URGENT to nearby drivers.`);
      loadData();
    } catch (e: any) {
      alert('Error boosting order: ' + e.message);
    }
  };

  const createJob = async () => {
    const originalPrice = parseFloat(jobForm.price);
    const minPrice = 3 + (jobForm.stops.length - 1) * 2; // $3 base + $2 per extra stop
    if (originalPrice < minPrice) return alert(`Minimum price is $${minPrice} for ${jobForm.stops.length} stop(s)`);
    
    // Apply promo discount if any
    const price = promoDiscount ? getDiscountedPrice(originalPrice) : originalPrice;
    
    // Fetch fresh credits from database to avoid stale state
    const freshCust = await api(`customers?id=eq.${curr.id}`);
    const freshCredits = freshCust && freshCust.length > 0 ? (freshCust[0].credits || 0) : (curr.credits || 0);
    if (freshCredits < price) return alert(`Insufficient credits. Your current balance is $${freshCredits.toFixed(2)}. Please top up.`);
    if (!jobForm.pickup) return alert('Please fill in pickup location');
    if (!jobForm.pickupUnitNo) return alert('Please fill in pickup Unit No (enter "N/A" if not applicable)');
    if (!jobForm.stops[0]?.address) return alert('Please fill in at least one drop-off location');
    if (!jobForm.parcelSize) return alert('Please select a parcel size');
    if (!jobForm.timeframe) return alert('Please select a delivery time slot');
    if (!jobForm.deliveryDate) return alert('Please select a delivery date');
    
    // Validate all stops have addresses and unit numbers
    const emptyStops = jobForm.stops.filter(s => !s.address);
    if (emptyStops.length > 0) return alert('Please fill in all drop-off addresses or remove empty stops');
    
    const missingUnitNo = jobForm.stops.filter(s => !s.unitNo);
    if (missingUnitNo.length > 0) return alert('Please fill in Unit No for all drop-off locations (enter "N/A" if not applicable)');
    
    // Determine pickup contact info based on useMyProfile checkbox
    const pickupContactName = useMyProfile ? curr.name : (jobForm.pickupContact || null);
    const pickupContactPhone = useMyProfile ? curr.phone : (jobForm.pickupPhone || null);
    
    // Generate Order ID
    const orderId = generateOrderId();
    
    try {
      // For multi-stop, create the job with all stops stored as JSON
      const deliveryAddresses = jobForm.stops.map(s => `${s.address} ${s.unitNo}`).join(' → ');
      
      const newJob = await api('jobs', 'POST', { 
        order_id: orderId,
        customer_id: curr.id, 
        customer_name: curr.name, 
        customer_phone: curr.phone, 
        pickup: `${jobForm.pickup} ${jobForm.pickupUnitNo}`, // Include unit no in pickup
        pickup_contact: pickupContactName,
        pickup_phone: pickupContactPhone,
        delivery: deliveryAddresses, // Combined for display
        stops: jobForm.stops, // Full stops array as JSON (includes unit numbers)
        total_stops: jobForm.stops.length,
        timeframe: jobForm.timeframe, 
        delivery_slot: jobForm.timeframe,
        delivery_date: jobForm.deliveryDate || null,
        price, 
        status: 'posted',
        recipient_name: jobForm.stops[0]?.recipientName || null,
        recipient_phone: jobForm.stops[0]?.recipientPhone || null,
        parcel_size: jobForm.parcelSize,
        remarks: jobForm.remarks || null,
        promo_code: promoDiscount?.code || null,
        original_price: promoDiscount ? originalPrice : null,
        discount_amount: promoDiscount ? (originalPrice - price) : null
      });
      await api(`customers?id=eq.${curr.id}`, 'PATCH', { credits: freshCredits - price });
      
      // Update promo usage count if promo was applied
      if (promoDiscount) {
        try {
          await api(`promotions?id=eq.${promoDiscount.id}`, 'PATCH', { 
            uses_count: (promoDiscount.uses_count || 0) + 1 
          });
        } catch (e) {
          console.log('Failed to update promo usage:', e);
        }
        setPromoCode('');
        setPromoDiscount(null);
      }
      
      // Send email notification to admin
      try {
        await fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'moveit.admin@ymailzone.com',
            orderId: orderId,
            customerName: curr.name,
            customerPhone: curr.phone,
            pickup: `${jobForm.pickup} ${jobForm.pickupUnitNo}`,
            delivery: deliveryAddresses,
            deliverySlot: jobForm.timeframe,
            price: price,
            parcelSize: jobForm.parcelSize,
            remarks: jobForm.remarks || 'None'
          })
        });
      } catch (emailError) {
        console.log('Email notification failed:', emailError);
      }
      
      setJobForm({ 
        pickup: '', 
        pickupUnitNo: '',
        pickupContact: '',
        pickupPhone: '',
        stops: [{ address: '', unitNo: '', recipientName: '', recipientPhone: '' }],
        timeframe: '', 
        deliveryDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }),
        price: '10', 
        parcelSize: 'small', 
        remarks: '' 
      });
      alert(`Job posted successfully!\nOrder ID: ${orderId}`);
      loadData();
    } catch (e: any) { alert('Error posting job: ' + e.message); }
  };

  const acceptJob = async (jobId: string) => {
    // Check if GPS is available
    if (!navigator.geolocation) {
      alert('GPS is not supported by your browser. Please use a device with GPS capability.');
      return;
    }
    
    try {
      // Try high accuracy first, then fall back to low accuracy
      let position: GeolocationPosition;
      try {
        position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000
          });
        });
      } catch {
        // Fallback: try without high accuracy
        position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 60000
          });
        });
      }
      
      // GPS is working, proceed with accepting job
      await api(`jobs?id=eq.${jobId}`, 'PATCH', { 
        status: 'accepted', 
        rider_id: auth.id, 
        rider_name: curr.name, 
        rider_phone: curr.phone, 
        rider_vehicle_type: curr.vehicle_type || 'bike',
        accepted_at: new Date().toISOString() 
      });
      
      // Update rider location
      try {
        await api(`rider_locations?rider_id=eq.${auth.id}`, 'DELETE');
        await api('rider_locations', 'POST', {
          rider_id: auth.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          updated_at: new Date().toISOString()
        });
      } catch (locErr) {
        console.log('Location update failed, but job accepted:', locErr);
      }
      
      setGpsPermissionGranted(true);
      
      // Clear this job from notifications
      setNewJobNotifications(prev => prev.filter(n => n.id !== jobId));
      
      alert('Job accepted! Please keep GPS enabled until delivery is complete.');
      loadData();
    } catch (gpsError: any) {
      if (gpsError.code === 1) {
        alert('⚠️ GPS Permission Required\n\nPlease allow location access when prompted by your browser.\n\nIf you accidentally blocked it:\n• iPhone: Settings → Safari → Location → Allow\n• Android: Settings → Site Settings → Location → Allow');
      } else {
        // For timeout or unavailable errors, still allow accepting the job
        const proceed = window.confirm('⚠️ Could not get your GPS location right now.\n\nThis may be due to poor signal. Do you want to accept the job anyway?\n\nYour location will be updated when GPS becomes available.');
        if (proceed) {
          try {
            await api(`jobs?id=eq.${jobId}`, 'PATCH', { 
              status: 'accepted', 
              rider_id: auth.id, 
              rider_name: curr.name, 
              rider_phone: curr.phone, 
              rider_vehicle_type: curr.vehicle_type || 'bike',
              accepted_at: new Date().toISOString() 
            });
            setNewJobNotifications(prev => prev.filter(n => n.id !== jobId));
            alert('Job accepted! Please enable GPS as soon as possible for tracking.');
            loadData();
          } catch (e: any) {
            alert('Error accepting job: ' + e.message);
          }
        }
      }
    }
  };

  // Rider Go Online - GPS with fallback
  const riderGoOnline = async () => {
    if (!navigator.geolocation) {
      alert('GPS is not supported by your browser.');
      return;
    }
    
    try {
      // Try high accuracy first, then fall back
      let position: GeolocationPosition;
      try {
        position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000
          });
        });
      } catch {
        // Fallback: try without high accuracy
        position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 60000
          });
        });
      }
      
      // Update rider online status in database
      await api(`riders?id=eq.${auth.id}`, 'PATCH', { is_online: true });
      
      // Save rider location
      try {
        await api(`rider_locations?rider_id=eq.${auth.id}`, 'DELETE');
        await api('rider_locations', 'POST', {
          rider_id: auth.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          updated_at: new Date().toISOString()
        });
      } catch (locErr) {
        console.log('Location save failed, but going online:', locErr);
      }
      
      setRiderIsOnline(true);
      setRiderHasGPS(true);
      setGpsPermissionGranted(true);
      setLastJobCheck(new Date().toISOString());
      
      // Request notification permission
      requestNotificationPermission();
      
      // Start watching for new jobs
      checkForNewJobs();
      
      alert('🟢 You are now ONLINE!\n\nYou will receive notifications for new delivery jobs.\n\n🔔 Make sure to allow notifications when prompted!');
      loadData();
    } catch (gpsError: any) {
      if (gpsError.code === 1) {
        alert('⚠️ GPS Permission Required\n\nPlease allow location access when prompted by your browser.\n\nIf you accidentally blocked it:\n• iPhone: Settings → Safari → Location → Allow\n• Android: Settings → Site Settings → Location → Allow');
      } else {
        // For timeout/unavailable, allow going online anyway
        const proceed = window.confirm('⚠️ Could not get your GPS location right now.\n\nThis may be due to poor signal indoors. Do you want to go online anyway?\n\nYour location will be updated when GPS becomes available.');
        if (proceed) {
          try {
            await api(`riders?id=eq.${auth.id}`, 'PATCH', { is_online: true });
            setRiderIsOnline(true);
            setRiderHasGPS(true);
            setLastJobCheck(new Date().toISOString());
            requestNotificationPermission();
            checkForNewJobs();
            alert('🟢 You are now ONLINE!\n\nGPS location will update when available.');
            loadData();
          } catch (e: any) {
            alert('Error going online: ' + e.message);
          }
        }
      }
    }
  };

  // Rider Go Offline
  const riderGoOffline = async () => {
    try {
      await api(`riders?id=eq.${auth.id}`, 'PATCH', { is_online: false });
      setRiderIsOnline(false);
      setNewJobNotifications([]);
      alert('🔴 You are now OFFLINE.\n\nYou will not receive new job notifications.');
      loadData();
    } catch (e: any) {
      alert('Error going offline: ' + e.message);
    }
  };

  // Check for new jobs (called periodically when rider is online)
  const checkForNewJobs = async () => {
    if (!riderIsOnline || !riderHasGPS) return;
    
    try {
      // Get all posted jobs (not assigned to any rider)
      const postedJobs = jobs.filter((j: any) => j.status === 'posted' && !j.rider_id);
      
      // Find jobs that are new since last check
      const newJobs = lastJobCheck 
        ? postedJobs.filter((j: any) => new Date(j.created_at) > new Date(lastJobCheck))
        : postedJobs;
      
      if (newJobs.length > 0) {
        // Add to notifications (avoid duplicates)
        setNewJobNotifications(prev => {
          const existingIds = prev.map(n => n.id);
          const uniqueNewJobs = newJobs.filter((j: any) => !existingIds.includes(j.id));
          
          if (uniqueNewJobs.length > 0) {
            playNotificationSound();
            showBrowserNotification(
              '🚚 New Delivery Job!',
              `${uniqueNewJobs.length} new job${uniqueNewJobs.length > 1 ? 's' : ''} available. Tap to view.`
            );
          }
          
          return [...uniqueNewJobs, ...prev];
        });
        
        // Auto-accept if enabled
        if (autoAcceptEnabled && curr && currentLocation) {
          const vehicleType = curr.vehicle_type || 'bike';
          const maxDistance = vehicleType === 'car' || vehicleType === 'van' || vehicleType === 'lorry' ? 5 : 10; // Car: 5km, Bike: 10km
          
          for (const job of newJobs) {
            // Check if job is still available
            if (job.rider_id) continue;
            
            const jobPostal = extractPostalCode(job.pickup || '');
            if (!jobPostal) continue;
            
            const jobCoords = await lookupCoordinatesCached(jobPostal);
            if (!jobCoords) continue;
            
            const dist = haversineDistance(currentLocation.lat, currentLocation.lng, jobCoords.lat, jobCoords.lng);
            
            if (dist <= maxDistance) {
              try {
                await api(`jobs?id=eq.${job.id}`, 'PATCH', { 
                  status: 'accepted', 
                  rider_id: auth.id, 
                  rider_name: curr.name, 
                  rider_phone: curr.phone, 
                  rider_vehicle_type: curr.vehicle_type || 'bike',
                  accepted_at: new Date().toISOString() 
                });
                
                showBrowserNotification(
                  '✅ Auto-Accepted Job!',
                  `Job ${job.order_id || ''} auto-accepted (${dist.toFixed(1)}km away)`
                );
                playNotificationSound();
                
                // Remove from notifications
                setNewJobNotifications(prev => prev.filter(n => n.id !== job.id));
                loadData();
                break; // Only auto-accept one job at a time
              } catch (e) {
                console.log('Auto-accept failed:', e);
              }
            }
          }
        }
      }
      
      setLastJobCheck(new Date().toISOString());
    } catch (e) {
      console.error('Error checking for new jobs:', e);
    }
  };

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a simple beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Play a second beep
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1000;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 200);
    } catch (e) {
      console.log('Could not play notification sound:', e);
    }
  };

  // Show browser notification
  const showBrowserNotification = (title: string, body: string) => {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return;
    }
    
    // Check permission
    if (Notification.permission === 'granted') {
      // Show notification
      const notification = new Notification(title, {
        body: body,
        icon: '/icon-192.png', // MoveIt app icon
        tag: 'new-job', // Prevents duplicate notifications
        renotify: true
      } as NotificationOptions);
      
      // Close after 10 seconds
      setTimeout(() => notification.close(), 10000);
      
      // Focus app when notification clicked
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } else if (Notification.permission !== 'denied') {
      // Request permission
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showBrowserNotification(title, body);
        }
      });
    }
  };

  // Request notification permission when rider goes online
  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Auto-check for new jobs every 30 seconds when rider is online
  useEffect(() => {
    if (auth.type === 'rider' && riderIsOnline && riderHasGPS) {
      const interval = setInterval(() => {
        checkForNewJobs();
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [auth.type, riderIsOnline, riderHasGPS, jobs]);

  // Request notification permission when rider logs in
  useEffect(() => {
    if (auth.type === 'rider') {
      requestNotificationPermission();
    }
  }, [auth.type]);

  // Check rider online status on login
  useEffect(() => {
    if (auth.type === 'rider' && auth.id && riders.length > 0) {
      const currentRider = riders.find((r: any) => r.id === auth.id);
      if (currentRider) {
        setRiderIsOnline(currentRider.is_online === true);
      }
    }
  }, [auth.type, auth.id, riders]);

  const updateStatus = async (status: string) => {
    // Try to update GPS location in background, but don't block the status update
    if (status !== 'completed' && status !== 'cancelled') {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
          });
        });
        
        // Update rider location (best effort)
        try {
          await api(`rider_locations?rider_id=eq.${auth.id}`, 'DELETE');
          await api('rider_locations', 'POST', {
            rider_id: auth.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            updated_at: new Date().toISOString()
          });
        } catch (locErr) {
          console.log('Location update failed:', locErr);
        }
      } catch (gpsError: any) {
        // Don't block - just log and continue with status update
        console.log('GPS not available for location update, proceeding with status change');
      }
    }
    
    try {
      const updateData: any = { status };
      if (status === 'picked-up') updateData.picked_up_at = new Date().toISOString();
      if (status === 'on-the-way') updateData.on_the_way_at = new Date().toISOString();
      await api(`jobs?id=eq.${activeJob.id}`, 'PATCH', updateData);
      alert(`Status updated: ${status}`);
      loadData();
    } catch (e: any) { alert('Error updating status: ' + e.message); }
  };

  const completeJob = async () => {
    const comm = calculateCommissions(activeJob.price, curr.tier, curr.upline_chain || [], activeJob.total_stops || 1);
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
    if (!amt || amt < 10) return alert('Minimum top-up amount is $10');
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
      // Fetch fresh credits from database to avoid stale state
      const freshCust = await api(`customers?id=eq.${auth.id}`);
      const freshCredits = freshCust && freshCust.length > 0 ? (freshCust[0].credits || 0) : (curr.credits || 0);
      await api(`customers?id=eq.${auth.id}`, 'PATCH', { credits: freshCredits + parseFloat(topUpAmt) });
      
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
        <p className="text-sm text-gray-500 mt-2">Connecting to server...</p>
        
        {/* Skip to Login button - always visible */}
        <button 
          onClick={() => { setLoading(false); setError(''); }}
          className="mt-6 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
        >
          Skip to Login →
        </button>
        
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
                <li>Check your internet connection</li>
                <li>Try again in a few moments</li>
              </ol>
            </div>
            <button 
              onClick={() => { setLoading(true); setError(''); loadData(); }}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Retry Connection
            </button>
            <button 
              onClick={() => { setLoading(false); setError(''); }}
              className="mt-2 w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            >
              Continue to Login
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

              {/* POD (Proof of Delivery) - Show when completed */}
              {publicTrackingJob.status === 'completed' && (
                <div className="bg-white rounded-2xl shadow-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="text-green-500" size={24} />
                    <h2 className="text-xl font-bold text-gray-800">Delivery Completed</h2>
                  </div>
                  
                  {publicTrackingJob.pod_image && !publicTrackingJob.pod_image.includes('truncated') ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">Proof of Delivery:</p>
                      <img 
                        src={publicTrackingJob.pod_image} 
                        alt="Proof of Delivery" 
                        className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-200 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setViewingPodImage(publicTrackingJob.pod_image)}
                      />
                      {publicTrackingJob.pod_timestamp && (
                        <p className="text-center text-sm text-gray-500 mt-3">
                          📸 Photo taken: {formatSGT(publicTrackingJob.pod_timestamp)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No proof of delivery photo available</p>
                    </div>
                  )}
                  
                  {publicTrackingJob.completed_at && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-green-700">
                        ✅ Delivered on {formatSGT(publicTrackingJob.completed_at)}
                      </p>
                    </div>
                  )}
                </div>
              )}

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
                          {formatSGTTime(publicRiderLocation.updated_at)}
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

          {/* Fullscreen POD Image Viewer for Public Tracking */}
          {viewingPodImage && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
              onClick={() => setViewingPodImage(null)}
            >
              <div className="relative max-w-4xl w-full">
                <button
                  onClick={() => setViewingPodImage(null)}
                  className="absolute -top-12 right-0 text-white hover:text-gray-300 text-xl font-bold bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center"
                >
                  ✕
                </button>
                <img
                  src={viewingPodImage}
                  alt="Proof of Delivery - Full Size"
                  className="max-h-[85vh] max-w-full mx-auto rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
                <p className="text-center text-white mt-4 text-sm opacity-75">
                  Click anywhere outside the image to close
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!auth.isAuth) {
    // Skip portal selection - go directly to customer login
    if (view === 'select') {
      setView('customer');
      return null;
    }

    const cfg = {
      admin: { color: 'purple', icon: TrendingUp, bg: 'bg-gray-100', canReg: false },
      customer: { color: 'blue', icon: User, bg: 'bg-white', canReg: true },
      rider: { color: 'green', icon: Package, bg: 'bg-blue-800', canReg: true }
    }[view];
    const Icon = cfg.icon;

    return (
      <div className={`min-h-screen ${cfg.bg} flex items-center justify-center p-4`}>
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* MoveIt Logo */}
            <div className="flex justify-center mb-3">
              <img 
                src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAAAAAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCADIAMgDASIAAhEBAxEB/8QAHAABAAICAwEAAAAAAAAAAAAAAAcIBQYCAwQB/8QARRAAAQMDAgMFBAYFCgcBAAAAAQACAwQFEQYhBxIxE0FRYYEUUnGRIiMyQqGxFmKSstEVFzM1VXJzlMHSJCVDVGSCosL/xAAbAQEAAgMBAQAAAAAAAAAAAAAABQYCAwQBB//EADQRAAIBAwIDBAgGAwEAAAAAAAABAgMEEQUhEjFBE1FhgRQiMnGhsdHwBhVikcHhJJLx0v/aAAwDAQACEQMRAD8A19ERX8+XhERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBEJA6kD4oN+hygCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAvTbKKW43GloqcAzVErYmZ6ZJwvMslpq4NtOoLdXvaXMpqhkjgOpaDv+GVjNtRbjzM6ai5pS5Z3LI6Y0XZbBQshgo4Zp8DtKiVgc957zk9B5BYvXWjrFe6GaOJtFRXVrcxStLYzzdweB1B8+nctlpr/aKmnE8F0onw45uYTtwB577eq0xtntNbw7uFwulPTQzVbKmoNbNCDIA57yx+SM9OTHlhU+lOr2naSk08r4l7rU6PZ9lCKaw3+33zIKu1tq7TXSUdwh7KoZglvMHAg9CCNiPNeNB06YRXGOcblCljPq8giIvTwIiIAi+cw94fNfUAREQBERAEREAREQBERAF8yPEL1WxofcqRrgHNdNGCD0I5grU/o1Y/7Ftv8AlWfwXBeX8bRpNZySen6bK+UnGWMFTUyPEKUuO9uorfXWYUFJTUrXxylwhjazmw5uM4G6kHQFgs9RoyyzVFqoJZX0rHOe+nY5zjjqSRusKmpRhRjW4faNlLSJ1Lidupbx6lbMjxWc0dpur1ReGUNGQwAc8szhlsbPHzPcB3qXuMlmtlFoqWaittFTzCeIB8UDWOwXbjIC7eBFobR6WluD2/W10pIP6jPogfPmK11NSzbOtBYecI20tIxeK3qPKxl+47abhybZbRBRVVJXBgP1FyoY3scT1w9oD2/HJx4KKNSakv0NLV6arHvp6KGXk9meed7Gg5bH2h3c0bY8sKzirdxnIPEGvwwt+riySMcx5Bv/AKei4tLrOvWcaqz18yQ1m3jbUFKi3Hpjw+0aOiIrGVMIiIDLaZsFdqO6MobbGHSH6T3u2bG3vc4+H5qedL8M7DZomOqqdtxrB9qWobluf1WdAPjk+a7eE2no7HpOnkcwCsrWiomd37j6LfQY9SV3cQda02kqKP6v2ivnB7GDmwMDq5x7h+arV3eVrmr2NDly26/0W+xsKFnQ9IuefPfp/Zsgt1EI+zFHTBnuiJuPlhazqPh1p+9RPIo2UVSfsz0oDCD5t6H1CiWTixqh1R2jZqRjM57IU4LfmTn8VKPDfX0Oq2SUtTE2mucTed0bTlsjfebnfbvB8e9aKlndWi7VP9mdFK/sr6XYtc+9fIg7WOl67S1z9lrgHxvy6Gdg+jK3y8CO8dywKtLr/T0eo9M1dIWA1LWmWndjdsgG3z6H4qrXxGD4Kc0689Kp+t7S5lc1WwVnVxH2Xy+gREUgRYREQBERAEREB6rV/WlF/jx/vBW+CqDav60ov8eP94K3wVd1z2oeZavw57NTy/k8VwtNuuTmOuFDS1TmAhhmia/lz1xkbL000EVLBHBTRMihjHKxjGhrWjwAHRdiKD4m1jOxZFGKfEluR/xyONBzH/yIvzK2nR9ELbpe1UgGDFTRh397lyfxJWu8Y4xNpFkTvsvradp+Bfhbw0ADAGANguqc/wDGjHxf8HJTh/lzn+mK+LOS0riLoWDVzIJY5xS18ALWylnMHtP3XDr13B7t/Fbm4kMdy7nGygCnvHETTmRLT3B9O0n6NRT9uwb+8N8eqzsaVSUnOlJRku/qatRrUoQUK0HKMu7pgx944Xamt3M6Kljrox96mkyf2Tg/mtKqIpKaeSCoY6KaNxa+N45XNI7iD0UwW3jPJGTHebPiQdXU8nKc/wBx38V6NDaw01+i1S6+Mp462J73ziZjZH1LnuLi5oxl25xjuwpuN1d0ot1qeeXL7ZXJ2djWklQq458+mP2Iy0tpO76mkeLXTB0TDh80juWNp8M958hkr2ai0NcLGLh7RPTSiihhmm7Iu+zI5zRjI3wW7/FTfw7Y2lsVXUsj9ks8076mhjlLQYoHAHJwcAE8xAJ2BWmcRrtb5f0qMNZTTCot9HFF2cjXc7u2eSBg74G5WqGoValdwitlj5o3z0uhStlUk/Wefk3sS3Q8nscHZf0fZt5fhjZV642uldr2oEueRsEQiz7uM7evMpf4WXpt60ZQvc7NRTN9mmHfzN2B9W4K8nEzQzdV00VRSSMhudO0tY5/2ZG9eV3hvuD5nxUdZVFaXTVXxRLahSlfWSdHwf8ARW9bXwqdMzX9n7DPMZHB2Pd5Hc34Lk/hzqttR2P8kSOOcc7ZGFvxzlStwu4fHTT33G6Pjkub2cjGMOWwtPXfvcfFTV5e0Y0ZJSTbWNiu6fp9xK4i3FpJpttY5EijoFUO88n8sV/Zf0ftEnL8Oc4VoNa3plg0zX3BxAkZGWxD3pDs0fP8lVPJJyTknqfFcWhweJz6bIkfxHVTcKfXdhERT5WAiIgCIiAIiID1Wr+tKP8Ax4/3grfKm69ttrRS18E9VD7ZCx2XwSSODZB4EhRt/Yu6w08Yz98yX0vUlZcUXHPFjry+DLd5HiF8yPEfNQZpC56a1BVTUD9M0FLcHxk0gfO8xzPH3Cfuk93X+Pjtd9042+toL/pGjt8YkMUsnavJhd0y4Huz1+ahPy6eXHfK8F/6LEtWg1GW2HtzfP8A12JI4wU9VWaNfHboJaiobURPDIWF7tnZzgLKaa1bQXajjFRMyjuTWgVFHUHs5I3Y3+i7BI8CtP0fdLdpC96ho7wyO1tmnZLTNjD3xPj5cAsdg9evr5LPXPUuh7s1ouU1BVhv2e3pi8j4ZbsvJ0moqlwtpbppd6Xl8TKnWTm63Gk3s4t9zfufwNzjkZIMxva4fqnK5qMiOGbnZbHQsPjEyVn7oCxGrK7R9FYKySwXKshufJ/w7YKqoGX58CcY8VrjacclFKW/6f7Nk77gi5Nx2/V/RK9ytVBc4nR3Cip6lhGCJYw78T0VXtaWyGzaqudvpXEwQTYjyckNIBAz5Zx6K0Nkjkis1DHUPfJM2CNr3vOS53KMknvOVVrVtX7dqi71QORLVSEfDmIH4AKQ0Xi7SazskRf4gUOyhLHrN/wS/wAE7rFd9LVlirgJPZst5Hfehfnb0PMPUKIdWWSTT2oKy2y5IifmN5+/Gd2n5fiCsrwsvBs2tKCQuxBUu9ll32w/YH0dylSdxp0wLpBbrjC9kU0craWWR/2Qx7sNLvIPI/aK6eL0S8afsz+f38zk4HfWCkvbp7eX38iPuEmqRp3UHY1b+W31uI5SejHfdf8A6HyPkrHhVIvtkuFirXUl1pX08vUZ3a8eLT0IU1cGtZC60DbLcZM19Mz6l7jvNGP/ANN/LB8Vo1W1U16TT37/AKnRol66UnaVtn0z8iTURaDxX1mNO2s0dDJ/zaqaQzHWFnQvPn3Dz37lC0aMq01CHNliuK8Lem6k3siP+NeqRdrw200cnNR0Lj2hB2fN0P7I2+JKjVCSSSSST3lFdLejGhTVOPQ+e3VxK5qurPqERFuOcIiIAiIgCIiAIiymlrhT2nUNvr62nNRT08okfGMZOO8Z2yDg+ixk2otpZMoJSkk3hGZl0JfqOe1NDYhW1xDqeGOX61uBkvcMfRDdsnOxUx11n0/bzR3TV4oqm8CFsTpSwnt3t72xb8zvPB9FkNFUktU2bUNyYRX3EAxsd/0KfrHGPT6R8SfJZ6C30sNVJVNhaamTZ0zt3keGTuB5DZVW6vp1JKMundt5Z7vmXWy02FKLlBe1jGd8dzx3/I19upLjUAfyVpa5yxAbPqHR0wI8g4834Li/VtTbyHahsNdbaXvqmvZURM83lhy0eeFtuFxkY17HNe0OaRggjII8FxdpDk4be95+nwJHsqnNTefcsfLPxOiasp4qB9a+ZnsrIzMZQct5AM5z3jCrjf8AUNTrnWVA2QFlI6oZBTQe4xzxkn9Y9T8u5SPW000Wj9cWCi5nR295NM0b8sL2tl5B5D6QHkof0a+oZqu0uoWQvqvaWCITZ5OYnAJxvgdfRTOm28YRqVObXL3YyV/VrqdSVKk9ovn708Y8i0tzqRRWyrqTsIIXyfstJ/0VQS4uJc45c7c/FWR1JSaxrrBX0bWWSQzwui+qfKx5BGDjmyM/EqvV0tlbaqo01ypZqWcDPJK3BI8R4jzC2aNGMFLdZZq1+cpuHqtJZ6d5wtbXvudGyLJkdPGG48eYYVmOJhb+g91aRl0jGxxjvL3PaG49SFDnBnT7rvqqOtlZmkt2JnEjYyfcb89/RSXr91ZetQWfTtplEUrHivqpuUOELGnDCR3nOSAe8BY6hNTuYRT9nd/P+DPSqcqdnUm17ey8en8/A6eMjbbW6dNDJOx15Y5stLBGC+Vx6EcoycEZ36dFDlLYNTWyaKvp7TdIJIHCRkrad2Wkd/RWUsViobLC5tHETNIeaaokPPLM7vc953J/DwWUXDQ1H0aHZwWV4/f1JG50lXdTtpy4X4fX/hGlJxVt/wCiMldVNDbvD9S6i6F8mNiPBneT3dOuMwdd7lVXe5VFdcJTLUzO5nO7vIAdwHQBWH4h6Fo9TUMs1PEyG7sbmKYDHaH3X+IPj1CrdIx0b3MeC17SWuB7iNiFK6V2ElKdJYfXw93gQutekxcadZ5j0a6+L8TiiIpcggiIgCIiAIiIAiIgCyulKGK56ltdFUODYZ6hjHknH0c5I9QMeqxSLGScotJ4MoSUZJtZRcZpaGgNLQBsAO5cudvvD5qAuC1qtN7q7rTXiljqpWMZJCJCdhkh2N/Nq9MtrsWnuJVdR6ko422aqjD6Nz+bs4+n4ZDgfDbxVUnYRjUlS4m2lnlz925dqepynShW4EoyeOfLnz2J052+8PmumpqYaanlnqJWRwxtL3vccBrRuSVCHESHSj6Wltuj6emnu9TM0NdSOLuUb7ZzjJONviVnOIulrDYdAzTMoIGXDlihbMM5LyRzEb+AcVirOPqZbXE8Yx8eZsd/PFRximoLLfFt125czbtARSVNHcbzURujdd6p1SxjhuIQAyPI82tz6rAXPhdFFfYbvputbb545RMIZIu0iDgc7bggeXywtAsfFa/WugjpHx0lYyJoax87Xc4A6AkEZWQ/nnvf9n235Sf7l2+hXlOpKVPGH47Y8yP/ADGwq0oxq5yt+W+eu68SUPZ9Zf2hYv8AJy/71hdT6KvWq2UsN7udsZFA8vD6WjeJNxgjLnkY/gFpH8819/7C2fsyf7lxdxlvxaQ2itjSeh5HnH/0sYWN5B8UUk/I9nqNhUi4zlJrzJUjis3D3SchZmOlhy4lxzJPIfzccY8h5BYfhC+W6UV11DXYNZcqog/qxsGGtHkMlQfqTUl01HUtmu1U6Xk+xGBysZ8Gj8+qzegL3XSXS12Ge6VdLaJZixzKd4idl2fvAZ3djv71unps40JOUsye7fgtzRT1enK4hGMcQWyXi9svu2Jg13xBoNMg00IFZdCNqdjtmeBee74dT+Kj663bXI5LpqKjuMdm6yQUkns3K0+Jbl4/9vwWY4k2ek0xXaXulHQAWuiqc1DWDmJcXNdzOJ3cTg7k9QAtn1HrzTY01Vyx3GmqjNA5jKdjsveSCMFvUdd89FzUVGnCDpU+Li5t8/Lu7zrrudWpUjWq8HDjCXLlnLzzXQxNx0lZNR6JfX6dNUKiSEywSyVMr3Fzc5Y4OcfAg+agRWM4Q0k1n4fRS3HMbXGSpw/bljPQn4gZ9VXWVwfK97RhrnFwHkSpHTZS46tPOUns/wByJ1eEezo1eHhlJbr9vqcURFLEIEREAREQBERAEREAREQGU01e6rT15p7jQkdrEcFjvsvaerT5FTxSai0hrm2xw3I0vaDc01W4MfG7v5XZGfi0quafHdcV1YwuGp5xJdUSFlqM7VOGFKL5plkqWn0Ro0PrIHW+llxjnMvaykeDdy75KIeJWtX6sr446dj4bZTk9ix32nuPV7vPGwHcPitLAA6ABFhb6fGlPtZycpd7Nl1qkq9PsacVCPcgiIpAiwiIgC+sc5j2vY4te0ghwOCCOhC+IgJ60bxGtF9tbbdqd0EFWW9nIZwOxqB45OwJ7wfRZSHTGg7fN7eIbYzlPOHSVPMweYaXEKuK+YHgPkoqWlribpTcU+iJuGtS4Uq1NTa5Nku8UeI9PcKGWz6fkMkEo5aiqAwHN9xnke8+GwURoi7ba2hbQ4IEbd3dS7qdpU/4ERF0HMEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQH//Z" 
                alt="MoveIt Logo" 
                className="w-20 h-20 rounded-2xl"
              />
            </div>
            <h1 className="text-2xl font-bold text-center mb-1">MoveIt</h1>
            <p className="text-sm text-gray-500 text-center mb-4">
              {view === 'admin' ? 'Admin Portal' : view === 'rider' ? 'Rider Portal' : 'Customer Portal'}
            </p>
            
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
                {cfg.canReg && view !== 'rider' && (
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
                {false && view === 'rider' && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-800">
                      Register to get your unique referral code and start earning!
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
          
          {/* Switch between Customer and Rider portals */}
          {view === 'customer' && (
            <div className="text-center mt-4">
              <button 
                onClick={() => { setView('rider'); setIsReg(false); setLoginForm({ email: '', password: '' }); }}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors"
              >
                Login As Rider
              </button>
            </div>
          )}
          {view === 'rider' && (
            <div className="text-center mt-4">
              <button 
                onClick={() => { setView('customer'); setIsReg(false); setLoginForm({ email: '', password: '' }); }}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                Login As Customer
              </button>
            </div>
          )}
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
                  onClick={() => { setAdminView('withdrawals'); loadWithdrawalRequests(); }} 
                  className={`px-4 py-2 rounded text-sm font-medium relative ${adminView === 'withdrawals' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  💰 Withdrawals
                  {/* Pending withdrawals badge */}
                  {withdrawalRequests.filter((r: any) => r.details?.status === 'pending').length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {withdrawalRequests.filter((r: any) => r.details?.status === 'pending').length}
                    </span>
                  )}
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
        {/* Loading state for customer/rider when data not yet loaded */}
        {(auth.type === 'customer' || auth.type === 'rider') && !curr && !error && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your data...</p>
            <p className="text-sm text-gray-400 mt-2">This may take a few seconds on first load</p>
          </div>
        )}
        
        {/* Error state with retry button */}
        {error && (
          <div className="text-center py-12">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <p className="text-red-600 font-semibold mb-2">Failed to load data</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <button 
              onClick={() => { setError(''); loadData(); }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              🔄 Retry
            </button>
          </div>
        )}
        
        {auth.type === 'customer' && curr && (
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
                    <CreditCard className="text-blue-600" />
                    Top Up Credits
                  </h3>
                  <button 
                    onClick={() => { setShowTopUp(false); setTopUpAmt(''); }} 
                    className="text-gray-500 hover:text-gray-700 p-2"
                  >
                    <X size={28} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-purple-900 mb-2">💳 Secure Payment via Stripe</p>
                    <p className="text-xs text-purple-700">Pay securely using PayNow QR</p>
                  </div>
                  
                  {/* Quick Amount Buttons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Amount</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[10, 20, 50, 100, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setTopUpAmt(amt.toString())}
                          className={`py-3 rounded-lg font-semibold transition-colors ${
                            topUpAmt === amt.toString()
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {topUpAmt && parseFloat(topUpAmt) >= 10 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Amount to pay:</span>
                        <span className="text-2xl font-bold text-green-600">${parseFloat(topUpAmt).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-gray-500 text-sm">Credits you'll receive:</span>
                        <span className="text-lg font-semibold text-green-700">${parseFloat(topUpAmt).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  
                  <button 
                    onClick={async () => {
                      const amt = parseFloat(topUpAmt);
                      if (!amt || amt < 10) {
                        alert('Minimum top-up amount is $10');
                        return;
                      }
                      
                      try {
                        // Show loading state
                        const btn = document.getElementById('stripe-checkout-btn');
                        if (btn) {
                          btn.textContent = 'Redirecting to payment...';
                          btn.setAttribute('disabled', 'true');
                        }
                        
                        // Create Stripe checkout session
                        const response = await fetch('/api/create-checkout-session', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            amount: amt,
                            customerId: auth.id,
                            customerEmail: curr?.email || '',
                            customerName: curr?.name || '',
                          }),
                        });
                        
                        const data = await response.json();
                        
                        if (data.error) {
                          alert('Error: ' + data.error);
                          if (btn) {
                            btn.textContent = 'Pay with PayNow / Card';
                            btn.removeAttribute('disabled');
                          }
                          return;
                        }
                        
                        // Redirect to Stripe checkout
                        if (data.url) {
                          // Use direct navigation - most reliable across all platforms including iOS WebViews
                          // window.open and target='_blank' are blocked by iOS popup blockers in WebViews
                          window.location.href = data.url;
                        }
                      } catch (error: any) {
                        alert('Payment error: ' + error.message);
                        const btn = document.getElementById('stripe-checkout-btn');
                        if (btn) {
                          btn.textContent = 'Pay with PayNow / Card';
                          btn.removeAttribute('disabled');
                        }
                      }
                    }}
                    id="stripe-checkout-btn"
                    disabled={!topUpAmt || parseFloat(topUpAmt) < 10}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CreditCard size={20} />
                    Pay with PayNow
                  </button>
                  
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <span className="text-xs text-gray-400">Secure PayNow payment powered by Stripe</span>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Notifications Banner */}
            {customerNotifications.length > 0 && (
              <div className="mb-4 space-y-2">
                {customerNotifications.slice(0, 5).map((notif: any) => (
                  <div key={notif.id} className={`p-3 rounded-lg flex justify-between items-center ${
                    notif.type === 'completed' ? 'bg-green-50 border border-green-200' :
                    notif.type === 'accepted' ? 'bg-blue-50 border border-blue-200' :
                    notif.type === 'picked-up' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-purple-50 border border-purple-200'
                  }`}>
                    <div>
                      <p className={`text-sm font-medium ${
                        notif.type === 'completed' ? 'text-green-800' :
                        notif.type === 'accepted' ? 'text-blue-800' :
                        notif.type === 'picked-up' ? 'text-yellow-800' :
                        'text-purple-800'
                      }`}>{notif.message}</p>
                      <p className="text-xs text-gray-500">{formatSGT(notif.timestamp)}</p>
                    </div>
                    <button 
                      onClick={() => setCustomerNotifications(prev => prev.filter(n => n.id !== notif.id))}
                      className="text-gray-400 hover:text-gray-600 ml-2"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {customerNotifications.length > 5 && (
                  <p className="text-xs text-gray-500 text-center">{customerNotifications.length - 5} more notifications</p>
                )}
                <button 
                  onClick={() => setCustomerNotifications([])}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear all notifications
                </button>
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
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit No <span className="text-red-500">*</span>
                          <span className="text-xs text-gray-500 ml-1">(Enter "N/A" if not applicable)</span>
                        </label>
                        <input 
                          type="text" 
                          value={jobForm.pickupUnitNo} 
                          onChange={(e) => setJobForm({...jobForm, pickupUnitNo: e.target.value})} 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                          placeholder="e.g., #01-23 or N/A for houses" 
                          required
                        />
                      </div>
                      
                      {/* Use My Profile Checkbox - Auto-fill pickup contact */}
                      <div className="mt-3 p-4 bg-green-100 rounded-lg border-2 border-green-400">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useMyProfile}
                            onChange={(e) => {
                              setUseMyProfile(e.target.checked);
                              if (e.target.checked) {
                                setJobForm(prev => ({
                                  ...prev,
                                  pickupContact: curr?.name || '',
                                  pickupPhone: curr?.phone || ''
                                }));
                              } else {
                                setJobForm(prev => ({
                                  ...prev,
                                  pickupContact: '',
                                  pickupPhone: ''
                                }));
                              }
                            }}
                            className="w-6 h-6 mt-0.5 text-green-600 rounded focus:ring-green-500 border-2 border-green-500"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-green-800 text-base">✅ Use my profile as pickup contact</span>
                            <div className="mt-2 p-2 bg-white rounded border border-green-300">
                              <p className="text-sm text-green-700"><strong>Name:</strong> {curr?.name || 'Not set'}</p>
                              <p className="text-sm text-green-700"><strong>Phone:</strong> {curr?.phone || 'Not set'}</p>
                            </div>
                            <p className="text-xs text-green-600 mt-1">Check this to auto-fill contact details below</p>
                          </div>
                        </label>
                      </div>

                      {/* Contact fields - show when not using profile */}
                      {!useMyProfile && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Contact Details</label>
                          <div className="grid grid-cols-2 gap-2">
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
                      )}
                      
                      {/* Show filled values when using profile */}
                      {useMyProfile && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Contact Details (Auto-filled)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              value={curr?.name || ''} 
                              disabled
                              className="px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-sm text-green-800" 
                            />
                            <input 
                              type="tel" 
                              value={curr?.phone || ''} 
                              disabled
                              className="px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-sm text-green-800" 
                            />
                          </div>
                        </div>
                      )}
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
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit No <span className="text-red-500">*</span>
                            <span className="text-xs text-gray-500 ml-1">(Enter "N/A" if not applicable)</span>
                          </label>
                          <input 
                            type="text" 
                            value={stop.unitNo || ''} 
                            onChange={(e) => {
                              const newStops = [...jobForm.stops];
                              newStops[index].unitNo = e.target.value;
                              setJobForm({...jobForm, stops: newStops});
                            }} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                            placeholder="e.g., #01-23 or N/A for houses" 
                            required
                          />
                        </div>
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
                      stops: [...jobForm.stops, { address: '', unitNo: '', recipientName: '', recipientPhone: '' }]
                    });
                  }}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-xl">+</span> Add Stop
                </button>

                {/* Delivery Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    value={jobForm.deliveryDate || ''} 
                    onChange={(e) => setJobForm({...jobForm, deliveryDate: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })}
                    required
                  />
                </div>

                {/* Delivery Time Slot */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Time Slot <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={jobForm.timeframe} 
                    onChange={(e) => setJobForm({...jobForm, timeframe: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a delivery slot</option>
                    {DELIVERY_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
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

                {/* Promo Code Section */}
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <label className="block text-sm font-medium text-purple-800 mb-2">🎟️ Promo Code</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={promoCode} 
                      onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); setPromoDiscount(null); }} 
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" 
                      placeholder="Enter promo code"
                    />
                    <button 
                      onClick={redeemPromoCode} 
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 text-sm"
                    >
                      Apply
                    </button>
                    {promoDiscount && (
                      <button 
                        onClick={() => { setPromoCode(''); setPromoDiscount(null); setPromoError(''); }} 
                        className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {promoError && (
                    <p className="text-sm text-red-600 mt-2">{promoError}</p>
                  )}
                  {promoDiscount && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-medium">
                        ✅ Code "{promoDiscount.code}" applied! 
                        {promoDiscount.discount_type === 'fixed' 
                          ? ` $${promoDiscount.discount_value} off` 
                          : ` ${promoDiscount.discount_value}% off`}
                      </p>
                      {jobForm.price && (
                        <p className="text-xs text-green-600 mt-1">
                          Original: ${parseFloat(jobForm.price).toFixed(2)} → 
                          You pay: <strong>${getDiscountedPrice(parseFloat(jobForm.price)).toFixed(2)}</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button 
                  onClick={createJob} 
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
                >
                  Post Job - ${promoDiscount && jobForm.price ? getDiscountedPrice(parseFloat(jobForm.price)).toFixed(2) : jobForm.price} {jobForm.stops.length > 1 ? `(${jobForm.stops.length} stops)` : ''}
                  {promoDiscount && <span className="text-yellow-300 text-sm ml-1">(promo applied)</span>}
                </button>
                
                {/* Bulk Import Option */}
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => setShowCustomerBulkImport(!showCustomerBulkImport)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Upload size={18} />
                    {showCustomerBulkImport ? 'Hide Bulk Import' : 'Bulk Import (CSV/Excel)'}
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
                    <p className="text-sm font-medium text-gray-700 mb-2">Required Columns:</p>
                    <code className="text-xs text-gray-600">pickup, pickup_unit_no, delivery, delivery_unit_no, recipient_name, recipient_phone, delivery_slot, delivery_date, parcel_size, price, notes</code>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          const template = 'pickup,pickup_unit_no,delivery,delivery_unit_no,recipient_name,recipient_phone,delivery_slot,delivery_date,parcel_size,price,notes\n"123 Orchard Rd","#01-01","456 Marina Bay","#05-10","John Doe","91234567","6am-11am","2026-03-16","small","12","Handle with care"\n"789 Bugis St","N/A","321 Tampines Ave","#02-15","Jane Smith","98765432","12pm-5pm","2026-03-17","medium","10",""';
                          const blob = new Blob([template], { type: 'text/csv' });
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(blob);
                          link.download = 'bulk_order_template.csv';
                          link.click();
                        }}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Download CSV Template
                      </button>
                      <span className="text-gray-400">|</span>
                      <button
                        onClick={() => {
                          const headers = ['pickup', 'pickup_unit_no', 'delivery', 'delivery_unit_no', 'recipient_name', 'recipient_phone', 'delivery_slot', 'delivery_date', 'parcel_size', 'price', 'notes'];
                          const sampleData = [
                            ['123 Orchard Rd', '#01-01', '456 Marina Bay', '#05-10', 'John Doe', '91234567', '6am-11am', '2026-03-16', 'small', '12', 'Handle with care'],
                            ['789 Bugis St', 'N/A', '321 Tampines Ave', '#02-15', 'Jane Smith', '98765432', '12pm-5pm', '2026-03-17', 'medium', '10', '']
                          ];
                          
                          let csvContent = headers.join(',') + '\n';
                          sampleData.forEach(row => {
                            csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
                          });
                          
                          const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(blob);
                          link.download = 'bulk_order_template.xlsx';
                          link.click();
                        }}
                        className="text-sm text-green-600 hover:underline"
                      >
                        Download Excel Template
                      </button>
                    </div>
                  </div>
                  
                  {/* File Upload */}
                  <input
                    ref={customerFileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleCustomerBulkImport}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-white hover:file:bg-yellow-600 file:cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">Accepts CSV and Excel (.xlsx) files</p>
                  
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
                              {/* Order ID */}
                              {order.order_id && (
                                <p className="text-sm font-bold text-purple-600 mb-1">📋 {order.order_id}</p>
                              )}
                              <p className="font-semibold text-gray-800">📍 {order.pickup}</p>
                              <p className="text-sm text-gray-500">→ {order.delivery}</p>
                              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                <span>📅 {formatSGTDate(order.created_at)}</span>
                                {order.timeframe && <span>🕐 {order.timeframe}</span>}
                                {order.rider_name && <span>🏍️ {order.rider_name}</span>}
                                {order.parcel_size && <span>📦 {order.parcel_size}</span>}
                              </div>
                              {order.recipient_name && (
                                <p className="text-xs text-gray-500 mt-1">👤 Recipient: {order.recipient_name}</p>
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
                                  ✓ {formatSGT(order.completed_at)}
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
                      {renderJobDetailCard(job)}
                      
                      {/* Rider Info - when assigned */}
                      {job.rider_name && job.status !== 'posted' && (
                        <div className="bg-blue-50 p-3 rounded-lg mb-3">
                          <p className="text-sm font-medium text-blue-800 mb-1">🏍️ Assigned Rider</p>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold">{job.rider_name}</p>
                              {job.rider_phone && <p className="text-sm text-gray-600">{job.rider_phone}</p>}
                              {job.rider_vehicle_type && (
                                <p className="text-xs text-blue-600 mt-1">
                                  {job.rider_vehicle_type === 'car' ? '🚗 Car' : job.rider_vehicle_type === 'van' ? '🚐 Van' : job.rider_vehicle_type === 'lorry' ? '🚛 Lorry' : '🏍️ Bike'}
                                </p>
                              )}
                            </div>
                            {job.rider_phone && (
                              <div className="flex gap-2">
                                <a
                                  href={`tel:${job.rider_phone}`}
                                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                  title="Call Rider"
                                >
                                  📞
                                </a>
                                <a
                                  href={`https://wa.me/65${job.rider_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${job.rider_name},\n\nCustomer: ${curr?.name || ''}\nOrder ID: ${job.order_id || 'N/A'}\nPickup: ${job.pickup}\nDrop-off: ${job.delivery}\n\nThank you!`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                  title="WhatsApp Rider"
                                >
                                  💬
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Urgent Label */}
                      {job.is_urgent && (
                        <div className="bg-red-100 border border-red-300 p-2 rounded-lg mb-3 text-center">
                          <p className="text-sm font-bold text-red-700">🔥 URGENT — Priority Order {job.boost_amount ? `(+$${job.boost_amount})` : ''}</p>
                        </div>
                      )}
                      
                      {/* Boost/Urgent Button - for posted jobs waiting for a rider */}
                      {job.status === 'posted' && (
                        <div className="mb-3">
                          <button
                            onClick={() => setShowBoostModal(job)}
                            className="w-full py-2 px-3 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
                          >
                            ⚡ Boost Order — Get a Driver Faster
                          </button>
                        </div>
                      )}

                      {/* Tracking & Communication Buttons - for active jobs */}
                      {job.status !== 'posted' && job.status !== 'cancelled' && (
                        <div className="flex gap-2 mb-3">
                          <a
                            href={`?track=${job.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 px-3 bg-purple-100 text-purple-700 rounded-lg text-center text-sm font-medium hover:bg-purple-200 transition-colors"
                          >
                            📍 Track Live
                          </a>
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}?track=${job.id}`;
                              navigator.clipboard.writeText(url);
                              alert('Tracking link copied!');
                            }}
                            className="flex-1 py-2 px-3 bg-blue-100 text-blue-700 rounded-lg text-center text-sm font-medium hover:bg-blue-200 transition-colors"
                          >
                            🔗 Copy Link
                          </button>
                        </div>
                      )}
                      
                      {/* POD - for completed jobs */}
                      {job.status === 'completed' && (
                        <div className="bg-green-50 p-3 rounded-lg mb-3">
                          <p className="text-sm font-medium text-green-800 mb-2">✅ Delivery Completed</p>
                          
                          {/* Multi-stop POD photos */}
                          {job.pod_images && Array.isArray(job.pod_images) && job.pod_images.length > 0 ? (
                            <div>
                              <p className="text-xs text-gray-600 mb-2">Proof of Delivery ({job.pod_images.length} photo{job.pod_images.length > 1 ? 's' : ''}):</p>
                              <div className="grid grid-cols-2 gap-2">
                                {job.pod_images.map((pod: any, idx: number) => (
                                  <div key={idx} className="border rounded-lg overflow-hidden">
                                    <img 
                                      src={pod.image} 
                                      alt={`POD Drop-off ${pod.stopIndex + 1}`} 
                                      className="w-full h-24 object-cover cursor-pointer hover:opacity-90"
                                      onClick={() => setViewingPodImage(pod.image)}
                                    />
                                    <div className="p-1 bg-white">
                                      <p className="text-xs font-medium text-gray-700">Drop-off {pod.stopIndex + 1}</p>
                                      <p className="text-xs text-gray-500 truncate">{pod.address}</p>
                                      <p className="text-xs text-gray-400">{formatSGT(pod.timestamp)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : job.pod_image && !job.pod_image.includes('truncated') ? (
                            <div>
                              <p className="text-xs text-gray-600 mb-2">Proof of Delivery:</p>
                              <img 
                                src={job.pod_image} 
                                alt="Proof of Delivery" 
                                className="w-full max-w-xs rounded-lg border cursor-pointer hover:opacity-90"
                                onClick={() => setViewingPodImage(job.pod_image)}
                              />
                              {job.pod_timestamp && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Delivered: {formatSGT(job.pod_timestamp)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">No POD photo uploaded</p>
                          )}
                          <a
                            href={`?track=${job.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-xs text-green-700 hover:underline"
                          >
                            View delivery details →
                          </a>
                        </div>
                      )}
                      
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

        {auth.type === 'rider' && curr && (
          <div className="space-y-6">
            {/* Online/Offline Status Bar */}
            <div className={`p-4 rounded-lg ${riderIsOnline ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-gray-300'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${riderIsOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <div>
                    <p className={`font-bold text-lg ${riderIsOnline ? 'text-green-700' : 'text-gray-600'}`}>
                      {riderIsOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {riderIsOnline 
                        ? 'You are receiving new job notifications' 
                        : 'Go online to receive job notifications'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={riderIsOnline ? riderGoOffline : riderGoOnline}
                  className={`px-6 py-3 rounded-lg font-bold text-white transition-colors ${
                    riderIsOnline 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {riderIsOnline ? 'Go Offline' : 'Go Online'}
                </button>
              </div>
              {!riderIsOnline && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ GPS must be enabled to go online and accept jobs
                </p>
              )}
              
              {/* Auto-Accept Toggle */}
              {riderIsOnline && (
                <div className="mt-3 p-3 bg-white rounded-lg border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">🤖 Auto-Accept Orders</p>
                    <p className="text-xs text-gray-500">
                      {curr?.vehicle_type === 'car' || curr?.vehicle_type === 'van' || curr?.vehicle_type === 'lorry'
                        ? 'Auto-accept jobs within 5km'
                        : 'Auto-accept jobs within 10km'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAutoAcceptEnabled(!autoAcceptEnabled);
                      alert(autoAcceptEnabled 
                        ? '🔴 Auto-Accept disabled. You will need to manually accept jobs.'
                        : `🟢 Auto-Accept enabled!\n\nJobs within ${curr?.vehicle_type === 'car' || curr?.vehicle_type === 'van' || curr?.vehicle_type === 'lorry' ? '5km' : '10km'} will be automatically accepted.`
                      );
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      autoAcceptEnabled 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {autoAcceptEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              )}
            </div>

            {/* New Job Notifications */}
            {riderIsOnline && newJobNotifications.length > 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🔔</span>
                  <h3 className="font-bold text-yellow-800">
                    New Jobs Available! ({newJobNotifications.length})
                  </h3>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {newJobNotifications.map((job: any) => (
                    <div key={job.id} className="bg-white p-3 rounded-lg border border-yellow-300 flex justify-between items-center">
                      <div>
                        {job.order_id && <p className="text-xs font-bold text-purple-600">{job.order_id}</p>}
                        <p className="font-semibold text-sm">{job.pickup} → {job.delivery}</p>
                        <p className="text-xs text-gray-500">
                          💰 ${job.price} | 📦 {job.parcel_size || 'N/A'} | 🕐 {job.timeframe || 'ASAP'}
                        </p>
                      </div>
                      <button
                        onClick={() => acceptJob(job.id)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 text-sm"
                      >
                        Accept
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GPS Warning Modal - Feature 11 */}
            {showGpsWarning && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
                  <div className="text-6xl mb-4">📍</div>
                  <h3 className="text-2xl font-bold text-orange-600 mb-2">GPS Recommended</h3>
                  <p className="text-gray-600 mb-4">
                    For the best experience, please enable GPS location services. 
                    This helps track deliveries and update customers in real-time.
                  </p>
                  <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>How to enable:</strong><br/>
                      • iPhone: Settings → Privacy → Location Services → Safari → Allow<br/>
                      • Android: Settings → Location → Turn on, then allow in browser
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.geolocation.getCurrentPosition(
                          () => {
                            setGpsPermissionGranted(true);
                            setShowGpsWarning(false);
                          },
                          () => alert('GPS not detected yet. You can continue and try again later.'),
                          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                        );
                      }}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                    >
                      Check GPS
                    </button>
                    <button
                      onClick={() => setShowGpsWarning(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Continue Anyway
                    </button>
                  </div>
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
              {gpsPermissionGranted !== true && (
                <button
                  onClick={() => {
                    navigator.geolocation.getCurrentPosition(
                      () => { setGpsPermissionGranted(true); alert('GPS is working!'); },
                      () => setShowGpsWarning(true),
                      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                    );
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-medium"
                >
                  <AlertCircle size={18} />
                  Enable GPS
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
                      <p><span className="text-gray-500">Member Since:</span> {curr.created_at ? formatSGTDate(curr.created_at) : 'N/A'}</p>
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
                              <span>📅 {formatSGTDate(delivery.created_at)}</span>
                              <span>👤 {delivery.customer_name}</span>
                              {delivery.parcel_size && <span>📦 {delivery.parcel_size}</span>}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            {delivery.commissions ? (
                              <p className="text-xl font-bold text-green-600">${delivery.commissions.activeRider?.toFixed(2) || '0.00'}</p>
                            ) : (
                              (() => {
                                const comm = calculateCommissions(delivery.price, curr?.tier || 1, curr?.upline_chain || [], delivery.total_stops || 1);
                                return <p className="text-xl font-bold text-green-600">${comm.activeRider.toFixed(2)}</p>;
                              })()
                            )}
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
                                ✓ {formatSGT(delivery.completed_at)}
                              </p>
                            )}
                            {delivery.pod_image && (
                              <p className="text-xs text-green-500 mt-1">📸 POD Uploaded</p>
                            )}
                          </div>
                        </div>
                        {/* Remove duplicate earnings breakdown since it's now shown above */}
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

            {/* Withdrawal Notifications - Show status of rider's withdrawal requests */}
            {(() => {
              const myWithdrawals = auditLogs.filter((log: any) => 
                log.action === 'withdrawal_request' && log.user_id === auth.id
              ).slice(0, 3);
              
              if (myWithdrawals.length === 0) return null;
              
              return (
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <h4 className="font-bold text-gray-800 mb-3">📋 Your Withdrawal Requests</h4>
                  <div className="space-y-2">
                    {myWithdrawals.map((req: any) => (
                      <div 
                        key={req.id} 
                        className={`p-3 rounded-lg border-l-4 ${
                          req.details?.status === 'completed' ? 'bg-blue-50 border-blue-500' :
                          req.details?.status === 'approved' ? 'bg-green-50 border-green-500' :
                          req.details?.status === 'rejected' ? 'bg-red-50 border-red-500' :
                          'bg-yellow-50 border-yellow-500'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">${(req.details?.amount || 0).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{req.timestamp ? formatSGTDate(req.timestamp) : 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              req.details?.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                              req.details?.status === 'approved' ? 'bg-green-100 text-green-700' :
                              req.details?.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {(req.details?.status || 'pending').toUpperCase()}
                            </span>
                            {req.details?.status === 'approved' && (
                              <p className="text-xs text-green-600 mt-1">Being processed</p>
                            )}
                            {req.details?.status === 'completed' && (
                              <p className="text-xs text-blue-600 mt-1">Payment sent! ✓</p>
                            )}
                            {req.details?.status === 'rejected' && (
                              <p className="text-xs text-red-600 mt-1">Please resubmit</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Withdrawal Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                💰 Withdrawal
              </h3>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Available Balance:</span>
                  <span className="text-2xl font-bold text-green-600">${(curr.earnings || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Minimum withdrawal:</span>
                  <span>$50.00</span>
                </div>
              </div>
              
              {(curr.earnings || 0) >= 50 ? (
                <div className="space-y-4">
                  {/* Withdrawal Method Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setWithdrawMethod('paynow')}
                        className={`py-3 px-4 rounded-lg font-medium border-2 transition-colors ${
                          withdrawMethod === 'paynow'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        📱 PayNow
                      </button>
                      <button
                        onClick={() => setWithdrawMethod('bank')}
                        className={`py-3 px-4 rounded-lg font-medium border-2 transition-colors ${
                          withdrawMethod === 'bank'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        🏦 Bank Account
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Amount <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      min="50"
                      max={curr.earnings || 0}
                      step="0.01"
                      value={withdrawForm.amount}
                      onChange={(e) => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                      placeholder="Enter amount (min $50)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={withdrawForm.fullName}
                      onChange={(e) => setWithdrawForm({...withdrawForm, fullName: e.target.value})}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      value={withdrawForm.mobileNumber}
                      onChange={(e) => setWithdrawForm({...withdrawForm, mobileNumber: e.target.value})}
                      placeholder="Enter your mobile number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Bank Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name <span className="text-red-500">*</span></label>
                    <select
                      value={withdrawForm.bankName}
                      onChange={(e) => setWithdrawForm({...withdrawForm, bankName: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Bank</option>
                      <option value="DBS">DBS Bank</option>
                      <option value="OCBC">OCBC Bank</option>
                      <option value="UOB">UOB Bank</option>
                      <option value="Standard Chartered">Standard Chartered</option>
                      <option value="Citibank">Citibank</option>
                      <option value="HSBC">HSBC</option>
                      <option value="Maybank">Maybank</option>
                      <option value="CIMB">CIMB Bank</option>
                      <option value="Bank of China">Bank of China</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* PayNow Number - only show if PayNow selected */}
                  {withdrawMethod === 'paynow' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PayNow Number <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={withdrawForm.paynowNo}
                        onChange={(e) => setWithdrawForm({...withdrawForm, paynowNo: e.target.value})}
                        placeholder="Enter your PayNow number (mobile/NRIC)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}

                  {/* Bank Account Number - only show if Bank selected */}
                  {withdrawMethod === 'bank' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account Number <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={withdrawForm.bankAccountNo}
                        onChange={(e) => setWithdrawForm({...withdrawForm, bankAccountNo: e.target.value})}
                        placeholder="Enter your bank account number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <button
                    onClick={async () => {
                      const amount = parseFloat(withdrawForm.amount);
                      if (!amount || amount < 50) {
                        alert('Minimum withdrawal is $50');
                        return;
                      }
                      if (amount > (curr.earnings || 0)) {
                        alert('Insufficient balance');
                        return;
                      }
                      if (!withdrawForm.fullName) {
                        alert('Please enter your full name');
                        return;
                      }
                      if (!withdrawForm.mobileNumber) {
                        alert('Please enter your mobile number');
                        return;
                      }
                      if (!withdrawForm.bankName) {
                        alert('Please select a bank');
                        return;
                      }
                      if (withdrawMethod === 'paynow' && !withdrawForm.paynowNo) {
                        alert('Please enter your PayNow number');
                        return;
                      }
                      if (withdrawMethod === 'bank' && !withdrawForm.bankAccountNo) {
                        alert('Please enter your bank account number');
                        return;
                      }
                      try {
                        // Deduct balance immediately on submission
                        const newBalance = (curr.earnings || 0) - amount;
                        await api(`riders?id=eq.${auth.id}`, 'PATCH', { earnings: newBalance });
                        
                        // Save withdrawal request to audit_logs
                        await api('audit_logs', 'POST', {
                          action: 'withdrawal_request',
                          user_id: auth.id,
                          details: JSON.stringify({
                            riderId: auth.id,
                            riderName: curr.name,
                            riderPhone: curr.phone,
                            amount: amount,
                            withdrawMethod: withdrawMethod,
                            fullName: withdrawForm.fullName,
                            mobileNumber: withdrawForm.mobileNumber,
                            bankName: withdrawForm.bankName,
                            paynowNo: withdrawMethod === 'paynow' ? withdrawForm.paynowNo : null,
                            bankAccountNo: withdrawMethod === 'bank' ? withdrawForm.bankAccountNo : null,
                            status: 'pending',
                            requestedAt: new Date().toISOString()
                          })
                        });
                        
                        alert(`Withdrawal request submitted!\n\nAmount: $${amount.toFixed(2)}\nMethod: ${withdrawMethod === 'paynow' ? 'PayNow' : 'Bank Transfer'}\n\nYour request has been submitted to the administrator for review and approval.`);
                        
                        // Clear the form
                        setWithdrawForm({
                          amount: '',
                          fullName: '',
                          mobileNumber: '',
                          bankName: '',
                          paynowNo: '',
                          bankAccountNo: ''
                        });
                        loadData();
                      } catch (e: any) {
                        alert('Error submitting withdrawal request: ' + e.message);
                      }
                    }}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Request Withdrawal
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    Balance will be deducted upon submission. If rejected, balance will be returned.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-yellow-50 p-3 rounded-lg mb-2">
                    <p className="text-sm text-yellow-800">
                      ⚠️ You need at least <strong>$50.00</strong> to withdraw. 
                      Current balance: <strong>${(curr.earnings || 0).toFixed(2)}</strong>
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full transition-all" 
                        style={{ width: `${Math.min(100, ((curr.earnings || 0) / 50) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Disabled Method Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Withdrawal Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="py-3 px-4 rounded-lg font-medium border-2 border-gray-200 bg-gray-100 text-gray-400 text-center cursor-not-allowed">
                        📱 PayNow
                      </div>
                      <div className="py-3 px-4 rounded-lg font-medium border-2 border-gray-200 bg-gray-100 text-gray-400 text-center cursor-not-allowed">
                        🏦 Bank Account
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Withdrawal Amount</label>
                    <input type="number" placeholder="Enter amount (min $50)" className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed" disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                    <input type="text" placeholder="Enter your full name" className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed" disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Mobile Number</label>
                    <input type="tel" placeholder="Enter your mobile number" className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed" disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Bank Name</label>
                    <input type="text" placeholder="Select bank" className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed" disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">PayNow No / Bank Account No</label>
                    <input type="text" placeholder="Enter PayNow or bank account number" className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed" disabled />
                  </div>
                  
                  <button disabled className="w-full py-3 bg-gray-300 text-gray-500 rounded-lg font-semibold cursor-not-allowed">
                    Request Withdrawal
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Complete more deliveries to reach the minimum withdrawal amount
                  </p>
                </div>
              )}
            </div>

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
                        {(() => {
                          const comm = calculateCommissions(job.price, curr.tier, curr.upline_chain || [], job.total_stops || 1);
                          return <span className="text-lg font-bold text-green-600">${comm.activeRider.toFixed(2)}</span>;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-Job Selector - Show when rider has multiple active jobs */}
            {activeJobsList.length > 1 && (
              <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-700 mb-3">📋 Your Active Jobs ({activeJobsList.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {activeJobsList.map((job: any, idx: number) => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        (selectedJobId === job.id || (!selectedJobId && idx === 0))
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Job {idx + 1}: {job.delivery?.substring(0, 15)}...
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeJob && (
              <div className="bg-white rounded-lg shadow-xl p-4 border-2 border-blue-500">
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Package className="text-blue-600" />
                  Active Delivery {activeJobsList.length > 1 && `(${activeJobsList.indexOf(activeJob) + 1}/${activeJobsList.length})`}
                </h3>
                
                {/* Summary View (always visible) */}
                <div 
                  className="bg-blue-50 p-4 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => setExpandedActiveJob(!expandedActiveJob)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-lg text-gray-900">
                        {extractAreaName(activeJob.pickup)} → {extractAreaName(activeJob.delivery)}
                      </p>
                      <p className="text-sm text-gray-700">👤 {activeJob.customer_name}</p>
                      <p className="text-sm text-gray-700">📞 {activeJob.customer_phone}</p>
                      {activeJob.parcel_size && <p className="text-sm text-gray-700">📦 <span className="capitalize">{activeJob.parcel_size}</span></p>}
                      {activeJob.delivery_date && (
                        <p className="text-sm font-medium text-blue-700">📅 Date: {formatDeliveryDate(activeJob.delivery_date)}</p>
                      )}
                      {(activeJob.timeframe || activeJob.delivery_slot) && (
                        <p className="text-sm font-medium text-blue-700">🕐 Slot: {activeJob.timeframe || activeJob.delivery_slot}</p>
                      )}
                      {activeJob.remarks && <p className="text-sm text-gray-500 italic">📝 {activeJob.remarks}</p>}
                    </div>
                    <div className="text-right">
                      {(() => {
                        const earnings = calculateCommissions(activeJob.price, curr.tier, curr.upline_chain || [], activeJob.total_stops || 1);
                        return <p className="text-2xl font-bold text-green-600">${earnings.activeRider.toFixed(2)}</p>;
                      })()}
                      <p className="text-xs text-gray-500 mt-1">{expandedActiveJob ? '▲ Tap to hide' : '▼ Tap for details'}</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Full Detail (toggle) */}
                {expandedActiveJob && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Full Address Details</p>
                    <div className="space-y-2 text-sm">
                      <div className="bg-orange-50 p-2 rounded border-l-4 border-orange-400">
                        <p className="text-xs font-medium text-orange-600">PICKUP</p>
                        <p className="text-gray-800">{activeJob.pickup}</p>
                        {activeJob.pickup_contact && (
                          <p className="text-xs text-gray-500">Contact: {activeJob.pickup_contact} {activeJob.pickup_phone && `(${activeJob.pickup_phone})`}</p>
                        )}
                      </div>
                      {(activeJob.stops || []).map((stop: any, idx: number) => (
                        <div key={idx} className="bg-green-50 p-2 rounded border-l-4 border-green-400">
                          <p className="text-xs font-medium text-green-600">DROP-OFF {idx + 1}</p>
                          <p className="text-gray-800">{stop.address} {stop.unitNo || ''}</p>
                          {stop.recipientName && (
                            <p className="text-xs text-gray-500">Recipient: {stop.recipientName} {stop.recipientPhone && `(${stop.recipientPhone})`}</p>
                          )}
                        </div>
                      ))}
                      {(!activeJob.stops || activeJob.stops.length === 0) && (
                        <div className="bg-green-50 p-2 rounded border-l-4 border-green-400">
                          <p className="text-xs font-medium text-green-600">DROP-OFF</p>
                          <p className="text-gray-800">{activeJob.delivery}</p>
                          {activeJob.recipient_name && (
                            <p className="text-xs text-gray-500">Recipient: {activeJob.recipient_name} {activeJob.recipient_phone && `(${activeJob.recipient_phone})`}</p>
                          )}
                        </div>
                      )}
                      {activeJob.order_id && (
                        <p className="text-xs text-gray-500">Order ID: #{activeJob.order_id}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Two Column Layout - Action Buttons */}
                <div className="flex gap-4 mt-3">
                  {/* Right Column - Action Buttons */}
                  <div className="w-48 flex flex-col gap-2">
                    {/* GPS Tracking Button */}
                    {!isTrackingGPS ? (
                      <button 
                        onClick={() => startGPSTracking(activeJob.id, auth.id as string)} 
                        className="w-full bg-purple-600 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <MapPin size={16} />
                        📍 Start GPS
                      </button>
                    ) : (
                      <div className="space-y-1">
                        <div className="bg-green-100 border border-green-500 rounded-lg p-2 flex items-center gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                          <span className="text-green-800 font-medium text-xs">GPS Active</span>
                        </div>
                        <button 
                          onClick={stopGPSTracking} 
                          className="w-full bg-red-500 text-white py-1 px-2 rounded-lg font-medium text-xs hover:bg-red-600 transition-colors"
                        >
                          Stop GPS
                        </button>
                      </div>
                    )}
                    
                    {/* WhatsApp Button */}
                    <button 
                      onClick={() => setShowWhatsAppModal(true)} 
                      className="w-full bg-green-500 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                    >
                      💬 WhatsApp
                    </button>

                    {/* Status Update Buttons */}
                    {activeJob.status === 'accepted' && (
                      <button 
                        onClick={() => updateStatus('picked-up')} 
                        className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Package size={16} />
                        Pick Up
                      </button>
                    )}
                    {activeJob.status === 'picked-up' && (
                      <button 
                        onClick={() => updateStatus('on-the-way')} 
                        className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Navigation size={16} />
                        On My Way
                      </button>
                    )}
                    {(activeJob.status === 'on-the-way' || activeJob.status === 'picked-up') && (
                      <button 
                        onClick={() => {
                          // Load any previously submitted stop photos
                          const existingPods = activeJob.pod_images || [];
                          setStopPods(existingPods);
                          // Set to first unsubmitted stop
                          const totalStops = activeJob.stops?.length || 1;
                          const nextUnsubmitted = Array.from({length: totalStops}, (_, i) => i)
                            .find(i => !existingPods.find((p: any) => p.stopIndex === i));
                          setPodStopIndex(nextUnsubmitted !== undefined ? nextUnsubmitted : 0);
                          setPodImage(null);
                          setShowPodModal(true);
                        }} 
                        className="w-full bg-green-600 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
                      >
                        📸 {activeJob.pod_images?.length > 0 ? `POD (${activeJob.pod_images.length}/${activeJob.stops?.length || 1})` : 'Complete'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* POD (Proof of Delivery) Modal - Feature 2 */}
            {showPodModal && activeJob && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">📸 Proof of Delivery</h3>
                    <button onClick={() => { setShowPodModal(false); setPodImage(null); setPodStopIndex(0); }} className="p-2 hover:bg-gray-100 rounded-full">
                      <X size={24} />
                    </button>
                  </div>
                  
                  {/* Stop progress for multi-stop jobs */}
                  {(activeJob.stops?.length || 1) > 1 && (() => {
                    const totalStops = activeJob.stops?.length || 1;
                    const submittedPods = activeJob.pod_images || stopPods || [];
                    return (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-800">
                          📍 Drop-off {podStopIndex + 1} of {totalStops}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {activeJob.stops?.[podStopIndex]?.address || `Stop ${podStopIndex + 1}`}
                        </p>
                        <div className="flex gap-1 mt-2">
                          {(activeJob.stops || []).map((_: any, idx: number) => {
                            const isSubmitted = submittedPods.find((p: any) => p.stopIndex === idx);
                            return (
                              <div key={idx} className={`h-2 flex-1 rounded ${
                                isSubmitted ? 'bg-green-500' : 
                                idx === podStopIndex ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                              }`} />
                            );
                          })}
                        </div>
                        <p className="text-xs text-blue-700 mt-1">{submittedPods.length}/{totalStops} photos submitted</p>
                      </div>
                    );
                  })()}

                  {/* Already submitted stop photos */}
                  {(() => {
                    const submittedPods = activeJob.pod_images || stopPods || [];
                    return submittedPods.length > 0 ? (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">✅ Submitted Photos:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {submittedPods.map((pod: any, idx: number) => (
                            <div key={idx} className="relative">
                              <img src={pod.image} alt={`Stop ${pod.stopIndex + 1}`} className="w-full h-16 object-cover rounded-lg border-2 border-green-500" />
                              <span className="absolute top-0 left-0 bg-green-600 text-white text-xs px-1 rounded-br">#{pod.stopIndex + 1}</span>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{formatSGTTime(pod.timestamp)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                  
                  {/* Check if current stop already has a submitted photo */}
                  {(() => {
                    const submittedPods = activeJob.pod_images || stopPods || [];
                    const currentStopSubmitted = submittedPods.find((p: any) => p.stopIndex === podStopIndex);
                    const totalStops = activeJob.stops?.length || 1;
                    const allStopsSubmitted = submittedPods.length >= totalStops;
                    
                    if (currentStopSubmitted && !allStopsSubmitted) {
                      return (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg text-center">
                          <p className="text-sm text-green-700">✅ Drop-off {podStopIndex + 1} photo already submitted.</p>
                          <button
                            onClick={() => setPodStopIndex(submittedPods.length)}
                            className="mt-2 text-sm text-blue-600 hover:underline"
                          >
                            Go to next unsubmitted drop-off →
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <p className="text-gray-600 mb-4">
                    {(activeJob.stops?.length || 1) > 1 
                      ? `Take a photo for Drop-off ${podStopIndex + 1}: ${activeJob.stops?.[podStopIndex]?.address || ''}`
                      : 'Please take a photo of the delivered package as proof of delivery.'}
                  </p>
                  
                  <div className="space-y-4">
                    {/* Camera & Gallery Inputs */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {podImage ? (
                        <div className="space-y-3">
                          <img src={podImage} alt="POD" className="max-h-48 mx-auto rounded-lg" />
                          <div className="flex gap-2 justify-center">
                            <button 
                              onClick={() => setPodImage(null)}
                              className="text-red-600 text-sm hover:underline"
                            >
                              Retake
                            </button>
                            {(activeJob.stops?.length || 1) > 1 && (
                              <button 
                                onClick={submitStopPod}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                              >
                                ✓ Submit Drop-off {podStopIndex + 1} Photo
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          {/* Camera input */}
                          <input
                            ref={podInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePodCapture}
                            className="hidden"
                          />
                          {/* Gallery input (separate, no capture attribute) */}
                          <input
                            ref={podGalleryRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePodCapture}
                            className="hidden"
                          />
                          <div className="flex flex-col gap-3 items-center">
                            <button
                              onClick={() => podInputRef.current?.click()}
                              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 w-full"
                            >
                              📷 Take Photo
                            </button>
                            <button
                              onClick={() => podGalleryRef.current?.click()}
                              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 w-full"
                            >
                              🖼️ Select from Gallery
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Stop navigation for multi-stop */}
                    {(activeJob.stops?.length || 1) > 1 && (
                      <div className="flex gap-2">
                        {(activeJob.stops || []).map((_: any, idx: number) => {
                          const submittedPods = activeJob.pod_images || stopPods || [];
                          const isSubmitted = submittedPods.find((p: any) => p.stopIndex === idx);
                          return (
                            <button
                              key={idx}
                              onClick={() => { setPodStopIndex(idx); setPodImage(null); }}
                              className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                                isSubmitted 
                                  ? 'bg-green-100 text-green-700 border-2 border-green-500' 
                                  : idx === podStopIndex 
                                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' 
                                    : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {isSubmitted ? '✓' : ''} #{idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Submit & Complete Button — only enabled when ALL stops have photos */}
                    {(() => {
                      const totalStops = activeJob.stops?.length || 1;
                      const submittedPods = activeJob.pod_images || stopPods || [];
                      const allSubmitted = totalStops > 1 ? submittedPods.length >= totalStops : !!podImage;
                      
                      return (
                        <button
                          onClick={() => submitPodAndComplete(activeJob.id)}
                          disabled={!allSubmitted}
                          className={`w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 ${
                            allSubmitted
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          ✓ Submit & Complete Delivery
                          {totalStops > 1 && ` (${submittedPods.length}/${totalStops})`}
                        </button>
                      );
                    })()}
                    
                    <p className="text-xs text-gray-400 text-center">
                      Photos are compressed and timestamped: {formatSGT(new Date())}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Available Jobs - Only show when rider is online */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-2xl font-bold mb-4">Available Jobs</h3>
              
              {!riderIsOnline ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔴</div>
                  <p className="text-xl font-semibold text-gray-700 mb-2">You are currently offline</p>
                  <p className="text-gray-500 mb-4">Go online to see available jobs and receive notifications</p>
                  <button
                    onClick={riderGoOnline}
                    className="bg-green-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-600"
                  >
                    🟢 Go Online Now
                  </button>
                </div>
              ) : (
                <>
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
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">{filteredAvailableJobs.length} job(s) available</p>
                      {selectedJobsForAccept.length > 0 && (
                        <span className="text-sm font-medium text-green-600">
                          {selectedJobsForAccept.length} selected
                        </span>
                      )}
                    </div>
                    
                    {/* Select All / Clear All */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedJobsForAccept(filteredAvailableJobs.map((j: any) => j.id))}
                        className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedJobsForAccept([])}
                        className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Clear All
                      </button>
                    </div>
                    
                    {filteredAvailableJobs.map((job: any) => {
                      const comm = calculateCommissions(job.price, curr.tier, curr.upline_chain || [], job.total_stops || 1);
                      const isSelected = selectedJobsForAccept.includes(job.id);
                      return (
                        <div 
                          key={job.id} 
                          onClick={() => {
                            if (isSelected) {
                              setSelectedJobsForAccept(selectedJobsForAccept.filter(id => id !== job.id));
                            } else {
                              setSelectedJobsForAccept([...selectedJobsForAccept, job.id]);
                            }
                          }}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-green-500 bg-green-50 shadow-md' 
                              : 'border-gray-200 hover:border-green-400 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <div className="pt-1">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected 
                                  ? 'bg-green-500 border-green-500' 
                                  : 'border-gray-300 bg-white'
                              }`}>
                                {isSelected && <Check size={14} className="text-white" />}
                              </div>
                            </div>
                            
                            {/* Job Details - Improved */}
                            <div className="flex-1">
                              {renderJobDetailCard(job, false)}
                            </div>
                            
                            {/* Earnings */}
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Earn:</p>
                              <p className="text-lg font-bold text-green-600">${comm.activeRider.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Accept Selected Jobs Button */}
                    {selectedJobsForAccept.length > 0 && (
                      <div className="sticky bottom-0 bg-white pt-3 pb-2 border-t">
                        <button 
                          onClick={async () => {
                            // Accept all selected jobs - GPS check happens inside acceptJob
                            for (const jobId of selectedJobsForAccept) {
                              await acceptJob(jobId);
                            }
                            setSelectedJobsForAccept([]);
                          }} 
                          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors"
                        >
                          {`Accept ${selectedJobsForAccept.length} Job${selectedJobsForAccept.length > 1 ? 's' : ''}`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                </>
              )}
            </div>
          </div>
        )}

        {auth.type === 'admin' && (
          <div className="space-y-6">
            {/* Admin Notifications Alert */}
            {(() => {
              // Only count withdrawals that are truly pending (not rejected, approved, or completed)
              const pendingWithdrawals = withdrawalRequests.filter((r: any) => {
                const status = r.details?.status;
                return status === 'pending';
              }).length;
              const pendingJobs = jobs.filter((j: any) => j.status === 'posted').length;
              
              if (pendingWithdrawals > 0 || pendingJobs > 0) {
                return (
                  <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4">
                    <h3 className="font-bold text-orange-800 mb-2">🔔 Pending Actions</h3>
                    <div className="flex flex-wrap gap-3">
                      {pendingWithdrawals > 0 && (
                        <button 
                          onClick={() => { setAdminView('withdrawals'); loadWithdrawalRequests(); }}
                          className="bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                        >
                          💰 <strong>{pendingWithdrawals}</strong> pending withdrawal{pendingWithdrawals > 1 ? 's' : ''}
                        </button>
                      )}
                      {pendingJobs > 0 && (
                        <button 
                          onClick={() => setAdminView('jobs')}
                          className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                        >
                          📦 <strong>{pendingJobs}</strong> unassigned job{pendingJobs > 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
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
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <p className="text-purple-100 text-sm">Total Stripe Received</p>
                  <p className="text-2xl font-bold">💳 ${calculateDashboardStats.totalStripeReceived.toFixed(2)}</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <p className="text-purple-100 text-sm">Customer Wallet Balance</p>
                  <p className="text-2xl font-bold">👛 ${calculateDashboardStats.totalCustomerWallets.toFixed(2)}</p>
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
                            <p className="text-sm font-bold text-green-600 mt-1 cursor-pointer hover:underline" onClick={() => setShowCustomerWallet(c)}>
                              Credits: ${(c.credits || 0).toFixed(2)} 👁️
                            </p>
                            <p className="text-xs text-gray-400 mt-1">📅 Registered: {c.created_at ? formatSGT(c.created_at) : 'N/A'}</p>
                            <p className="text-xs text-gray-400">🕐 Last Login: {c.last_login ? formatSGT(c.last_login) : 'Never'}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setShowCustomerWallet(c)} className="p-2 bg-green-100 rounded hover:bg-green-200" title="View Wallet"><CreditCard size={18} /></button>
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
                    <button 
                      onClick={() => setShowCreateRider(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                    >
                      <UserPlus size={16} /> Create a New Rider
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
                            <p className="text-xs text-gray-400 mt-1">📅 Registered: {r.created_at ? formatSGT(r.created_at) : 'N/A'}</p>
                            <p className="text-xs text-gray-400">🕐 Last Login: {r.last_login ? formatSGT(r.last_login) : 'Never'}</p>
                            <p className="text-xs mt-1">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${r.employment_type === 'full-time' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                {r.employment_type === 'full-time' ? 'Full-Time' : 'Part-Time'}
                              </span>
                              {' '}
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                r.vehicle_type === 'car' ? 'bg-purple-100 text-purple-700' :
                                r.vehicle_type === 'van' ? 'bg-teal-100 text-teal-700' :
                                r.vehicle_type === 'lorry' ? 'bg-gray-200 text-gray-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {r.vehicle_type === 'car' ? '🚗 Car' : r.vehicle_type === 'van' ? '🚐 Van' : r.vehicle_type === 'lorry' ? '🚛 Lorry' : '🏍️ Bike'}
                              </span>
                            </p>
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
                      onClick={() => setShowManualJobForm(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      <UserPlus size={16} /> Manual Key In Job
                    </button>
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
                            {renderJobDetailCard(j)}
                            <p className="text-sm text-gray-600 mt-2">
                              👤 Customer: {j.customer_name} {j.customer_phone && `(${j.customer_phone})`}
                            </p>
                            <p className="text-sm text-gray-600">
                              🏍️ Rider: {j.rider_name ? (
                                <span className="text-green-600 font-medium">{j.rider_name}</span>
                              ) : (
                                <span className="text-orange-500">Unassigned</span>
                              )}
                              {j.rider_vehicle_type && (
                                <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                  j.rider_vehicle_type === 'car' ? 'bg-purple-100 text-purple-700' :
                                  j.rider_vehicle_type === 'van' ? 'bg-teal-100 text-teal-700' :
                                  j.rider_vehicle_type === 'lorry' ? 'bg-gray-200 text-gray-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {j.rider_vehicle_type === 'car' ? '🚗 Car' : j.rider_vehicle_type === 'van' ? '🚐 Van' : j.rider_vehicle_type === 'lorry' ? '🚛 Lorry' : '🏍️ Bike'}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Created: {formatSGT(j.created_at)}</p>
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
                            {/* Reassign Rider Button - Shows when rider already assigned and job not completed/cancelled */}
                            {j.rider_id && j.status !== 'completed' && j.status !== 'cancelled' && (
                              <button 
                                onClick={() => {
                                  if (window.confirm(`Reassign this job from ${j.rider_name || 'current rider'}?\n\nThe current rider will be removed and you can select a new rider.`)) {
                                    setShowAssignRider(j);
                                  }
                                }}
                                className="p-2 bg-purple-100 rounded hover:bg-purple-200 flex items-center gap-1 text-xs text-purple-700" 
                                title="Reassign to another rider"
                              >
                                <RefreshCw size={16} /> Reassign
                              </button>
                            )}
                            {/* Edit Order Button */}
                            {j.status !== 'completed' && j.status !== 'cancelled' && (
                              <button 
                                onClick={() => setEditJob({...j})}
                                className="p-2 bg-yellow-100 rounded hover:bg-yellow-200 flex items-center gap-1 text-xs text-yellow-700" 
                                title="Edit Order"
                              >
                                <Edit2 size={16} /> Edit
                              </button>
                            )}
                            {/* Cancel Job Button - Refunds customer credits */}
                            {j.status !== 'completed' && j.status !== 'cancelled' && (
                              <button 
                                onClick={async () => { 
                                  if (window.confirm(`Cancel this job and refund $${j.price} to ${j.customer_name || 'customer'}?`)) { 
                                    try {
                                      // Update job status to cancelled
                                      await api(`jobs?id=eq.${j.id}`, 'PATCH', { status: 'cancelled', cancelled_at: new Date().toISOString() });
                                      
                                      // Refund credits to customer if customer_id exists
                                      if (j.customer_id) {
                                        // Fetch fresh customer data from database to avoid stale credits
                                        const freshCustomer = await api(`customers?id=eq.${j.customer_id}`);
                                        if (freshCustomer && freshCustomer.length > 0) {
                                          const newCredits = (freshCustomer[0].credits || 0) + parseFloat(j.price);
                                          await api(`customers?id=eq.${j.customer_id}`, 'PATCH', { credits: newCredits });
                                          
                                          // Log the refund
                                          await logAuditAction('admin_job_cancel_refund', {
                                            jobId: j.id,
                                            orderId: j.order_id,
                                            customerId: j.customer_id,
                                            customerName: j.customer_name,
                                            refundAmount: j.price,
                                            newBalance: newCredits
                                          });
                                          
                                          alert(`Job cancelled. $${j.price} refunded to ${j.customer_name}'s account.\nNew balance: $${newCredits.toFixed(2)}`);
                                        }
                                      } else {
                                        alert('Job cancelled. (No customer account to refund)');
                                      }
                                      loadData();
                                    } catch (e: any) {
                                      alert('Error cancelling job: ' + e.message);
                                    }
                                  }
                                }} 
                                className="p-2 bg-orange-100 rounded hover:bg-orange-200 flex items-center gap-1 text-xs text-orange-700" 
                                title="Cancel & Refund"
                              >
                                <X size={16} /> Cancel
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
                                📅 POD taken: {formatSGT(job.pod_timestamp)}
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

            {/* Admin Withdrawal Management */}
            {adminView === 'withdrawals' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-2xl font-bold mb-6">💰 Withdrawal Management</h3>
                
                {/* Summary Stats */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-yellow-600">
                      {withdrawalRequests.filter((r: any) => r.details?.status === 'pending' || !r.details?.status).length}
                    </p>
                    <p className="text-sm text-gray-600">Pending</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {withdrawalRequests.filter((r: any) => r.details?.status === 'approved').length}
                    </p>
                    <p className="text-sm text-gray-600">Approved</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-600">
                      {withdrawalRequests.filter((r: any) => r.details?.status === 'completed').length}
                    </p>
                    <p className="text-sm text-gray-600">Completed</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-red-600">
                      {withdrawalRequests.filter((r: any) => r.details?.status === 'rejected').length}
                    </p>
                    <p className="text-sm text-gray-600">Rejected</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-purple-600">
                      ${withdrawalRequests.filter((r: any) => r.details?.status === 'completed')
                        .reduce((sum: number, r: any) => sum + (r.details?.amount || 0), 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Total Paid</p>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={withdrawalFilter.status}
                      onChange={(e) => setWithdrawalFilter({...withdrawalFilter, status: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Rider</label>
                    <input
                      type="text"
                      value={withdrawalFilter.search}
                      onChange={(e) => setWithdrawalFilter({...withdrawalFilter, search: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Rider name..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={withdrawalFilter.dateFrom}
                      onChange={(e) => setWithdrawalFilter({...withdrawalFilter, dateFrom: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={withdrawalFilter.dateTo}
                      onChange={(e) => setWithdrawalFilter({...withdrawalFilter, dateTo: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => exportWithdrawalReport('csv')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Download size={16} /> Export CSV
                  </button>
                  <button
                    onClick={() => exportWithdrawalReport('pdf')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <FileText size={16} /> Export PDF
                  </button>
                  <button
                    onClick={() => loadWithdrawalRequests()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    🔄 Refresh
                  </button>
                </div>

                {/* Withdrawal Requests Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-left p-2 font-medium">Full Name</th>
                        <th className="text-left p-2 font-medium">Mobile</th>
                        <th className="text-right p-2 font-medium">Amount</th>
                        <th className="text-left p-2 font-medium">Method</th>
                        <th className="text-left p-2 font-medium">Bank</th>
                        <th className="text-left p-2 font-medium">PayNow/Account No</th>
                        <th className="text-center p-2 font-medium">Status</th>
                        <th className="text-center p-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalRequests
                        .filter((req: any) => {
                          if (withdrawalFilter.status !== 'all') {
                            const status = req.details?.status || 'pending';
                            if (status !== withdrawalFilter.status) return false;
                          }
                          if (withdrawalFilter.search && !req.details?.riderName?.toLowerCase().includes(withdrawalFilter.search.toLowerCase())) return false;
                          if (withdrawalFilter.dateFrom && new Date(req.timestamp) < new Date(withdrawalFilter.dateFrom)) return false;
                          if (withdrawalFilter.dateTo && new Date(req.timestamp) > new Date(withdrawalFilter.dateTo + 'T23:59:59')) return false;
                          return true;
                        })
                        .map((req: any) => (
                          <tr key={req.id} className="border-t hover:bg-gray-50">
                            <td className="p-2 text-xs">
                              {formatSGTDate(req.timestamp)}<br/>
                              <span className="text-gray-400">{formatSGTTime(req.timestamp)}</span>
                            </td>
                            <td className="p-2 font-medium">{req.details?.fullName || req.details?.riderName || 'N/A'}</td>
                            <td className="p-2">{req.details?.mobileNumber || req.details?.riderPhone || 'N/A'}</td>
                            <td className="p-2 text-right font-bold text-green-600">${req.details?.amount?.toFixed(2) || '0.00'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                req.details?.withdrawMethod === 'paynow' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {req.details?.withdrawMethod === 'paynow' ? '📱 PayNow' : '🏦 Bank'}
                              </span>
                            </td>
                            <td className="p-2">{req.details?.bankName || 'N/A'}</td>
                            <td className="p-2 font-mono text-xs">
                              {req.details?.withdrawMethod === 'paynow' 
                                ? req.details?.paynowNo || 'N/A'
                                : req.details?.bankAccountNo || 'N/A'}
                            </td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                req.details?.status === 'approved' ? 'bg-green-100 text-green-700' :
                                req.details?.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                req.details?.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {(req.details?.status || 'pending').toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              {(!req.details?.status || req.details?.status === 'pending') && (
                                <div className="flex justify-center gap-1">
                                  <button
                                    onClick={() => processWithdrawalRequest(req.id, 'approved', req)}
                                    className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    onClick={() => processWithdrawalRequest(req.id, 'rejected', req)}
                                    className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                  >
                                    ✕ Reject
                                  </button>
                                </div>
                              )}
                              {req.details?.status === 'approved' && (
                                <div className="flex flex-col items-center gap-1">
                                  <button
                                    onClick={() => processWithdrawalRequest(req.id, 'completed', req)}
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                  >
                                    💰 Mark Completed
                                  </button>
                                  <span className="text-xs text-gray-500">
                                    Approved {req.details?.processedAt ? formatSGTDate(req.details.processedAt) : ''}
                                  </span>
                                </div>
                              )}
                              {req.details?.status === 'completed' && (
                                <div className="text-center">
                                  <span className="text-xs text-green-600 font-medium">✓ Payment Sent</span>
                                  <br/>
                                  <span className="text-xs text-gray-500">
                                    {req.details?.completedAt ? formatSGTDate(req.details.completedAt) : ''}
                                  </span>
                                </div>
                              )}
                              {req.details?.status === 'rejected' && (
                                <span className="text-xs text-red-500">Rejected</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      {withdrawalRequests.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-500">
                            No withdrawal requests yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
                                {formatSGT(log.timestamp)}
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
                                {typeof log.details === 'string' 
                                  ? (log.details?.substring(0, 80) || 'N/A')
                                  : (JSON.stringify(log.details)?.substring(0, 80) || 'N/A')}
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
                    Swapping Upline
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left p-3">Rider</th>
                          <th className="text-center p-3">Tier</th>
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
                              <td className="p-3 text-center">
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                  Tier {rider.tier || 1}
                                </span>
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
                                    if (e.target.value === 'none') {
                                      if (confirm(`Remove upline for ${rider.name}? They will become Top Level (Tier 1).`)) {
                                        assignUpline(rider.id, null);
                                      }
                                      e.target.value = '';
                                    } else if (e.target.value) {
                                      const selectedRider = riders.find((r: any) => r.id === e.target.value);
                                      if (confirm(`Place ${rider.name} under ${selectedRider?.name}?\n\n${rider.name} will become Tier ${(selectedRider?.tier || 1) + 1} under ${selectedRider?.name} (Tier ${selectedRider?.tier || 1}).\n\nThis will only affect future payouts.`)) {
                                        assignUpline(rider.id, e.target.value);
                                      }
                                      e.target.value = '';
                                    }
                                  }}
                                  className="px-2 py-1 border rounded text-xs"
                                >
                                  <option value="">Set upline...</option>
                                  <option value="none">❌ No Upline (Top Level)</option>
                                  {riders.filter((r: any) => r.id !== rider.id).map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.name} (Tier {r.tier || 1})</option>
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
                      <strong>⚠️ Note:</strong> Changing upline only affects <strong>future payouts</strong>. 
                      Past earnings remain unchanged. Tier is automatically calculated based on the upline chain.
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
                        <p className="text-xs text-gray-500">Last update: {formatSGTTime(loc.updated_at)}</p>
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
                <h3 className="text-2xl font-bold">🎟️ Promo Codes</h3>
                <button onClick={() => { setShowPromotions(false); setEditingPromo(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              {/* Create / Edit Promotion Form */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-3">
                  {editingPromo ? '✏️ Edit Promotion' : '➕ Create New Promotion'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
                    <input
                      type="text"
                      value={editingPromo ? editingPromo.code : newPromotion.code}
                      onChange={(e) => editingPromo 
                        ? setEditingPromo({...editingPromo, code: e.target.value.toUpperCase()})
                        : setNewPromotion({...newPromotion, code: e.target.value.toUpperCase()})
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., SAVE10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                    <select
                      value={editingPromo ? editingPromo.discount_type : newPromotion.discountType}
                      onChange={(e) => editingPromo
                        ? setEditingPromo({...editingPromo, discount_type: e.target.value})
                        : setNewPromotion({...newPromotion, discountType: e.target.value})
                      }
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
                      value={editingPromo ? editingPromo.discount_value : newPromotion.discountValue}
                      onChange={(e) => editingPromo
                        ? setEditingPromo({...editingPromo, discount_value: parseFloat(e.target.value)})
                        : setNewPromotion({...newPromotion, discountValue: parseFloat(e.target.value)})
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                    <input
                      type="number"
                      value={editingPromo ? editingPromo.max_uses : newPromotion.maxUses}
                      onChange={(e) => editingPromo
                        ? setEditingPromo({...editingPromo, max_uses: parseInt(e.target.value)})
                        : setNewPromotion({...newPromotion, maxUses: parseInt(e.target.value)})
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Order ($)</label>
                    <input
                      type="number"
                      value={editingPromo ? editingPromo.min_order : newPromotion.minOrder}
                      onChange={(e) => editingPromo
                        ? setEditingPromo({...editingPromo, min_order: parseFloat(e.target.value)})
                        : setNewPromotion({...newPromotion, minOrder: parseFloat(e.target.value)})
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={editingPromo ? (editingPromo.expiry_date || '') : newPromotion.expiryDate}
                      onChange={(e) => editingPromo
                        ? setEditingPromo({...editingPromo, expiry_date: e.target.value})
                        : setNewPromotion({...newPromotion, expiryDate: e.target.value})
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  {editingPromo && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={editingPromo.active ? 'true' : 'false'}
                        onChange={(e) => setEditingPromo({...editingPromo, active: e.target.value === 'true'})}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  {editingPromo ? (
                    <>
                      <button
                        onClick={updatePromotion}
                        className="flex-1 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingPromo(null)}
                        className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={createPromotion}
                      className="w-full py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                    >
                      Create Promotion
                    </button>
                  )}
                </div>
              </div>

              {/* Existing Promotions */}
              <h4 className="font-semibold text-gray-800 mb-3">All Promotions ({promotions.length})</h4>
              {promotions.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No promotions created yet</p>
              ) : (
                <div className="space-y-2">
                  {promotions.map((promo: any) => (
                    <div key={promo.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                      <div className="flex-1">
                        <p className="font-bold text-purple-600">{promo.code}</p>
                        <p className="text-sm text-gray-600">
                          {promo.discount_type === 'fixed' ? `$${promo.discount_value} off` : `${promo.discount_value}% off`}
                          {promo.min_order > 0 && ` (min order $${promo.min_order})`}
                        </p>
                        <p className="text-xs text-gray-400">
                          Used: {promo.uses_count || 0}/{promo.max_uses}
                          {promo.expiry_date && ` | Expires: ${formatSGTDate(promo.expiry_date)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${promo.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {promo.active !== false ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => setEditingPromo({...promo})}
                          className="p-1 bg-blue-100 rounded hover:bg-blue-200"
                          title="Edit"
                        >
                          <Edit2 size={14} className="text-blue-700" />
                        </button>
                        <button
                          onClick={() => deletePromotion(promo.id)}
                          className="p-1 bg-red-100 rounded hover:bg-red-200"
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-red-700" />
                        </button>
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
        {/* Manual Key In Job Modal */}
        {showManualJobForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Manual Key In Job</h3>
                <button onClick={() => setShowManualJobForm(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Customer Information */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">👤 Customer Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={adminJobForm.customerName}
                        onChange={(e) => setAdminJobForm({...adminJobForm, customerName: e.target.value})}
                        placeholder="Enter customer name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={adminJobForm.customerPhone}
                        onChange={(e) => setAdminJobForm({...adminJobForm, customerPhone: e.target.value})}
                        placeholder="Enter customer phone"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Pickup Information */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-3">📍 Pickup Location</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={adminJobForm.pickup}
                          onChange={(e) => setAdminJobForm({...adminJobForm, pickup: e.target.value})}
                          placeholder="Enter pickup address"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit No <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={adminJobForm.pickupUnitNo}
                          onChange={(e) => setAdminJobForm({...adminJobForm, pickupUnitNo: e.target.value})}
                          placeholder="e.g. #01-23 or N/A"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Contact Name</label>
                        <input
                          type="text"
                          value={adminJobForm.pickupContact}
                          onChange={(e) => setAdminJobForm({...adminJobForm, pickupContact: e.target.value})}
                          placeholder="Contact person at pickup"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Contact Phone</label>
                        <input
                          type="text"
                          value={adminJobForm.pickupPhone}
                          onChange={(e) => setAdminJobForm({...adminJobForm, pickupPhone: e.target.value})}
                          placeholder="Contact phone at pickup"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drop-off Locations (Multi-stop) */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-orange-900">🏠 Drop-off Location(s)</h4>
                    {adminJobForm.stops.length < 5 && (
                      <button
                        onClick={() => setAdminJobForm({
                          ...adminJobForm,
                          stops: [...adminJobForm.stops, { address: '', unitNo: '', recipientName: '', recipientPhone: '' }]
                        })}
                        className="text-sm px-3 py-1 bg-orange-200 text-orange-800 rounded-lg hover:bg-orange-300"
                      >
                        + Add Stop
                      </button>
                    )}
                  </div>
                  
                  {adminJobForm.stops.map((stop, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg mb-3 border border-orange-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-orange-800">Stop {idx + 1}</span>
                        {adminJobForm.stops.length > 1 && (
                          <button
                            onClick={() => {
                              const newStops = adminJobForm.stops.filter((_, i) => i !== idx);
                              setAdminJobForm({...adminJobForm, stops: newStops});
                            }}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            value={stop.address}
                            onChange={(e) => {
                              const newStops = [...adminJobForm.stops];
                              newStops[idx].address = e.target.value;
                              setAdminJobForm({...adminJobForm, stops: newStops});
                            }}
                            placeholder="Drop-off address"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={stop.unitNo}
                            onChange={(e) => {
                              const newStops = [...adminJobForm.stops];
                              newStops[idx].unitNo = e.target.value;
                              setAdminJobForm({...adminJobForm, stops: newStops});
                            }}
                            placeholder="Unit No"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={stop.recipientName}
                          onChange={(e) => {
                            const newStops = [...adminJobForm.stops];
                            newStops[idx].recipientName = e.target.value;
                            setAdminJobForm({...adminJobForm, stops: newStops});
                          }}
                          placeholder="Recipient name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          value={stop.recipientPhone}
                          onChange={(e) => {
                            const newStops = [...adminJobForm.stops];
                            newStops[idx].recipientPhone = e.target.value;
                            setAdminJobForm({...adminJobForm, stops: newStops});
                          }}
                          placeholder="Recipient phone"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Job Details */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-3">📦 Job Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={adminJobForm.deliveryDate || ''}
                        onChange={(e) => setAdminJobForm({...adminJobForm, deliveryDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        min={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time Slot <span className="text-red-500">*</span></label>
                      <select
                        value={adminJobForm.timeframe}
                        onChange={(e) => setAdminJobForm({...adminJobForm, timeframe: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select delivery slot</option>
                        {DELIVERY_SLOTS.map((slot) => (
                          <option key={slot.value} value={slot.value}>{slot.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parcel Size <span className="text-red-500">*</span></label>
                      <select
                        value={adminJobForm.parcelSize}
                        onChange={(e) => setAdminJobForm({...adminJobForm, parcelSize: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="small">Small (Documents/Small items)</option>
                        <option value="medium">Medium (Shoebox size)</option>
                        <option value="large">Large (Large box)</option>
                        <option value="extra-large">Extra Large (Furniture/Bulky)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        value={adminJobForm.price}
                        onChange={(e) => setAdminJobForm({...adminJobForm, price: e.target.value})}
                        placeholder="Enter price"
                        min="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Min: ${3 + (adminJobForm.stops.length - 1) * 2} for {adminJobForm.stops.length} stop(s)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                      <input
                        type="text"
                        value={adminJobForm.remarks}
                        onChange={(e) => setAdminJobForm({...adminJobForm, remarks: e.target.value})}
                        placeholder="Special instructions"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={async () => {
                    // Validation
                    if (!adminJobForm.customerName) return alert('Please enter customer name');
                    if (!adminJobForm.customerPhone) return alert('Please enter customer phone');
                    if (!adminJobForm.pickup) return alert('Please enter pickup address');
                    if (!adminJobForm.pickupUnitNo) return alert('Please enter pickup Unit No (enter "N/A" if not applicable)');
                    if (!adminJobForm.stops[0]?.address) return alert('Please enter at least one drop-off address');
                    
                    const emptyStops = adminJobForm.stops.filter(s => !s.address);
                    if (emptyStops.length > 0) return alert('Please fill in all drop-off addresses or remove empty stops');
                    
                    const missingUnitNo = adminJobForm.stops.filter(s => !s.unitNo);
                    if (missingUnitNo.length > 0) return alert('Please fill in Unit No for all drop-off locations (enter "N/A" if not applicable)');
                    
                    if (!adminJobForm.timeframe) return alert('Please select a delivery time slot');
                    
                    const price = parseFloat(adminJobForm.price);
                    const minPrice = 3 + (adminJobForm.stops.length - 1) * 2;
                    if (!price || price < minPrice) return alert(`Minimum price is $${minPrice} for ${adminJobForm.stops.length} stop(s)`);

                    // Generate Order ID
                    const orderId = generateOrderId();

                    try {
                      const deliveryAddresses = adminJobForm.stops.map(s => `${s.address} ${s.unitNo}`).join(' → ');
                      
                      await api('jobs', 'POST', {
                        order_id: orderId,
                        customer_id: null, // Manual job - no customer account
                        customer_name: adminJobForm.customerName,
                        customer_phone: adminJobForm.customerPhone,
                        pickup: `${adminJobForm.pickup} ${adminJobForm.pickupUnitNo}`,
                        pickup_contact: adminJobForm.pickupContact || null,
                        pickup_phone: adminJobForm.pickupPhone || null,
                        delivery: deliveryAddresses,
                        stops: adminJobForm.stops,
                        total_stops: adminJobForm.stops.length,
                        timeframe: adminJobForm.timeframe,
                        delivery_slot: adminJobForm.timeframe,
                        delivery_date: adminJobForm.deliveryDate || null,
                        price,
                        status: 'posted',
                        recipient_name: adminJobForm.stops[0]?.recipientName || null,
                        recipient_phone: adminJobForm.stops[0]?.recipientPhone || null,
                        parcel_size: adminJobForm.parcelSize,
                        remarks: adminJobForm.remarks || null
                      });

                      alert(`Job created successfully!\nOrder ID: ${orderId}`);
                      
                      // Reset form
                      setAdminJobForm({
                        customerName: '',
                        customerPhone: '',
                        pickup: '',
                        pickupUnitNo: '',
                        pickupContact: '',
                        pickupPhone: '',
                        stops: [{ address: '', unitNo: '', recipientName: '', recipientPhone: '' }],
                        timeframe: '',
                        deliveryDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }),
                        price: '10',
                        parcelSize: 'small',
                        remarks: ''
                      });
                      setShowManualJobForm(false);
                      loadData();
                    } catch (e: any) {
                      alert('Error creating job: ' + e.message);
                    }
                  }}
                  className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-lg"
                >
                  ✅ Create Job
                </button>
              </div>
            </div>
          </div>
        )}

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
                        <th className="p-2 text-left font-semibold text-blue-800">pickup_unit_no</th>
                        <th className="p-2 text-left font-semibold text-blue-800">delivery</th>
                        <th className="p-2 text-left font-semibold text-blue-800">delivery_unit_no</th>
                        <th className="p-2 text-left font-semibold text-blue-800">recipient_name</th>
                        <th className="p-2 text-left font-semibold text-blue-800">recipient_phone</th>
                        <th className="p-2 text-left font-semibold text-blue-800">delivery_slot</th>
                        <th className="p-2 text-left font-semibold text-blue-800">delivery_date</th>
                        <th className="p-2 text-left font-semibold text-blue-800">parcel_size</th>
                        <th className="p-2 text-left font-semibold text-blue-800">price</th>
                        <th className="p-2 text-left font-semibold text-blue-800">notes</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-t">
                        <td className="p-2">John Doe</td>
                        <td className="p-2">91234567</td>
                        <td className="p-2">123 Orchard Rd</td>
                        <td className="p-2">#01-01</td>
                        <td className="p-2">456 Marina Bay</td>
                        <td className="p-2">#05-10</td>
                        <td className="p-2">Alice Tan</td>
                        <td className="p-2">81234567</td>
                        <td className="p-2">6am-11am</td>
                        <td className="p-2">2026-03-16</td>
                        <td className="p-2">small</td>
                        <td className="p-2">15</td>
                        <td className="p-2">Handle with care</td>
                      </tr>
                      <tr className="border-t bg-gray-50">
                        <td className="p-2">Jane Smith</td>
                        <td className="p-2">98765432</td>
                        <td className="p-2">789 Bugis St</td>
                        <td className="p-2">N/A</td>
                        <td className="p-2">321 Tampines Ave</td>
                        <td className="p-2">#02-15</td>
                        <td className="p-2">Bob Lee</td>
                        <td className="p-2">92345678</td>
                        <td className="p-2">12pm-5pm</td>
                        <td className="p-2">2026-03-17</td>
                        <td className="p-2">medium</td>
                        <td className="p-2">12</td>
                        <td className="p-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={downloadJobTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    <Download size={18} /> Download CSV Template
                  </button>
                  <button 
                    onClick={() => {
                      const headers = ['customer_name', 'customer_phone', 'pickup', 'pickup_unit_no', 'delivery', 'delivery_unit_no', 'recipient_name', 'recipient_phone', 'delivery_slot', 'delivery_date', 'parcel_size', 'price', 'notes'];
                      const sampleData = [
                        ['John Doe', '91234567', '123 Orchard Rd', '#01-01', '456 Marina Bay', '#05-10', 'Alice Tan', '81234567', '6am-11am', '2026-03-16', 'small', '15', 'Handle with care'],
                        ['Jane Smith', '98765432', '789 Bugis St', 'N/A', '321 Tampines Ave', '#02-15', 'Bob Lee', '92345678', '12pm-5pm', '2026-03-17', 'medium', '12', '']
                      ];
                      
                      let csvContent = headers.join(',') + '\n';
                      sampleData.forEach(row => {
                        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
                      });
                      
                      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = 'job_import_template.xlsx';
                      link.click();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    <Download size={18} /> Download Excel Template
                  </button>
                </div>
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
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">Optional</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">pickup_unit_no</code>
                      <p className="text-gray-500 text-xs">Pickup unit/floor (e.g., #01-01 or N/A)</p>
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
                      <code className="font-mono bg-gray-200 px-1 rounded">delivery_unit_no</code>
                      <p className="text-gray-500 text-xs">Delivery unit/floor (e.g., #05-10 or N/A)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">Optional</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">recipient_name</code>
                      <p className="text-gray-500 text-xs">Recipient's name at delivery</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">Optional</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">recipient_phone</code>
                      <p className="text-gray-500 text-xs">Recipient's phone number</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">Optional</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">delivery_slot</code>
                      <p className="text-gray-500 text-xs">6am-11am, 12pm-5pm, or 6pm-11pm</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">Optional</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">delivery_date</code>
                      <p className="text-gray-500 text-xs">Date in YYYY-MM-DD format (default: today)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">Optional</span>
                    <div>
                      <code className="font-mono bg-gray-200 px-1 rounded">parcel_size</code>
                      <p className="text-gray-500 text-xs">small, medium, large, or extra-large</p>
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
                <p className="text-sm text-green-700 mb-3">After filling in the template, upload your CSV or Excel file here.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 file:cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">Accepts CSV and Excel (.xlsx) files</p>
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
                <h3 className="text-2xl font-bold">{showAssignRider.rider_id ? 'Reassign Rider' : 'Assign Rider'}</h3>
                <button onClick={() => setShowAssignRider(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-900">{showAssignRider.order_id && <span className="text-purple-600">[{showAssignRider.order_id}]</span>} {showAssignRider.pickup} → {showAssignRider.delivery}</p>
                <p className="text-sm text-blue-700">Customer: {showAssignRider.customer_name}</p>
                <p className="text-sm text-blue-700">Price: ${showAssignRider.price}</p>
              </div>

              {/* Show current rider if reassigning */}
              {showAssignRider.rider_id && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">🔄 Current Rider: <strong>{showAssignRider.rider_name}</strong> ({showAssignRider.rider_phone})</p>
                  <p className="text-xs text-red-600 mt-1">Selecting a new rider below will replace the current rider.</p>
                </div>
              )}

              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">⚠️ Only <strong>online</strong> riders with <strong>GPS enabled</strong> are shown below.</p>
              </div>

              <h4 className="font-semibold text-gray-700 mb-3">Select a Rider:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(() => {
                  // Filter riders: only online and with recent GPS location (within last 30 minutes)
                  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
                  const onlineRidersWithGPS = riders.filter((r: any) => {
                    const riderLoc = allRiderLocations?.find((loc: any) => loc.rider_id === r.id);
                    const isOnline = r.is_online === true;
                    const hasRecentGPS = riderLoc && riderLoc.updated_at > thirtyMinsAgo;
                    // Exclude the currently assigned rider from the list when reassigning
                    const isCurrentRider = showAssignRider.rider_id === r.id;
                    return isOnline && hasRecentGPS && !isCurrentRider;
                  });
                  
                  if (onlineRidersWithGPS.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <p className="text-gray-500 mb-2">No other riders available</p>
                        <p className="text-sm text-gray-400">Riders must be online with GPS enabled to be assigned jobs.</p>
                      </div>
                    );
                  }
                  
                  return onlineRidersWithGPS.map((r: any) => (
                    <button
                      key={r.id}
                      onClick={async () => {
                        try {
                          await assignRiderToJob(showAssignRider.id, r.id, r.name, r.phone);
                          if (showAssignRider.rider_id) {
                            await logAuditAction('admin_reassign_rider', {
                              jobId: showAssignRider.id,
                              orderId: showAssignRider.order_id,
                              previousRider: showAssignRider.rider_name,
                              newRider: r.name
                            });
                          }
                        } catch (e: any) {
                          alert('Error assigning rider: ' + e.message);
                        }
                      }}
                      className="w-full p-3 border rounded-lg hover:border-green-500 hover:bg-green-50 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{r.name}</p>
                          <p className="text-sm text-gray-600">{r.phone} | Tier {r.tier} | {r.completed_jobs || 0} jobs</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Online"></span>
                          <span className="text-green-600 text-xs font-medium">GPS ✓</span>
                        </div>
                      </div>
                    </button>
                  ));
                })()}
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

        {/* Edit Order Modal (Admin) */}
        {editJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">✏️ Edit Order</h3>
                <button onClick={() => setEditJob(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                <p className="font-bold text-purple-600">{editJob.order_id && `#${editJob.order_id}`}</p>
                <p className="text-sm text-gray-600">Status: {editJob.status?.toUpperCase()}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address</label>
                  <input
                    type="text"
                    value={editJob.pickup || ''}
                    onChange={(e) => setEditJob({...editJob, pickup: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                  <input
                    type="text"
                    value={editJob.delivery || ''}
                    onChange={(e) => setEditJob({...editJob, delivery: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Contact</label>
                    <input
                      type="text"
                      value={editJob.pickup_contact || ''}
                      onChange={(e) => setEditJob({...editJob, pickup_contact: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Phone</label>
                    <input
                      type="text"
                      value={editJob.pickup_phone || ''}
                      onChange={(e) => setEditJob({...editJob, pickup_phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                    <input
                      type="text"
                      value={editJob.recipient_name || ''}
                      onChange={(e) => setEditJob({...editJob, recipient_name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Phone</label>
                    <input
                      type="text"
                      value={editJob.recipient_phone || ''}
                      onChange={(e) => setEditJob({...editJob, recipient_phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                    <input
                      type="date"
                      value={editJob.delivery_date || ''}
                      onChange={(e) => setEditJob({...editJob, delivery_date: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Slot</label>
                    <select
                      value={editJob.timeframe || editJob.delivery_slot || ''}
                      onChange={(e) => setEditJob({...editJob, timeframe: e.target.value, delivery_slot: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select slot</option>
                      <option value="6am-11am">6am – 11am</option>
                      <option value="12pm-5pm">12pm – 5pm</option>
                      <option value="6pm-11pm">6pm – 11pm</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                    <input
                      type="number"
                      value={editJob.price || ''}
                      onChange={(e) => setEditJob({...editJob, price: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      step="0.5"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parcel Size</label>
                    <select
                      value={editJob.parcel_size || 'small'}
                      onChange={(e) => setEditJob({...editJob, parcel_size: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="extra-large">Extra Large</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    value={editJob.remarks || ''}
                    onChange={(e) => setEditJob({...editJob, remarks: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setEditJob(null)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await api(`jobs?id=eq.${editJob.id}`, 'PATCH', {
                          pickup: editJob.pickup,
                          delivery: editJob.delivery,
                          pickup_contact: editJob.pickup_contact,
                          pickup_phone: editJob.pickup_phone,
                          recipient_name: editJob.recipient_name,
                          recipient_phone: editJob.recipient_phone,
                          delivery_date: editJob.delivery_date,
                          timeframe: editJob.timeframe,
                          delivery_slot: editJob.delivery_slot,
                          price: parseFloat(editJob.price) || 0,
                          parcel_size: editJob.parcel_size,
                          remarks: editJob.remarks
                        });
                        await logAuditAction('admin_edit_order', {
                          jobId: editJob.id,
                          orderId: editJob.order_id
                        });
                        setEditJob(null);
                        await loadData();
                        alert('Order updated successfully!');
                      } catch (e: any) {
                        alert('Error updating order: ' + e.message);
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
                
                {/* Refund via Stripe Button */}
                {(editCust.credits || 0) > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-yellow-800 mb-2">💳 Refund Credits via Stripe</label>
                    <p className="text-xs text-yellow-700 mb-3">
                      Process a refund of customer credits back to their original payment method via Stripe.
                    </p>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        id="refundAmount"
                        max={editCust.credits || 0}
                        min="0.01"
                        step="0.01"
                        placeholder={`Max: $${(editCust.credits || 0).toFixed(2)}`}
                        className="flex-1 px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500" 
                      />
                      <button 
                        onClick={async () => {
                          const refundInput = document.getElementById('refundAmount') as HTMLInputElement;
                          const refundAmount = parseFloat(refundInput?.value || '0');
                          
                          if (!refundAmount || refundAmount <= 0) {
                            alert('Please enter a valid refund amount');
                            return;
                          }
                          if (refundAmount > (editCust.credits || 0)) {
                            alert(`Refund amount cannot exceed customer's credits ($${(editCust.credits || 0).toFixed(2)})`);
                            return;
                          }
                          
                          if (!window.confirm(`Process refund of $${refundAmount.toFixed(2)} to ${editCust.name}?\n\nThis will:\n1. Deduct $${refundAmount.toFixed(2)} from customer credits\n2. Process refund via Stripe to original payment method`)) {
                            return;
                          }
                          
                          try {
                            // Deduct credits first
                            const newCredits = (editCust.credits || 0) - refundAmount;
                            await api(`customers?id=eq.${editCust.id}`, 'PATCH', { credits: newCredits });
                            
                            // Log the refund
                            await logAuditAction('admin_stripe_refund', {
                              customerId: editCust.id,
                              customerName: editCust.name,
                              customerEmail: editCust.email,
                              refundAmount: refundAmount,
                              previousCredits: editCust.credits,
                              newCredits: newCredits
                            });
                            
                            // Note: Actual Stripe refund would need to be processed via API
                            alert(`Refund of $${refundAmount.toFixed(2)} processed!\n\nCustomer: ${editCust.name}\nNew balance: $${newCredits.toFixed(2)}\n\n⚠️ Note: Please also process the refund in your Stripe dashboard.`);
                            
                            setEditCust({...editCust, credits: newCredits});
                            loadData();
                          } catch (e: any) {
                            alert('Error processing refund: ' + e.message);
                          }
                        }}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600"
                      >
                        Refund
                      </button>
                    </div>
                  </div>
                )}
                
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

        {/* Customer Wallet Detail Modal */}
        {showCustomerWallet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">👛 Customer Wallet</h3>
                <button onClick={() => setShowCustomerWallet(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-lg">{showCustomerWallet.name}</p>
                <p className="text-sm text-gray-600">{showCustomerWallet.email} | {showCustomerWallet.phone}</p>
              </div>
              
              {/* Wallet Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                  <p className="text-sm text-green-600">Current Balance</p>
                  <p className="text-3xl font-bold text-green-700">${(showCustomerWallet.credits || 0).toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                  <p className="text-sm text-blue-600">Amount Used</p>
                  <p className="text-3xl font-bold text-blue-700">
                    ${jobs.filter((j: any) => j.customer_id === showCustomerWallet.id && j.status !== 'cancelled')
                      .reduce((sum: number, j: any) => sum + (parseFloat(j.price) || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Top-up History */}
              <h4 className="font-semibold text-gray-800 mb-3">📜 Transaction History</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {/* Show jobs as deductions and estimate top-ups */}
                {(() => {
                  const customerJobs = jobs
                    .filter((j: any) => j.customer_id === showCustomerWallet.id)
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  
                  // Get top-up audit logs for this customer
                  const topUpLogs = auditLogs
                    .filter((log: any) => 
                      (log.action === 'customer_topup' || log.action === 'admin_job_cancel_refund') &&
                      (typeof log.details === 'string' ? log.details.includes(showCustomerWallet.id) : 
                       log.details?.customerId === showCustomerWallet.id)
                    );
                  
                  // Combine and sort
                  const transactions: any[] = [];
                  
                  topUpLogs.forEach((log: any) => {
                    const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                    transactions.push({
                      type: log.action === 'admin_job_cancel_refund' ? 'refund' : 'topup',
                      amount: details?.amount || details?.refundAmount || 0,
                      date: log.timestamp,
                      description: log.action === 'admin_job_cancel_refund' ? `Refund - ${details?.orderId || 'Job cancelled'}` : `Top-up via ${details?.status === 'self_confirmed' ? 'PayNow' : 'Stripe'}`
                    });
                  });
                  
                  customerJobs.forEach((j: any) => {
                    transactions.push({
                      type: j.status === 'cancelled' ? 'refund' : 'deduction',
                      amount: parseFloat(j.price) || 0,
                      date: j.created_at,
                      description: `${j.status === 'cancelled' ? 'Cancelled' : 'Order'} ${j.order_id || ''} - ${j.pickup?.substring(0, 30)}...`
                    });
                  });
                  
                  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  
                  return transactions.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No transactions yet</p>
                  ) : transactions.slice(0, 20).map((t: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                      <div>
                        <p className="text-sm text-gray-700">{t.description}</p>
                        <p className="text-xs text-gray-400">{formatSGT(t.date)}</p>
                      </div>
                      <p className={`font-bold text-sm ${
                        t.type === 'topup' || t.type === 'refund' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {t.type === 'topup' || t.type === 'refund' ? '+' : '-'}${t.amount.toFixed(2)}
                      </p>
                    </div>
                  ));
                })()}
              </div>
              
              <button
                onClick={() => setShowCustomerWallet(null)}
                className="mt-4 w-full py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                Close
              </button>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                  <select
                    value={editRider.employment_type || 'part-time'}
                    onChange={(e) => setEditRider({...editRider, employment_type: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="part-time">Part-Time</option>
                    <option value="full-time">Full-Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                  <select
                    value={editRider.vehicle_type || 'bike'}
                    onChange={(e) => setEditRider({...editRider, vehicle_type: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="bike">Bike</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                    <option value="lorry">Lorry</option>
                  </select>
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
                          earnings: editRider.earnings,
                          employment_type: editRider.employment_type || 'part-time',
                          vehicle_type: editRider.vehicle_type || 'bike'
                        };
                        // Only update password if a new one was entered
                        if (editRider.password && editRider.password.trim() !== '') {
                          updateData.password = editRider.password;
                        }
                        await api(`riders?id=eq.${editRider.id}`, 'PATCH', updateData);
                        setEditRider(null);
                        await loadData();
                        alert('Rider updated successfully!');
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

        {/* Create New Rider Modal (Admin) */}
        {showCreateRider && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Create a New Rider</h3>
                <button onClick={() => setShowCreateRider(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={createRiderForm.name} 
                    onChange={(e) => setCreateRiderForm({...createRiderForm, name: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                    placeholder="Rider's full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input 
                    type="email" 
                    value={createRiderForm.email} 
                    onChange={(e) => setCreateRiderForm({...createRiderForm, email: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                    placeholder="rider@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input 
                    type="password" 
                    value={createRiderForm.password} 
                    onChange={(e) => setCreateRiderForm({...createRiderForm, password: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                    placeholder="Set a password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input 
                    type="text" 
                    value={createRiderForm.phone} 
                    onChange={(e) => setCreateRiderForm({...createRiderForm, phone: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                    placeholder="e.g., 91234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tier</label>
                  <input 
                    type="number" 
                    value={createRiderForm.tier} 
                    onChange={(e) => setCreateRiderForm({...createRiderForm, tier: parseInt(e.target.value) || 1})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                  <select
                    value={createRiderForm.employment_type}
                    onChange={(e) => setCreateRiderForm({...createRiderForm, employment_type: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="part-time">Part-Time</option>
                    <option value="full-time">Full-Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                  <select
                    value={createRiderForm.vehicle_type}
                    onChange={(e) => setCreateRiderForm({...createRiderForm, vehicle_type: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="bike">Bike</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                    <option value="lorry">Lorry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Referral Code (Optional)</label>
                  <input 
                    type="text" 
                    value={createRiderForm.referralCode} 
                    onChange={(e) => setCreateRiderForm({...createRiderForm, referralCode: e.target.value.toUpperCase()})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                    placeholder="Enter existing rider's referral code"
                  />
                  <p className="text-xs text-gray-500 mt-1">If this rider was referred by another rider, enter their referral code to link the upline chain.</p>
                </div>
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={() => setShowCreateRider(false)} 
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      if (!createRiderForm.name || !createRiderForm.email || !createRiderForm.password || !createRiderForm.phone) {
                        alert('Please fill in all required fields');
                        return;
                      }
                      try {
                        const code = createRiderForm.name.substring(0, 4).toUpperCase() + Math.floor(Math.random() * 10000);
                        
                        // Build upline chain if referral code provided
                        let uplineChain: any[] = [];
                        let riderTier = createRiderForm.tier || 1;
                        if (createRiderForm.referralCode) {
                          const ref = await api(`riders?referral_code=eq.${createRiderForm.referralCode}`);
                          if (ref && ref.length > 0) {
                            uplineChain = [{ id: ref[0].id, name: ref[0].name, tier: ref[0].tier }, ...(ref[0].upline_chain || [])];
                            riderTier = (ref[0].tier || 1) + 1;
                          } else {
                            alert('Referral code not found. Rider will be created without upline.');
                          }
                        }
                        
                        await api('riders', 'POST', {
                          name: createRiderForm.name,
                          email: createRiderForm.email,
                          password: createRiderForm.password,
                          phone: createRiderForm.phone,
                          tier: riderTier,
                          referral_code: code,
                          earnings: 0,
                          completed_jobs: 0,
                          employment_type: createRiderForm.employment_type,
                          vehicle_type: createRiderForm.vehicle_type,
                          upline_chain: uplineChain
                        });
                        alert(`Rider "${createRiderForm.name}" created successfully!\nReferral Code: ${code}${uplineChain.length > 0 ? `\nUpline: ${uplineChain[0].name} (Tier ${uplineChain[0].tier})` : ''}\nTier: ${riderTier}`);
                        setShowCreateRider(false);
                        setCreateRiderForm({ name: '', email: '', password: '', phone: '', tier: 1, employment_type: 'part-time', vehicle_type: 'bike', referralCode: '' });
                        loadData();
                      } catch (e: any) {
                        alert('Error creating rider: ' + e.message);
                      }
                    }} 
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Create Rider
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
                          Last updated: {formatSGTTime(riderLocation.updated_at)}
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
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">📸 Proof of Delivery</h3>
                <button onClick={() => setSelectedPodJob(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold">{selectedPodJob.order_id && <span className="text-purple-600">[{selectedPodJob.order_id}] </span>}{selectedPodJob.pickup} → {selectedPodJob.delivery}</p>
                <p className="text-sm text-gray-600">Rider: {selectedPodJob.rider_name}</p>
                <p className="text-sm text-gray-600">Customer: {selectedPodJob.customer_name}</p>
              </div>
              
              {/* Multi-stop POD photos */}
              {selectedPodJob.pod_images && Array.isArray(selectedPodJob.pod_images) && selectedPodJob.pod_images.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700">{selectedPodJob.pod_images.length} POD Photo{selectedPodJob.pod_images.length > 1 ? 's' : ''}:</p>
                  {selectedPodJob.pod_images.map((pod: any, idx: number) => (
                    <div key={idx} className="border rounded-lg overflow-hidden">
                      <img 
                        src={pod.image} 
                        alt={`POD Drop-off ${pod.stopIndex + 1}`} 
                        className="w-full max-h-48 object-contain bg-gray-100"
                      />
                      <div className="p-3 bg-white">
                        <p className="text-sm font-medium text-gray-700">📍 Drop-off {pod.stopIndex + 1}</p>
                        <p className="text-xs text-gray-500">{pod.address}</p>
                        <p className="text-xs text-gray-400">📸 {formatSGT(pod.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedPodJob.pod_image ? (
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
                      Captured: {formatSGT(selectedPodJob.pod_timestamp)}
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
                        href={generateWhatsAppLink(activeJob.customer_phone, formatTemplateMessage(template.message, activeJob, curr?.name, curr?.phone))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full p-3 bg-white border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
                      >
                        <p className="font-semibold text-green-700">{template.label}</p>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{formatTemplateMessage(template.message, activeJob, curr?.name, curr?.phone)}</p>
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
                        href={generateWhatsAppLink(activeJob.customer_phone, formatTemplateMessage(template.message, activeJob, curr?.name, curr?.phone))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                      >
                        <p className="font-semibold text-gray-700">{template.label}</p>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{formatTemplateMessage(template.message, activeJob, curr?.name, curr?.phone)}</p>
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

        {/* Boost Order Modal (Customer) */}
        {showBoostModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">⚡ Boost Your Order</h3>
                <button onClick={() => { setShowBoostModal(null); setBoostAmount(''); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800">
                  Your order is waiting for a driver. Add extra payment to increase your chances of getting a driver faster.
                </p>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Order: <span className="font-bold text-purple-600">{showBoostModal.order_id}</span></p>
                <p className="text-sm text-gray-600">Current Price: <span className="font-bold">${parseFloat(showBoostModal.price).toFixed(2)}</span></p>
                {showBoostModal.boost_amount > 0 && (
                  <p className="text-xs text-orange-600 mt-1">Already boosted: +${showBoostModal.boost_amount.toFixed(2)}</p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Extra Amount ($)</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[2, 5, 10, 20].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setBoostAmount(amt.toString())}
                      className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        boostAmount === amt.toString()
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                      }`}
                    >
                      +${amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={boostAmount}
                  onChange={(e) => setBoostAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Or enter custom amount"
                  min="1"
                  step="0.5"
                />
              </div>
              
              {boostAmount && parseFloat(boostAmount) > 0 && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Price:</span>
                    <span>${parseFloat(showBoostModal.price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Boost Amount:</span>
                    <span>+${parseFloat(boostAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold mt-1 pt-1 border-t">
                    <span>New Price:</span>
                    <span className="text-green-700">${(parseFloat(showBoostModal.price) + parseFloat(boostAmount)).toFixed(2)}</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => boostOrder(showBoostModal.id, parseFloat(boostAmount))}
                disabled={!boostAmount || parseFloat(boostAmount) <= 0}
                className={`w-full py-3 rounded-lg font-semibold text-lg ${
                  boostAmount && parseFloat(boostAmount) > 0
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                🔥 Boost Order {boostAmount && parseFloat(boostAmount) > 0 ? `(+$${parseFloat(boostAmount).toFixed(2)})` : ''}
              </button>
              
              <p className="text-xs text-gray-400 text-center mt-2">
                Amount will be deducted from your credits. Your order will be marked as URGENT.
              </p>
            </div>
          </div>
        )}

        {/* Fullscreen POD Image Viewer Modal */}
        {viewingPodImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
            onClick={() => setViewingPodImage(null)}
          >
            <div className="relative max-w-4xl w-full">
              <button
                onClick={() => setViewingPodImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 text-xl font-bold bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center"
              >
                ✕
              </button>
              <img
                src={viewingPodImage}
                alt="Proof of Delivery - Full Size"
                className="max-h-[85vh] max-w-full mx-auto rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <p className="text-center text-white mt-4 text-sm opacity-75">
                Click anywhere outside the image to close
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DeliveryPlatform;
