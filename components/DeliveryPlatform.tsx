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
const ensureUTC = (dateStr: string | Date): Date => {
  if (dateStr instanceof Date) return dateStr;
  // If timestamp from Supabase doesn't end with Z or timezone offset, treat as UTC
  const str = String(dateStr).trim();
  if (str && !str.endsWith('Z') && !str.match(/[+-]\d{2}:\d{2}$/) && !str.match(/[+-]\d{4}$/)) {
    return new Date(str + 'Z');
  }
  return new Date(str);
};

const formatSGT = (dateStr: string | Date): string => {
  try {
    return ensureUTC(dateStr).toLocaleString('en-SG', { 
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
    return ensureUTC(dateStr).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' });
  } catch {
    return new Date(dateStr).toLocaleDateString();
  }
};

const formatSGTTime = (dateStr: string | Date): string => {
  try {
    return ensureUTC(dateStr).toLocaleTimeString('en-SG', { 
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
    parcelSize: 'bike',
    remarks: ''
  });
  const [useMyProfile, setUseMyProfile] = useState(true); // Auto-fill pickup contact with customer profile
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Admin search, pagination and filter states
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSort, setCustomerSort] = useState('name');
  const [customerPage, setCustomerPage] = useState(1);
  const [riderSearch, setRiderSearch] = useState('');
  const [riderSort, setRiderSort] = useState('name');
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
    customerId: '',
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
    parcelSize: 'bike',
    remarks: ''
  });
  // Admin customer-search dropdown state (for Manual Key In Job form)
  const [adminCustomerSearch, setAdminCustomerSearch] = useState('');
  const [adminCustomerDropdownOpen, setAdminCustomerDropdownOpen] = useState(false);
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
  const [walletDateFrom, setWalletDateFrom] = useState('');
  const [showRiderEarnings, setShowRiderEarnings] = useState<any>(null);
  const [riderEarnFrom, setRiderEarnFrom] = useState('');
  const [riderEarnTo, setRiderEarnTo] = useState('');
  const [walletDateTo, setWalletDateTo] = useState('');
  const [riderHasGPS, setRiderHasGPS] = useState(false);
  const [newJobNotifications, setNewJobNotifications] = useState<any[]>([]);
  const [lastJobCheck, setLastJobCheck] = useState<string | null>(null);

  // Customer urgent/boost states
  const [showBoostModal, setShowBoostModal] = useState<any>(null);
  const [boostAmount, setBoostAmount] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [showAiInput, setShowAiInput] = useState(false);
  const [showCustomerTnC, setShowCustomerTnC] = useState(false);
  const [showRiderTnC, setShowRiderTnC] = useState(false);
  const [tncAccepted, setTncAccepted] = useState(false);
  const [pendingTnCAction, setPendingTnCAction] = useState<any>(null);
  const [remindersSent, setRemindersSent] = useState<Record<string, boolean>>({});

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
  const [formDistance, setFormDistance] = useState<number | null>(null);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  // Tracks which address fields are currently looking up a postal code via OneMap.
  // Used to show a "Looking up..." indicator next to the input so the user knows the system is responding.
  const [lookingUp, setLookingUp] = useState<{ pickup?: boolean; stops?: Record<number, boolean>; adminPickup?: boolean; adminStops?: Record<number, boolean> }>({});
  const [showDeliveryPlan, setShowDeliveryPlan] = useState(false);
  const [showPasteOrder, setShowPasteOrder] = useState(false);
  const [jobPostTime, setJobPostTime] = useState<number | null>(null);
  const [boostStage, setBoostStage] = useState(0);
  const [bonusConfig, setBonusConfig] = useState({ earningsTarget: 180, earningsBonus: 10, ordersTarget: 10, ordersBonus: 5, period: 'weekly', method: 'both', startDate: '', endDate: '' });
  const [deliveryPlan, setDeliveryPlan] = useState({
    planType: 'weekly' as 'weekly' | 'monthly',
    pickup: '',
    pickupUnitNo: '',
    delivery: '',
    deliveryUnitNo: '',
    recipientName: '',
    recipientPhone: '',
    parcelSize: 'bike',
    price: '10',
    remarks: '',
    weeklyDays: [] as string[],
    monthlyDates: [] as number[],
    timeSlot: '6am-11am',
    startDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }),
    weeksToGenerate: 4,
  });

  // GPS Enforcement state (Feature 11)
  const [gpsPermissionGranted, setGpsPermissionGranted] = useState<boolean | null>(null);
  const [showGpsWarning, setShowGpsWarning] = useState(false);

  // Admin POD Management states (Feature 13)
  const [showPodManagement, setShowPodManagement] = useState(false);
  const [selectedPodJob, setSelectedPodJob] = useState<any>(null);
  const [viewingPodImage, setViewingPodImage] = useState<string | null>(null); // For fullscreen POD view
  // Egress optimization: POD photos are excluded from polling and lazy-loaded on demand
  const [podCache, setPodCache] = useState<{[jobId: string]: { pod_image?: string; pod_images?: any[]; pod_timestamp?: string; loading?: boolean }}>({});

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
    parcelSize: 'bike',
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
        // Payment successful - log the Stripe top-up
        setTimeout(async () => {
          try {
            const savedAuth = localStorage.getItem('moveit_auth');
            const pendingTopup = localStorage.getItem('moveit_pending_topup');
            const topupData = pendingTopup ? JSON.parse(pendingTopup) : null;
            
            if (savedAuth) {
              const parsedAuth = JSON.parse(savedAuth);
              if (parsedAuth.id && parsedAuth.type === 'customer') {
                const custData = await api(`customers?id=eq.${parsedAuth.id}`);
                const custName = custData && custData.length > 0 ? custData[0].name : 'Unknown';
                await api('audit_logs', 'POST', {
                  action: 'customer_topup',
                  user_id: parsedAuth.id,
                  user_type: 'customer',
                  details: JSON.stringify({
                    customerId: parsedAuth.id,
                    customerName: custName,
                    amount: topupData?.amount || 0,
                    sessionId: sessionId,
                    status: 'stripe_payment'
                  }),
                  timestamp: new Date().toISOString()
                });
              }
            }
            // Clear pending top-up
            localStorage.removeItem('moveit_pending_topup');
          } catch (e) {
            console.log('Failed to log Stripe top-up:', e);
          }
          alert('🎉 Payment successful! Your credits have been added to your account.');
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
  // Egress optimization: use pod_timestamp as the lightweight presence indicator
  // (pod_image/pod_images base64 columns are excluded from polling to save bandwidth)
  const podManagementData = useMemo(() => {
    const completedJobs = jobs.filter((j: any) => j.status === 'completed');
    const withPod = completedJobs.filter((j: any) => j.pod_timestamp);
    const withoutPod = completedJobs.filter((j: any) => !j.pod_timestamp);
    
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
  const exportWalletCSV = (w: any) => {
    if (!w) return;
    const NL = String.fromCharCode(10);
    const cJ = jobs.filter((j: any) => j.customer_id === w.id || (j.customer_name && j.customer_name.trim() === w.name.trim()));
    const rL = auditLogs.filter((l: any) => {
      if (l.action !== 'customer_topup' && l.action !== 'stripe_topup_success' && l.action !== 'admin_job_cancel_refund') return false;
      const d = typeof l.details === 'string' ? (() => { try { return JSON.parse(l.details); } catch { return {}; } })() : (l.details || {});
      return d?.customerId === w.id || l.user_id === w.id;
    });
    const tx: any[] = [];
    rL.forEach((l: any) => {
      const d = typeof l.details === 'string' ? (() => { try { return JSON.parse(l.details); } catch { return {}; } })() : (l.details || {});
      if (l.action === 'customer_topup' || l.action === 'stripe_topup_success') tx.push({ tp: 'Top-up', am: d?.amount || 0, dt: l.timestamp, ds: d?.status === 'stripe_payment' ? 'Stripe' : 'PayNow' });
    });
    cJ.forEach((j: any) => {
      if (j.status === 'cancelled') tx.push({ tp: 'Refund', am: parseFloat(j.price) || 0, dt: j.cancelled_at || j.created_at, ds: 'Refund ' + (j.order_id || '') });
      else tx.push({ tp: 'Order', am: parseFloat(j.price) || 0, dt: j.created_at, ds: (j.order_id || '') + ' ' + extractAreaName(j.pickup) + ' to ' + extractAreaName(j.delivery) });
    });
    tx.sort((a, b) => new Date(b.dt).getTime() - new Date(a.dt).getTime());
    const seenE = new Set();
    const dedupTx = tx.filter((x) => { if (x.tp !== 'Top-up') return true; const k = x.am.toFixed(2) + '_' + new Date(x.dt).toISOString().substring(0, 16); if (seenE.has(k)) return false; seenE.add(k); return true; });
    const wF = walletDateFrom ? new Date(walletDateFrom) : null;
    const wT = walletDateTo ? new Date(walletDateTo + 'T23:59:59') : null;
    const ft = dedupTx.filter((x) => { const xd = new Date(x.dt); if (wF && xd < wF) return false; if (wT && xd > wT) return false; return true; });
    let csv = 'Date,Type,Description,Amount' + NL;
    ft.forEach((x) => { csv += new Date(x.dt).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' }) + ',' + x.tp + ',' + String(x.ds).replace(/,/g, ' ') + ',' + (x.tp === 'Order' ? '-' : '+') + x.am.toFixed(2) + NL; });
    csv += ',,,Balance: ' + (w.credits || 0).toFixed(2) + NL;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = w.name + '_transactions.csv';
    el.click();
  };

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
      const logs = await api('audit_logs?order=timestamp.desc&limit=500');
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
      // Parse details if it's a string, filter out blank/invalid records
      const parsed = (Array.isArray(logs) ? logs : []).map((log: any) => ({
        ...log,
        details: typeof log.details === 'string' ? (() => { try { return JSON.parse(log.details); } catch { return log.details; } })() : log.details
      })).filter((log: any) => log.details && log.details.riderName && log.details.amount > 0);
      setWithdrawalRequests(parsed);
    } catch (e) {
      console.error('Failed to load withdrawal requests:', e);
      setWithdrawalRequests([]);
    }
  };

  // Approve/Reject withdrawal request
  const processWithdrawalRequest = async (requestId: string, action: 'approved' | 'rejected' | 'completed' | 'pending', request: any) => {
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

      // If restoring from rejected to pending, deduct the earnings again
      if (action === 'pending') {
        const rider = riders.find(r => r.id === request.details.riderId);
        if (rider) {
          const newEarnings = (rider.earnings || 0) - request.details.amount;
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
      } else if (action === 'pending') {
        alert(`Withdrawal request RESTORED to pending.\n\nRider: ${request.details.riderName}\nAmount: $${request.details.amount?.toFixed(2)}\n\nYou can now Approve or Reject it again.`);
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
      // DEDUCT CREDITS FIRST before creating any jobs
      await api(`customers?id=eq.${auth.id}`, 'PATCH', { 
        credits: freshCredits - totalCost 
      });
      
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
          parcel_size: job.parcel_size || 'bike',
          remarks: job.notes || null
        });
        successCount++;
      }
      
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
    
    // Recompute price from real distance (overrides any stale form price)
    let finalPrice = parseFloat(adminOrderForm.price) || 10;
    try {
      const priceCalc = await computeDistancePrice(adminOrderForm.pickup, [{ address: adminOrderForm.delivery }]);
      if (priceCalc) finalPrice = priceCalc.price;
    } catch (e) { /* fall back to form price */ }
    
    try {
      await api('jobs', 'POST', {
        customer_id: adminOrderForm.customerId,
        customer_name: adminOrderForm.customerName,
        customer_phone: adminOrderForm.customerPhone,
        pickup: adminOrderForm.pickup,
        delivery: adminOrderForm.delivery,
        timeframe: adminOrderForm.timeframe,
        price: finalPrice,
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
        parcelSize: 'bike',
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

  // Admin - Send broadcast via WhatsApp
  const sendBroadcast = async () => {
    if (!broadcastMessage.message) {
      alert('Please enter a message');
      return;
    }
    
    // Determine recipients
    let recipients: any[] = [];
    if (broadcastMessage.target === 'all_riders') {
      recipients = riders.filter((r: any) => r.phone).map((r: any) => ({ name: r.name, phone: r.phone, type: 'rider' }));
    } else if (broadcastMessage.target === 'online_riders') {
      recipients = riders.filter((r: any) => r.phone && r.is_online).map((r: any) => ({ name: r.name, phone: r.phone, type: 'rider' }));
    } else if (broadcastMessage.target === 'all_customers') {
      recipients = customers.filter((c: any) => c.phone).map((c: any) => ({ name: c.name, phone: c.phone, type: 'customer' }));
    } else {
      recipients = [
        ...riders.filter((r: any) => r.phone).map((r: any) => ({ name: r.name, phone: r.phone, type: 'rider' })),
        ...customers.filter((c: any) => c.phone).map((c: any) => ({ name: c.name, phone: c.phone, type: 'customer' }))
      ];
    }
    
    if (recipients.length === 0) {
      alert('No recipients found with phone numbers.');
      return;
    }
    
    const fullMessage = `📢 *MoveIt Logistics*${broadcastMessage.subject ? `\n*${broadcastMessage.subject}*` : ''}\n\n${broadcastMessage.message}`;
    
    if (!window.confirm(`Send broadcast to ${recipients.length} recipient(s)?\n\nThis will open WhatsApp for each recipient.\n\nTarget: ${broadcastMessage.target.replace(/_/g, ' ')}\nMessage preview:\n${fullMessage.substring(0, 100)}...`)) {
      return;
    }
    
    await logAuditAction('broadcast_sent', {
      target: broadcastMessage.target,
      subject: broadcastMessage.subject,
      message: broadcastMessage.message,
      recipientCount: recipients.length
    });
    
    // Open WhatsApp for each recipient with a delay
    let sentCount = 0;
    for (const recipient of recipients) {
      const personalMessage = `Hi ${recipient.name} 👋\n\n${fullMessage}`;
      const url = generateWhatsAppLink(recipient.phone, personalMessage);
      
      setTimeout(() => {
        window.open(url, '_blank');
      }, sentCount * 1500); // 1.5 second delay between each
      sentCount++;
    }
    
    alert(`Broadcast sending to ${recipients.length} recipient(s) via WhatsApp!\n\nWhatsApp windows will open one by one. Please send each message.`);
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

  // Cache for postal-code → full-address lookups (avoids re-hitting OneMap for repeat codes)
  const postalAddressCacheRef = useRef<Record<string, string | null>>({});

  // Singapore Postal Code Lookup using OneMap API (free, no key required)
  const lookupPostalCode = async (postalCode: string): Promise<string | null> => {
    if (!/^\d{6}$/.test(postalCode)) return null;

    // Return cached result instantly if we've looked this up before
    if (postalAddressCacheRef.current[postalCode] !== undefined) {
      return postalAddressCacheRef.current[postalCode];
    }

    try {
      // Abort the request if OneMap takes longer than 5 seconds (rare but possible)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(
        `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y&pageNum=1`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
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
        postalAddressCacheRef.current[postalCode] = address;
        return address;
      }
      postalAddressCacheRef.current[postalCode] = null;
      return null;
    } catch (error) {
      console.error('Postal code lookup failed:', error);
      // Don't cache failures (they may be transient like timeout/network)
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

  const lookupCoordinatesByName = async (placeName: string): Promise<{lat: number, lng: number} | null> => {
    if (!placeName || placeName.trim().length < 3) return null;
    try {
      const searchTerm = placeName.replace(/#\d+-\d+/g, '').replace(/\b(Blk|Block)\b/gi, '').trim();
      const response = await fetch(
        `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(searchTerm)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
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
      console.error('Place name lookup failed:', error);
      return null;
    }
  };

  // Cache for coordinate lookups to avoid duplicate API calls
  const coordsCacheRef = useRef<Record<string, {lat: number, lng: number} | null>>({});
  
  // Lookup coordinates with caching
  const lookupCoordinatesCached = async (key: string): Promise<{lat: number, lng: number} | null> => {
    if (coordsCacheRef.current[key] !== undefined) {
      return coordsCacheRef.current[key];
    }
    let result = await lookupCoordinates(key);
    if (!result && !/^\d{6}$/.test(key)) {
      result = await lookupCoordinatesByName(key);
    }
    coordsCacheRef.current[key] = result;
    return result;
  };

  // Calculate distances between pickup and all stops for a job
  const calculateJobDistances = async (pickupAddress: string, stops: any[]): Promise<{distances: number[], totalDistance: number} | null> => {
    try {
      const pickupPostal = extractPostalCode(pickupAddress);
      const pickupKey = pickupPostal || pickupAddress;
      const pickupCoords = await lookupCoordinatesCached(pickupKey);
      if (!pickupCoords) return null;

      const distances: number[] = [];
      let prevCoords = pickupCoords;
      let totalDistance = 0;

      for (const stop of stops) {
        const fullStopAddr = `${stop.address || ''} ${stop.unitNo || ''}`.trim();
        const stopPostal = extractPostalCode(fullStopAddr);
        const stopKey = stopPostal || fullStopAddr;
        if (!stopKey || stopKey.length < 3) { distances.push(0); continue; }
        
        const stopCoords = await lookupCoordinatesCached(stopKey);
        if (!stopCoords) { distances.push(0); continue; }

        const dist = haversineDistance(prevCoords.lat, prevCoords.lng, stopCoords.lat, stopCoords.lng);
        const routeDist = dist * 1.35;
        const rounded = parseFloat(routeDist.toFixed(1));
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

  // Unified distance-based price computation used by all job-creation paths
  // (customer manual, customer AI, admin manual, admin AI) to ensure consistency.
  // Formula: $3 base + ($0.95 × total_km × 1.35 route factor handled inside calculateJobDistances) + ($2.50 × drops)
  // Returns { distance, price } or null if distance lookup fails.
  const computeDistancePrice = async (pickupAddress: string, stops: any[]): Promise<{ distance: number; price: number } | null> => {
    if (!pickupAddress || !stops || stops.length === 0) return null;
    const validStops = stops.filter((s: any) => s && s.address);
    if (validStops.length === 0) return null;
    const result = await calculateJobDistances(pickupAddress, validStops);
    if (!result || result.totalDistance <= 0) return null;
    const drops = validStops.length;
    const computed = 3 + (result.totalDistance * 0.95) + (drops * 2.50);
    return { distance: result.totalDistance, price: parseFloat(computed.toFixed(2)) };
  };

  // Live distance calculation for customer job form
  useEffect(() => {
    const calcFormDist = async () => {
      if (!jobForm.pickup || !jobForm.stops[0]?.address) { setFormDistance(null); return; }
      const result = await calculateJobDistances(jobForm.pickup, jobForm.stops.filter((s: any) => s.address));
      if (result) {
        setFormDistance(result.totalDistance);
        if (result.totalDistance > 0) {
          const drops = jobForm.stops.filter((s: any) => s.address).length || 1;
          const formulaPrice = 3 + (result.totalDistance * 0.95) + (drops * 2.50);
          setJobForm(prev => ({...prev, price: formulaPrice.toFixed(2)}));
        }
      }
    };
    const timer = setTimeout(calcFormDist, 1000);
    return () => clearTimeout(timer);
  }, [jobForm.pickup, JSON.stringify(jobForm.stops.map((s: any) => s.address))]);

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
    newStops[index] = { ...newStops[index], address: value };
    setJobForm({ ...jobForm, stops: newStops });
    
    // Only lookup if exactly 6 digits and looks like a postal code
    if (postalCode.length === 6 && /^\d{6}$/.test(value)) {
      const address = await lookupPostalCode(postalCode);
      if (address) {
        setJobForm(prev => {
          const latestStops = [...prev.stops];
          if (latestStops[index] && /^\d{6}$/.test(latestStops[index].address)) {
            latestStops[index] = { ...latestStops[index], address };
          }
          return { ...prev, stops: latestStops };
        });
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
      return !jobDistanceCache[job.id] && stops.length > 0 && job.pickup;
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

        {/* Vehicle Information */}
        {job.parcel_size && (
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-xs font-medium text-gray-500 uppercase">Vehicle Information</p>
            <p className="text-sm">📦 Vehicle Type: <span className="font-medium capitalize">{job.parcel_size}</span></p>
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

        {/* Total Route Distance */}
        {cachedDist && cachedDist.totalDistance > 0 && (
          <div className="bg-purple-50 p-2 rounded text-center">
            <p className="text-xs font-medium text-purple-600 uppercase">Route Distance (est.)</p>
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

  const CUSTOMER_TNC = `Terms and Conditions

1. Wallet / Credit System
All payments on the MoveIt Logistics App must be made through the in-app wallet system.
• Customers are required to top up credits into the wallet first before placing any order
• Direct payment to riders (cash, PayNow, bank transfer, etc.) is strictly not allowed, unless explicitly stated by the MoveIt Logistics App
• Wallet credits are non-transferable: Cannot be transferred to another user, Cannot be exchanged for cash

2. Strict No Refund Policy
All wallet credits are strictly non-refundable.
• No refunds will be provided under any circumstances, including: Change of mind, No usage of credits, Account inactivity
• Wallet credits cannot be withdrawn as cash
Example: If you top up $200 but decide not to use the service, the $200 will remain in your wallet and cannot be refunded.

3. Expiry of Credits
All wallet credits are valid for 6 months from the date of top-up.
• After 6 months: Credits will automatically expire, Expired credits will be forfeited permanently
• Extensions are not guaranteed and may only be granted at the MoveIt Logistics App's sole discretion
Example: If you top up on 1 January, your credits will expire on 30 June.

4. Failed or Cancelled Delivery
If a delivery cannot be completed:
• The amount paid will remain in your wallet as credits
• No refund will be made to your bank account or card

5. Pricing Control
• All delivery fees shown in the app are final and binding before order confirmation
• Customers may choose to increase the price to attract riders faster
• Once confirmed, the price cannot be disputed

6. No Guarantee of Service
The MoveIt Logistics App does not guarantee:
• Immediate job acceptance by riders
• Delivery within a specific time
• Availability of riders at all times

7. Customer Responsibilities
Customers must provide accurate and complete information, including: Pickup location, Drop-off location, Contact details.
If incorrect information is provided: Delays may occur, Additional charges may apply, Customer bears full responsibility.

8. Waiting Time & Additional Charges
Additional charges may apply in situations such as: Long waiting time at pickup or drop-off, Incorrect address, Last-minute changes.
All additional charges will be deducted directly from your wallet.

9. Cancellation Policy
• Once a rider accepts or picks up the order: Cancellation may not be allowed, OR Cancellation charges will apply
• No refund of credits will be given

10. Limitation of Liability
The MoveIt Logistics App is not liable for: Lost items, Damaged items, Delivery delays.

11. Rider Conduct
• Riders are not employees of the MoveIt Logistics App
• The MoveIt Logistics App is not responsible for rider behavior or actions

12. Proof of Delivery
• Photo proof is considered valid completion of delivery
• If the item is left at the doorstep, it is considered successfully delivered

13. Abuse / Misuse
Customers must not: Create fake bookings, Abuse the system, Exploit pricing or promotions.
If detected, the MoveIt Logistics App may: Suspend or terminate the account, Forfeit all wallet credits.

14. MoveIt Logistics App Control
The MoveIt Logistics App reserves full rights to: Suspend or terminate accounts, Reject or cancel orders, Modify system features, pricing, or policies at any time.

15. Disputes
• All decisions made by the MoveIt Logistics App are final and binding
• Customers agree not to file chargebacks or disputes after service is completed

16. System / Technical Issues
The MoveIt Logistics App is not responsible for: App errors, Payment processing delays, Network or connectivity issues.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GOODS PROTECTION PROMISES

1. SERVICE SCOPE
"Goods" referred to in these Goods Protection Promises ("Promises") shall mean any items, parcels, documents, products, or cargo transported through the MoveIt App platform ("Shipment").

Subject strictly to the terms herein, MoveIt App may, at its sole and absolute discretion, provide a goodwill compensation to selected users for direct physical loss or direct physical damage to Shipments caused solely and directly by a Delivery Partner during the active transportation period.

The Promises shall only apply from the moment the Delivery Partner confirms collection of the Shipment in the MoveIt App system until the Shipment is marked as delivered within the MoveIt App system.

For avoidance of doubt:
a. The Promises is not an insurance policy;
b. Compensation is ex gratia and discretionary in nature;
c. MoveIt App is a technology platform and is not a carrier, freight forwarder, warehouseman, insurer, or logistics operator;
d. The burden of proof rests entirely on the User at all times.

2. GOODS NOT COVERED
The following Goods are strictly excluded from coverage under the Promises:
a. Cash, coins, bank notes, negotiable instruments, securities, cryptocurrency wallets, vouchers, prepaid cards, tickets, or any item representing stored value;
b. Jewellery, watches, gemstones, precious metals, luxury goods, collectibles, antiques, artwork, rare items, or sentimental items;
c. Mobile phones, tablets, laptops, cameras, drones, gaming devices, storage devices, computer components, semiconductors, or electronic products unless factory-sealed in original manufacturer packaging;
d. Perishable goods, frozen products, chilled products, flowers, plants, live seafood, livestock, pets, biological samples, or temperature-sensitive items;
e. Fragile items including but not limited to glassware, ceramics, marble, mirrors, screens, monitors, televisions, lighting fixtures, musical instruments, sculptures, or items prone to cosmetic damage;
f. Documents, passports, certificates, licenses, contracts, tenders, legal papers, examination materials, or time-sensitive documents;
g. Medicines, supplements, controlled substances, tobacco, alcohol, or regulated products;
h. Hazardous, flammable, corrosive, explosive, radioactive, toxic, or restricted materials;
i. Used goods without valid original purchase documentation;
j. Goods with a declared or estimated value exceeding SGD 500 per individual item or SGD 1,000 per order;
k. Improperly packed Goods or Goods not packed according to commercially reasonable transportation standards as determined solely by MoveIt App;
l. Bulk commercial shipments, palletized cargo, industrial machinery, construction materials, or oversized items;
m. Any item prohibited under applicable law or under the MoveIt App Terms of Service.

3. COMPENSATION CAP
Any compensation approved by MoveIt App shall be limited to the lowest of the following amounts:
a. The documented original purchase value of the Goods, subject to depreciation as determined solely by MoveIt App;
b. The fair market resale value of the Goods immediately before the incident, as determined solely by MoveIt App;
c. The documented repair cost approved by MoveIt App;
d. Up to SGD 2,000 per Shipment for motorcycles and passenger vehicles;
e. Up to SGD 2,000 per Shipment for car or van deliveries;
f. The actual delivery fee paid for the relevant order.

Under no circumstances shall the compensation exceed SGD 2,000 per order unless otherwise expressly approved in writing by MoveIt App.

MoveIt App reserves the right to require proof of ownership, proof of value, proof of condition before transportation, and proof that the alleged damage occurred solely during transit.

No compensation shall be payable for:
a. indirect loss;
b. consequential loss;
c. emotional distress;
d. business interruption;
e. loss of profits;
f. reputational damage;
g. future revenue loss;
h. loss of use;
i. depreciation;
j. cosmetic defects not affecting functionality.

4. EXCLUDED CIRCUMSTANCES
Without limitation, the following circumstances are excluded from the Promises:
a. Delay in pickup or delivery for any reason;
b. Incorrect, incomplete, inaccessible, unsafe, or changed addresses;
c. Failure of recipient to answer calls, messages, or receive Goods;
d. User-requested unattended delivery or third-party collection;
e. Weather conditions, floods, haze, traffic congestion, road closures, ERP delays, vehicle breakdowns, accidents, or force majeure events;
f. Inherent defects, latent defects, wear and tear, oxidation, leakage, spoilage, melting, deterioration, or natural changes in condition;
g. Insufficient, unsuitable, reused, damaged, or inadequate packaging;
h. Scratches, dents, compression marks, bending, creasing, cosmetic imperfections, or minor external damage deemed commercially acceptable by MoveIt App;
i. Theft without conclusive evidence directly implicating the Delivery Partner;
j. Fraudulent, exaggerated, misleading, incomplete, or unverifiable claims;
k. Claims unsupported by timestamped photographic or video evidence taken immediately before pickup and immediately upon delivery;
l. Any Shipment left unattended before pickup or after delivery;
m. Seizure, confiscation, inspection, or detention by authorities;
n. Cyber incidents, software failures, GPS inaccuracies, telecommunications disruptions, or app outages;
o. Any incident where the User fails to cooperate fully with MoveIt App investigations.

5. CLAIMS PROCEDURE
All claims must strictly comply with the following procedures, failing which the claim shall be automatically rejected without further review:
a. Claims must be submitted within 6 hours from the marked delivery time in the MoveIt App system;
b. Users must provide:
   i. Clear timestamped photographs of the Goods before pickup;
   ii. Clear timestamped photographs immediately upon delivery;
   iii. Full unedited video evidence of unboxing where applicable;
   iv. Original purchase invoices or receipts;
   v. Repair quotations from licensed vendors approved by MoveIt App;
   vi. Police reports where requested;
   vii. Any further documentation requested by MoveIt App.
c. MoveIt App may inspect, retain, or request surrender of the Goods before reviewing the claim;
d. Failure to preserve the Goods in their post-incident condition may result in automatic rejection;
e. Users must not dispose of, repair, alter, or modify the Goods before written approval from MoveIt App;
f. MoveIt App reserves the sole right to appoint independent assessors, investigators, repairers, or valuers;
g. Claims may take up to 90 working days or longer where additional investigation is required;
h. Submission of a claim does not guarantee acceptance, review, or payment.

6. MISCELLANEOUS
Any goodwill compensation paid by MoveIt App shall not constitute any admission of liability, negligence, fault, agency relationship, or legal responsibility.

Upon receipt of any compensation, the User irrevocably agrees to fully release and discharge MoveIt App, its affiliates, directors, employees, Delivery Partners, and service providers from all present and future claims arising out of the incident.

MoveIt App reserves the absolute right to:
a. reject any claim;
b. request additional evidence;
c. determine the value of any Goods;
d. interpret these Promises;
e. amend, suspend, or terminate these Promises at any time without prior notice.

MoveIt App's determination on all matters relating to the Promises shall be final, conclusive, and binding.

These Promises do not create any contractual guarantee, insurance arrangement, bailment relationship, fiduciary duty, or carrier liability obligation.

In the event of any inconsistency between language versions, the English version shall prevail.`;

  const RIDER_TNC = `Terms and Conditions

1. Rider Not an Employee
The Rider acknowledges and agrees that he/she is not engaged strictly as an employee, partner, agent, or representative of the Company.
The Rider further understands and agrees that:
• The Company does not provide any form of employment benefits, including but not limited to: CPF contributions, Medical benefits, Insurance coverage, Paid leave (annual, sick, or otherwise)
• The Rider is solely responsible for: Personal taxes, Insurance coverage (including vehicle and personal accident insurance), Compliance with all applicable laws and regulations

2. No Guarantee of Income or Jobs
The Company does not guarantee:
• Any minimum number of jobs
• Any level of income or earnings
• Any incentives, bonuses, or rewards
All earnings are dependent on: Customer demand, Rider performance, Availability of jobs, Market conditions

3. MoveIt Logistics App Control and Discretion
The Rider acknowledges that the Company retains full control over the MoveIt Logistics App and its operations.
The Company reserves the absolute right to:
• Modify pricing, fees, commission structures, and incentives at any time
• Assign, reassign, or remove jobs at its sole discretion
• Restrict or revoke access to the MoveIt Logistics App
Use of the MoveIt Logistics App is granted as a revocable privilege, not a right.

4. Payment and Wallet System
All Rider earnings shall be processed exclusively through the MoveIt Logistics App's internal wallet system.
The Rider agrees that:
• Withdrawals are subject to a minimum payout threshold
• The Company may delay, hold, or withhold payments in cases of: Disputes, Fraud investigations, System errors
• The Company's calculation of earnings shall be final and binding

5. Proof of Delivery Requirements
The Rider must provide complete and accurate proof of delivery for every job, including: Clear photo evidence, GPS location data, Timestamp verification.
Failure to provide valid proof will result in non-payment.
The Company reserves the sole right to determine whether proof is sufficient.

6. Cancellation Policy
In the event of cancellation:
• If cancellation occurs after pickup, the Rider must return the item and provide proof
• Failure to provide proof will result in no payment
Excessive cancellations may lead to: Account suspension, Permanent termination
Example: If a Rider cancels after picking up a parcel and does not return it with proper proof, the Rider will not be paid and may face further penalties.

7. Fraud and Abuse Prevention
The Rider is strictly prohibited from engaging in fraudulent or abusive activities, including but not limited to: Creating fake jobs, GPS spoofing or location manipulation, Self-referral or collusion.
Any violation will result in: Immediate suspension or permanent ban, Forfeiture of earnings, Recovery (clawback) of any amounts paid.

8. Clawback Rights
The Company reserves the right to recover or deduct any payments made to the Rider if issues are identified after payment, including: Fraudulent activity, System errors, Overpayments, Abuse of the platform.
Example: If a Rider was mistakenly paid $200 due to a system error, the Company has the right to deduct the amount from future earnings or recover it directly.

9. Limitation of Liability
The Company shall not be liable for: Loss or damage of items, Delivery delays, Actions or negligence of the Rider.
The Rider assumes full responsibility for: All deliveries, Any damages or losses, Any legal claims arising from their actions.
Example: If a parcel is damaged during delivery, the Rider is solely responsible for compensation.

10. Tier, Commission, and Performance System
The Company may implement a tier or commission system based on Rider performance.
The Rider agrees that:
• Tier requirements may be changed at any time
• There is no guarantee of maintaining any tier level
• All tiers are strictly performance-based

11. Suspension and Termination Rights
The Company reserves the right to: Suspend or terminate the Rider's account at any time, Do so without prior notice, Provide no compensation.
Reasons may include, but are not limited to: Policy violations, Poor performance, Fraud or misconduct.

12. Customer Ownership and Non-Circumvention
All customers introduced through the MoveIt Logistics App remain the exclusive property of the Company.
The Rider is strictly prohibited from: Soliciting customers outside the platform, Conducting offline transactions, Sharing personal contact details for business purposes.
Example: A Rider cannot contact a customer directly to arrange future deliveries outside the app.

13. Data and System Authority
All records maintained by the Company's system shall be deemed accurate and final.
The Company is not liable for: System errors, GPS inaccuracies, Network failures, App downtime.

14. Minimum Activity Requirement
The Rider may be required to meet minimum activity levels (e.g., number of jobs per week).
Failure to meet requirements may result in: Tier downgrade, Reduced job allocation, Account removal.

15. Dispute Resolution
All operational decisions made by the Company are final and binding.
The Rider agrees: Not to challenge or dispute such decisions, To accept all outcomes determined by the Company.

16. Force Majeure
The Company shall not be held liable for any failure or delay caused by events beyond its control, including but not limited to: Natural disasters, Government actions, Network or system outages, Pandemics.

17. Activity Policy (Stay Active)
Riders must remain active to maintain their account:
• 7 days without any completed delivery → Reminder will be issued
• 14 days without any completed delivery → Account will be temporarily frozen
• 30 days without any completed delivery → Account will be permanently removed
Example: Stop working on 1 June → 8 June: Reminder → 15 June: Account frozen → 1 July: Account removed
Eligibility Requirement: Minimum 1 completed delivery every 14 days

18. Commission Unlock Policy
To earn downline commission:
• Riders must complete 10 deliveries within 30 days of joining
• Commission will only be activated after the 10th completed job
Example: Join on 1 May → Complete 10 jobs by 20 May → Commission unlocked. Complete only 7 jobs by 30 May → Not eligible.
Eligibility Requirement: 10 completed deliveries within 30 days

19. Upline Eligibility (Monthly Evaluation)
To qualify and remain as an upline:
• Must complete at least 10 deliveries per week
• Performance is evaluated at the end of each month
If requirements are not met:
• The downline who meets 10 jobs per week AND achieves the highest total deliveries for the month will replace the current upline
• Previous upline will become downline
• Network structure will be reassigned accordingly
Example (June Evaluation): Upline: Avg 8 jobs/week (fails requirement). Downline A: Avg 12 jobs/week + highest total (meets requirement) → Downline A becomes new upline in July.
Eligibility Requirement: Consistently meet 10 jobs/week. Must not be outperformed by downline.

20. Cash Out Policy
• Minimum withdrawal amount: $50
• Earnings must be withdrawn within 30 days
• Unclaimed earnings after 30 days will be forfeited
• If account is frozen, remaining balance may be forfeited
Example: Earn $100 but do not withdraw → After 30 days → balance forfeited.
Eligibility Requirement: Withdraw within 30 days. Maintain active account status.

21. Upgrade / Replacement Eligibility
To replace your upline:
• Must consistently achieve minimum 10 deliveries per week
• Must have higher total monthly deliveries than current upline
• Only top-performing riders will be eligible for upgrade
Example: Upline: 40 jobs/month (fails weekly consistency). You: 60 jobs/month + meet weekly requirement → You will take over as upline.
Eligibility Requirement: Weekly consistency (10 jobs/week). Highest monthly performance.

22. Dispute Resolution
All disputes will be reviewed and the final decision will be made by management.

23. System & Adjustment Rights
MoveIt Logistics reserves the right to:
• Adjust, modify, or reverse any transaction affected by system errors
• Update policies, commission structures, and system rules at any time without prior notice`;

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
      ['John Doe', '91234567', '123 Orchard Road Singapore 238858', '#01-01', '456 Marina Bay Sands Singapore 018956', '#05-10', 'Alice Tan', '81234567', '6am-11am', '2026-03-16', 'bike', '15', 'Handle with care'],
      ['Jane Smith', '98765432', '789 Bugis Street Singapore 188067', 'N/A', '321 Tampines Ave 5 Singapore 529651', '#02-15', 'Bob Lee', '92345678', '12pm-5pm', '2026-03-17', 'car', '12', 'Call before delivery'],
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
          parcel_size: job.parcel_size || 'bike',
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
    const filtered = customers.filter((c: any) => 
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
    );
    return filtered.sort((a: any, b: any) => {
      if (customerSort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (customerSort === 'registered_asc') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (customerSort === 'registered_desc') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (customerSort === 'login_asc') return new Date(a.last_login || 0).getTime() - new Date(b.last_login || 0).getTime();
      if (customerSort === 'login_desc') return new Date(b.last_login || 0).getTime() - new Date(a.last_login || 0).getTime();
      return 0;
    });
  }, [customers, customerSearch, customerSort]);

  const paginatedCustomers = useMemo(() => {
    const start = (customerPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, customerPage]);

  const customerTotalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

  // Filter and paginate riders
  const filteredRiders = useMemo(() => {
    const filtered = riders.filter((r: any) => 
      r.name?.toLowerCase().includes(riderSearch.toLowerCase()) ||
      r.email?.toLowerCase().includes(riderSearch.toLowerCase()) ||
      r.phone?.includes(riderSearch) ||
      r.referral_code?.toLowerCase().includes(riderSearch.toLowerCase())
    );
    return filtered.sort((a: any, b: any) => {
      if (riderSort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (riderSort === 'registered_asc') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (riderSort === 'registered_desc') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (riderSort === 'login_asc') return new Date(a.last_login || 0).getTime() - new Date(b.last_login || 0).getTime();
      if (riderSort === 'login_desc') return new Date(b.last_login || 0).getTime() - new Date(a.last_login || 0).getTime();
      if (riderSort === 'tier_asc') return (a.tier || 0) - (b.tier || 0);
      if (riderSort === 'tier_desc') return (b.tier || 0) - (a.tier || 0);
      return 0;
    });
  }, [riders, riderSearch, riderSort]);

  const bonusPeriodCount = useMemo(() => {
    if (auth.type !== 'rider') return 0;
    const now = new Date();
    let pStart: Date;
    let pEnd: Date;
    if (bonusConfig.period === 'daily') {
      pStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      pEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (bonusConfig.period === 'custom' && bonusConfig.startDate && bonusConfig.endDate) {
      pStart = new Date(bonusConfig.startDate);
      pEnd = new Date(bonusConfig.endDate + 'T23:59:59');
    } else {
      const day = now.getDay();
      const mo = day === 0 ? -6 : 1 - day;
      pStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mo);
      pEnd = new Date(pStart.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
    }
    return jobs.filter((j: any) => j.rider_id === auth.id && j.status === 'completed' && new Date(j.updated_at || j.created_at) >= pStart && new Date(j.updated_at || j.created_at) <= pEnd).length;
  }, [auth.type, auth.id, jobs, bonusConfig.period, bonusConfig.startDate, bonusConfig.endDate]);

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
    let cleanPhone = phone.replace(/\D/g, '');
    // Only add 65 for Singapore local numbers (8 digits starting with 8 or 9)
    if (cleanPhone.length === 8 && (cleanPhone.startsWith('8') || cleanPhone.startsWith('9'))) {
      cleanPhone = '65' + cleanPhone;
    }
    // Don't add country code if number already has one (> 8 digits)
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  };

  // Generate reminder message for a job
  const generateReminderMessage = (job: any): string => {
    const stops = job.stops || [];
    const pickupArea = extractAreaName(job.pickup);
    const cachedDist = jobDistanceCache[job.id];
    
    let dropOffSection = '';
    if (stops.length > 0) {
      stops.forEach((stop: any, idx: number) => {
        dropOffSection += `\n📍 Drop-off${stops.length > 1 ? ` ${idx + 1}` : ''}\n`;
        dropOffSection += `${stop.recipientName || 'Recipient'} – ${stop.recipientPhone || 'N/A'}\n`;
        dropOffSection += `${stop.address || ''} ${stop.unitNo || ''}\n`;
      });
    } else {
      dropOffSection = `\n📍 Drop-off\n${job.recipient_name || 'Recipient'} – ${job.recipient_phone || 'N/A'}\n${job.delivery}\n`;
    }

    return `Hi 👋

Reminder for your upcoming delivery:
📦 Order ID: #${job.order_id || 'N/A'}
📅 Date: ${job.delivery_date ? formatDeliveryDate(job.delivery_date) : 'Today'}
🕐 Time Slot: ${job.timeframe || job.delivery_slot || 'N/A'}

🟠 Pickup
${job.pickup_contact || job.customer_name || 'Customer'} – ${job.pickup_phone || job.customer_phone || 'N/A'}
${job.pickup}
${dropOffSection}
🚗 Vehicle: ${job.parcel_size ? job.parcel_size.charAt(0).toUpperCase() + job.parcel_size.slice(1) : 'N/A'}
${cachedDist ? `📏 Distance: ${cachedDist.totalDistance} km\n` : ''}${job.remarks ? `📝 Remarks: ${job.remarks}\n` : ''}
Please be punctual and update once completed. Thanks!`;
  };

  // Send reminder to rider via WhatsApp
  const sendRiderReminder = (job: any) => {
    if (!job.rider_phone) {
      alert('No rider phone number available for this job.');
      return;
    }
    const message = generateReminderMessage(job);
    const url = generateWhatsAppLink(job.rider_phone, message);
    window.open(url, '_blank');
    setRemindersSent(prev => ({ ...prev, [job.id]: true }));
  };

  // Check for jobs approaching pickup time and send auto-reminders
  const checkAutoReminders = () => {
    if (auth.type !== 'admin') return;
    
    const now = new Date();
    const activeJobs = jobs.filter((j: any) => 
      j.status === 'accepted' && j.rider_id && j.rider_phone && !remindersSent[j.id]
    );
    
    activeJobs.forEach((job: any) => {
      if (!job.delivery_date || !job.timeframe) return;
      
      // Parse the delivery slot start time
      let slotHour = 6; // default
      if (job.timeframe?.includes('12pm') || job.timeframe?.includes('12PM')) slotHour = 12;
      else if (job.timeframe?.includes('6pm') || job.timeframe?.includes('6PM')) slotHour = 18;
      else if (job.timeframe?.includes('6am') || job.timeframe?.includes('6AM')) slotHour = 6;
      
      const pickupTime = new Date(job.delivery_date + 'T' + String(slotHour).padStart(2, '0') + ':00:00+08:00');
      const diffMinutes = (pickupTime.getTime() - now.getTime()) / (1000 * 60);
      
      // Send reminder if within 30-60 minutes of pickup time
      if (diffMinutes > 0 && diffMinutes <= 60) {
        // Show browser notification to admin
        showBrowserNotification(
          '⏰ Delivery Reminder',
          `${job.rider_name}'s pickup for ${job.order_id || 'order'} is in ${Math.round(diffMinutes)} minutes`
        );
        setRemindersSent(prev => ({ ...prev, [job.id]: true }));
      }
    });
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

  // Admin role-based permissions
  // - 'admin' (default): full access to all admin tabs and actions
  // - 'staff': limited access - Jobs tab (full edit) + Customers tab (read-only). Used for order-handling staff.
  const adminRole = (auth as any).role || (auth.type === 'admin' ? 'admin' : null);
  const isFullAdmin = auth.type === 'admin' && adminRole === 'admin';
  const isStaff = auth.type === 'admin' && adminRole === 'staff';
  const adminCan = {
    viewJobs: isFullAdmin || isStaff,
    editJobs: isFullAdmin || isStaff,
    viewCustomers: isFullAdmin || isStaff,
    editCustomers: isFullAdmin,            // staff is read-only on customers
    viewRiders: isFullAdmin,
    viewPod: isFullAdmin || isStaff,       // staff can view PODs
    flagPod: isFullAdmin,                  // ...but only admin can flag/unflag them
    viewWithdrawals: isFullAdmin,
    viewReferrals: isFullAdmin,
    viewReports: isFullAdmin,
    viewAudit: isFullAdmin,
    viewSettings: isFullAdmin,
  };

  // Auto-redirect staff away from restricted tabs (e.g. if they had 'riders' cached from a previous session)
  useEffect(() => {
    if (isStaff) {
      const allowedViews = ['jobs', 'customers', 'pod'];
      if (!allowedViews.includes(adminView)) {
        setAdminView('jobs');
      }
    }
  }, [isStaff, adminView]);

  // Multi-job capability: get ALL active jobs for this rider
  const activeJobsList = jobs.filter(j => j.rider_id === auth.id && j.status !== 'completed' && j.status !== 'cancelled');
  // For backwards compatibility, activeJob is the currently selected one or first one
  const activeJob = selectedJobId ? activeJobsList.find(j => j.id === selectedJobId) : activeJobsList[0];

  useEffect(() => { loadData(); loadBonusConfig(); }, []);
  
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
        // Egress optimization: skip polling when the tab is hidden / browser minimized.
        // The user will get a fresh load when they return to the tab via the visibilitychange handler below.
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        loadData();
        checkAutoReminders();
      }, 120000); // 120 seconds (2 minutes)
      // When the tab becomes visible again after being hidden, refresh once immediately
      const onVis = () => {
        if (document.visibilityState === 'visible') {
          loadData();
        }
      };
      document.addEventListener('visibilitychange', onVis);
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', onVis);
      };
    }
  }, [auth.isAuth]);

  useEffect(() => {
    if (auth.type !== 'customer' || !jobPostTime) return;
    const timer = setInterval(() => {
      const elapsed = (Date.now() - jobPostTime) / 1000 / 60;
      if (elapsed >= 8 && boostStage < 2) setBoostStage(2);
      else if (elapsed >= 3 && boostStage < 1) setBoostStage(1);
    }, 15000);
    return () => clearInterval(timer);
  }, [auth.type, jobPostTime, boostStage]);

  // Save bonus config to database
  const saveBonusConfig = async (config: any) => {
    try {
      // Store as audit log entry with special action
      await api('audit_logs', 'POST', {
        action: 'bonus_config_update',
        user_id: auth.id,
        user_type: 'admin',
        details: JSON.stringify(config),
        created_at: new Date().toISOString()
      });
      setBonusConfig(config);
      alert('Bonus configuration saved!');
    } catch (e: any) {
      alert('Failed to save bonus config: ' + e.message);
    }
  };

  // Load bonus config from database
  const loadBonusConfig = async () => {
    try {
      const logs = await api('audit_logs?action=eq.bonus_config_update&order=created_at.desc&limit=1');
      if (logs && logs.length > 0 && logs[0].details) {
        let saved = logs[0].details;
        // Handle double-stringified JSON
        if (typeof saved === 'string') {
          try { saved = JSON.parse(saved); } catch (e) { /* already parsed */ }
        }
        if (typeof saved === 'string') {
          try { saved = JSON.parse(saved); } catch (e) { /* still a string, give up */ }
        }
        if (typeof saved === 'object' && saved !== null) {
          setBonusConfig(prev => ({...prev, ...saved}));
        }
      }
    } catch (e) {
      console.log('No saved bonus config found');
    }
  };

  const loadData = async () => {
    try {
      setError('');
      console.log('[LoadData] Starting to fetch data...');
      console.log('[LoadData] Using Supabase URL:', SUPABASE_URL);
      
      const r = await api('riders?select=*');
      console.log('[LoadData] Riders loaded:', r?.length || 0);
      
      const c = await api('customers?select=*');
      console.log('[LoadData] Customers loaded:', c?.length || 0);
      
      // Egress optimization: exclude heavy pod_image/pod_images/pod_stops base64 columns
      // (averaging 545KB per row). These are lazy-loaded on demand via fetchJobPod().
      // Column list verified against the actual public.jobs schema.
      const jobsColumns = 'id,customer_id,customer_name,customer_phone,rider_id,rider_name,rider_phone,pickup,delivery,timeframe,price,status,commissions,created_at,accepted_at,picked_up_at,on_the_way_at,completed_at,cancelled_at,requires_return,recipient_name,recipient_phone,parcel_size,remarks,pod_timestamp,pod_flagged,pod_flagged_at,created_by_admin,pickup_contact,pickup_phone,stops,total_stops,order_id,delivery_slot,delivery_date,rider_vehicle_type,promo_code,original_price,discount_amount,is_urgent,boost_amount,boosted_at';
      const j = await api(`jobs?select=${jobsColumns}&order=created_at.desc&limit=200`);
      console.log('[LoadData] Jobs loaded:', j?.length || 0);
      
      // Also load audit logs for withdrawal notifications
      const logs = await api('audit_logs?order=timestamp.desc&limit=200');
      console.log('[LoadData] Audit logs loaded:', logs?.length || 0);
      
      // Load all rider locations for admin (to check GPS status)
      const riderLocs = await api('rider_locations?order=updated_at.desc&limit=200');
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
      
      // Egress optimization: pre-fetch POD photos ONLY for the rider's own active jobs
      // (typically 1-2 rows), so the POD upload progress UI still works correctly.
      // All other POD photos are lazy-loaded on demand via fetchJobPod().
      if (auth.type === 'rider' && auth.id && Array.isArray(j)) {
        const myActiveJobs = j.filter((job: any) =>
          job.rider_id === auth.id && job.status !== 'completed' && job.status !== 'cancelled'
        );
        for (const aj of myActiveJobs.slice(0, 5)) {
          try {
            const podData = await api(`jobs?id=eq.${aj.id}&select=pod_image,pod_images,pod_timestamp`);
            const row = Array.isArray(podData) && podData[0] ? podData[0] : null;
            if (row) {
              setPodCache(prev => ({ ...prev, [aj.id]: { pod_image: row.pod_image, pod_images: row.pod_images, pod_timestamp: row.pod_timestamp, loading: false } }));
              // Also merge into the jobs state so existing code reading job.pod_images keeps working
              setJobs(prevJobs => prevJobs.map((pj: any) =>
                pj.id === aj.id ? { ...pj, pod_image: row.pod_image, pod_images: row.pod_images, pod_timestamp: row.pod_timestamp } : pj
              ));
            }
          } catch (e) {
            console.warn('Failed to pre-fetch POD for active job', aj.id);
          }
        }
      }
      
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

  // Lazy-load POD photos for a specific job on demand (not included in polling to save egress).
  // Returns cached data immediately if already fetched.
  const fetchJobPod = async (jobId: string) => {
    if (!jobId) return null;
    if (podCache[jobId] && !podCache[jobId].loading) return podCache[jobId];
    setPodCache(prev => ({ ...prev, [jobId]: { ...(prev[jobId] || {}), loading: true } }));
    try {
      const data = await api(`jobs?id=eq.${jobId}&select=pod_image,pod_images,pod_timestamp`);
      const row = Array.isArray(data) && data[0] ? data[0] : {};
      const entry = { pod_image: row.pod_image, pod_images: row.pod_images, pod_timestamp: row.pod_timestamp, loading: false };
      setPodCache(prev => ({ ...prev, [jobId]: entry }));
      return entry;
    } catch (e) {
      setPodCache(prev => ({ ...prev, [jobId]: { ...(prev[jobId] || {}), loading: false } }));
      return null;
    }
  };

  const handleLogin = async (type: string) => {
    try {
      if (type === 'admin' && loginForm.email === 'admin@delivery.com' && loginForm.password === 'admin123') {
        const authData = { isAuth: true, type: 'admin', role: 'admin', id: 'admin1' };
        setAuth(authData);
        localStorage.setItem('moveit_auth', JSON.stringify(authData)); // Persistent login
        setLoginForm({ email: '', password: '' });
        return;
      }
      // Staff role: limited admin access (Jobs full access + Customers read-only)
      if (type === 'admin' && loginForm.email === 'staff@delivery.com' && loginForm.password === 'staff123') {
        const authData = { isAuth: true, type: 'admin', role: 'staff', id: 'staff1' };
        setAuth(authData);
        localStorage.setItem('moveit_auth', JSON.stringify(authData));
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

  // AI Auto Analysis for delivery orders
  const analyzeWithAI = async () => {
    if (!aiInput.trim() || aiInput.trim().length < 20) {
      alert('Please paste your delivery details (at least 20 characters).');
      return;
    }
    setAiAnalyzing(true);
    setAiResult(null);
    
    try {
      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryDetails: aiInput })
      });
      
      const data = await response.json();
      
      if (data.error) {
        alert('AI analysis failed: ' + data.error);
      } else {
        setAiResult(data);
      }
    } catch (e: any) {
      console.error('AI analysis error:', e);
      alert('AI analysis failed. Please try again or enter details manually.');
    }
    setAiAnalyzing(false);
  };

  // Apply AI result to job form
  const applyAiResult = async () => {
    if (!aiResult) return;
    
    const aiStops = aiResult.stops?.length > 0 ? aiResult.stops.map((s: any) => ({
      address: s.address || '',
      unitNo: s.unitNo || 'N/A',
      recipientName: s.recipientName || '',
      recipientPhone: s.recipientPhone || ''
    })) : [{ address: '', unitNo: '', recipientName: '', recipientPhone: '' }];
    
    // Compute real distance-based price (overrides AI's suggestedPrice which doesn't account for actual geography)
    const priceCalc = await computeDistancePrice(aiResult.pickup || '', aiStops);
    const finalPrice = priceCalc
      ? priceCalc.price.toFixed(2)
      : (aiResult.suggestedPrice?.toString() || (() => { const d = aiResult.stops?.filter((s: any) => s.address).length || 1; return (3 + d * 2.50).toFixed(2); })());
    
    setJobForm({
      ...jobForm,
      pickup: aiResult.pickup || '',
      pickupUnitNo: aiResult.pickupUnitNo || 'N/A',
      pickupContact: aiResult.pickupContact || '',
      pickupPhone: aiResult.pickupPhone || '',
      stops: aiStops,
      parcelSize: (aiResult.vehicleType || aiResult.parcelSize || 'bike'),
      remarks: aiResult.remarks || '',
      price: finalPrice,
      deliveryDate: aiResult.deliveryDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }),
      timeframe: aiResult.deliverySlot || ''
    });
    
    setShowAiInput(false);
    setShowPasteOrder(false);
    setAiInput('');
    alert('All stops assigned to 1 rider. Please review and submit.');
  };

  const applyAiDispatch = async () => {
    if (!aiResult || !aiResult.routePlan?.routes) return;
    if (!curr) return alert('Please log in first');

    const routes = aiResult.routePlan.routes;
    const totalOrders = routes.length;
    const allStops = aiResult.stops || [];
    
    // Calculate distance-based pricing for each route
    let totalPrice = 0;
    const routePrices: number[] = [];
    for (const route of routes) {
      const stopIndices = route.stops || [];
      const routeStops = stopIndices.map((idx: number) => allStops[idx]).filter(Boolean);
      const distResult = await calculateJobDistances(aiResult.pickup || '', routeStops.map((s: any) => ({ address: s.address || '', unitNo: s.unitNo || '' })));
      const dist = distResult?.totalDistance || 0;
      const drops = routeStops.length;
      const price = Math.max(3, 3 + (dist * 0.95) + (drops * 2.50));
      routePrices.push(parseFloat(price.toFixed(2)));
      totalPrice += price;
    }
    totalPrice = parseFloat(totalPrice.toFixed(2));
    
    const freshCust = await api('customers?id=eq.' + curr.id);
    const freshCredits = freshCust && freshCust.length > 0 ? (freshCust[0].credits || 0) : (curr.credits || 0);
    
    if (freshCredits < totalPrice) {
      return alert('Insufficient credits. Total for ' + totalOrders + ' orders: $' + totalPrice.toFixed(2) + '. Your balance: $' + freshCredits.toFixed(2));
    }

    const confirmMsg = 'AI Dispatch will create ' + totalOrders + ' separate orders:' + String.fromCharCode(10) + String.fromCharCode(10) + routes.map((r: any, i: number) => {
      const stopCount = r.stops?.length || 0;
      return (r.driver || 'Driver ' + (i + 1)) + ' - ' + (r.cluster || r.region || 'Cluster ' + (i + 1)) + ' (' + stopCount + ' stops)';
    }).join(String.fromCharCode(10)) + String.fromCharCode(10) + String.fromCharCode(10) + 'Total cost: $' + totalPrice.toFixed(2) + String.fromCharCode(10) + 'Proceed?';

    if (!window.confirm(confirmMsg)) return;

    try {
      let deducted = 0;
      const pickupContactName = useMyProfile ? curr.name : (aiResult.pickupContact || curr.name);
      const pickupContactPhone = useMyProfile ? curr.phone : (aiResult.pickupPhone || curr.phone);
      const deliveryDate = aiResult.deliveryDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
      const timeframe = aiResult.deliverySlot || jobForm.timeframe || '6am-11am';

      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const stopIndices = route.stops || [];
        const routeStops = stopIndices.map((idx: number) => allStops[idx]).filter(Boolean);
        if (routeStops.length === 0) continue;

        const orderPrice = routePrices[i] || (3 + routeStops.length * 2.50);
        const orderId = generateOrderId();
        const deliveryAddresses = routeStops.map((s: any) => (s.address || '') + ' ' + (s.unitNo || '')).join(' -> ');
        const clusterName = route.cluster || route.region || 'Cluster ' + (i + 1);

        await api('jobs', 'POST', {
          order_id: orderId,
          customer_id: curr.id,
          customer_name: curr.name,
          customer_phone: curr.phone,
          pickup: (aiResult.pickup || '') + ' ' + (aiResult.pickupUnitNo || ''),
          pickup_contact: pickupContactName,
          pickup_phone: pickupContactPhone,
          delivery: deliveryAddresses,
          stops: routeStops.map((s: any) => ({ address: s.address || '', unitNo: s.unitNo || 'N/A', recipientName: s.recipientName || '', recipientPhone: s.recipientPhone || '' })),
          total_stops: routeStops.length,
          timeframe: timeframe,
          delivery_slot: timeframe,
          delivery_date: deliveryDate,
          price: orderPrice,
          status: 'posted',
          recipient_name: routeStops[0]?.recipientName || null,
          recipient_phone: routeStops[0]?.recipientPhone || null,
          parcel_size: (aiResult.vehicleType || aiResult.parcelSize || 'bike'),
          remarks: (aiResult.remarks || '') + ' [AI Cluster: ' + clusterName + ']',
          original_price: null,
          discount_amount: null
        });
        deducted += orderPrice;
      }

      await api('customers?id=eq.' + curr.id, 'PATCH', { credits: freshCredits - deducted });
      await loadData();
      setAiResult(null);
      setShowPasteOrder(false);
      setShowAiInput(false);
      setAiInput('');
      alert('AI Dispatch created ' + totalOrders + ' orders successfully!' + String.fromCharCode(10) + 'Total: $' + deducted.toFixed(2) + String.fromCharCode(10) + 'Remaining balance: $' + (freshCredits - deducted).toFixed(2));
    } catch (e: any) {
      alert('Error creating orders: ' + e.message);
    }
  };

  // Validate job form fields before showing T&C
  const validateJobForm = (): boolean => {
    const originalPrice = parseFloat(jobForm.price);
    const minPrice = 3 + (jobForm.stops.length - 1) * 2;
    if (!originalPrice || originalPrice < minPrice) { alert(`Minimum price is $${minPrice} for ${jobForm.stops.length} stop(s)`); return false; }
    if (!jobForm.pickup) { alert('Please fill in pickup location'); return false; }
    if (!jobForm.pickupUnitNo) { alert('Please fill in pickup Unit No (enter "N/A" if not applicable)'); return false; }
    if (!jobForm.stops[0]?.address) { alert('Please fill in at least one drop-off location'); return false; }
    if (!jobForm.parcelSize) { alert('Please select a vehicle type'); return false; }
    if (!jobForm.timeframe) { alert('Please select a delivery time slot'); return false; }
    if (!jobForm.deliveryDate) { alert('Please select a delivery date'); return false; }
    const emptyStops = jobForm.stops.filter(s => !s.address);
    if (emptyStops.length > 0) { alert('Please fill in all drop-off addresses or remove empty stops'); return false; }
    const missingUnitNo = jobForm.stops.filter(s => !s.unitNo);
    if (missingUnitNo.length > 0) { alert('Please fill in Unit No for all drop-off locations (enter "N/A" if not applicable)'); return false; }
    return true;
  };

  const createJob = async () => {
    if (isSubmittingJob) return; // Prevent double-submission
    setIsSubmittingJob(true);
    
    try {
    // Force distance-based price recompute before submission (overrides any stale form price
    // from AI Analyze suggestedPrice or the no-distance fallback)
    const priceCalc = await computeDistancePrice(jobForm.pickup, jobForm.stops);
    if (priceCalc) {
      jobForm.price = priceCalc.price.toFixed(2);
      setFormDistance(priceCalc.distance);
      setJobForm(prev => ({ ...prev, price: priceCalc.price.toFixed(2) }));
    }
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
    if (!jobForm.parcelSize) return alert('Please select a vehicle type');
    if (!jobForm.timeframe) return alert('Please select a delivery time slot');
    if (!jobForm.deliveryDate) return alert('Please select a delivery date');
    
    // Validate all stops have addresses and unit numbers
    const emptyStops = jobForm.stops.filter(s => !s.address);
    if (emptyStops.length > 0) return alert('Please fill in all drop-off addresses or remove empty stops');
    
    const missingUnitNo = jobForm.stops.filter(s => !s.unitNo);
    if (missingUnitNo.length > 0) return alert('Please fill in Unit No for all drop-off locations (enter "N/A" if not applicable)');
    
    // DEDUCT CREDITS FIRST before creating job to prevent race condition
    await api(`customers?id=eq.${curr.id}`, 'PATCH', { credits: freshCredits - price });
    
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
      // Credits already deducted before job creation
      
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
        parcelSize: 'bike', 
        remarks: '' 
      });
      setJobPostTime(Date.now()); setBoostStage(0); alert(`Job posted successfully!\nOrder ID: ${orderId}`);
      loadData();
    } catch (e: any) { 
      // If job creation failed, refund the credits back
      try {
        const refundCust = await api(`customers?id=eq.${curr.id}`);
        const refundCredits = refundCust && refundCust.length > 0 ? (refundCust[0].credits || 0) : 0;
        await api(`customers?id=eq.${curr.id}`, 'PATCH', { credits: refundCredits + price });
      } catch (refundError) {
        console.error('Failed to refund credits:', refundError);
      }
      alert('Error posting job: ' + e.message); 
    }
    } finally {
      setIsSubmittingJob(false);
    }
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">
              {auth.type === 'admin' ? (isStaff ? 'Staff Dashboard' : 'Admin Dashboard') : auth.type === 'customer' ? 'Customer Portal' : 'Rider Portal'}
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
                {adminCan.viewCustomers && <button 
                  onClick={() => setAdminView('customers')} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'customers' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Customers{isStaff && <span className="ml-1 text-xs opacity-75">(view only)</span>}
                </button>}
                {adminCan.viewRiders && <button 
                  onClick={() => setAdminView('riders')} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'riders' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Riders
                </button>}
                {adminCan.viewJobs && <button 
                  onClick={() => setAdminView('jobs')} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'jobs' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Jobs
                </button>}
                {adminCan.viewPod && <button 
                  onClick={() => setAdminView('pod')} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'pod' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  📸 POD{isStaff && <span className="ml-1 text-xs opacity-75">(view only)</span>}
                </button>}
                {adminCan.viewWithdrawals && <button 
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
                </button>}
                {adminCan.viewReferrals && <button 
                  onClick={() => setAdminView('referrals')} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'referrals' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  🌳 Referrals
                </button>}
                {adminCan.viewReports && <button 
                  onClick={() => setAdminView('reports')} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'reports' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  📊 Reports
                </button>}
                {adminCan.viewAudit && <button 
                  onClick={() => { setAdminView('audit'); loadAuditLogs(); }} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'audit' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  📋 Audit
                </button>}
                {adminCan.viewSettings && <button 
                  onClick={() => { setAdminView('settings'); loadPromotions(); }} 
                  className={`px-4 py-2 rounded text-sm font-medium ${adminView === 'settings' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  ⚙️ Settings
                </button>}
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
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
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
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                <button onClick={() => { setShowTopUp(true); setTncAccepted(false); }} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700">
                  <CreditCard size={14} /> <span className="hidden sm:inline">Top Up</span><span className="sm:hidden">+</span> (${(curr.credits || 0).toFixed(2)})
                </button>
                <a href="https://wa.me/6580201980" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600">💬 Contact Us</a>
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
                  
                  {/* Terms & Conditions checkbox */}
                  {topUpAmt && parseFloat(topUpAmt) >= 10 && (
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={tncAccepted} 
                          onChange={(e) => setTncAccepted(e.target.checked)}
                          className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          I have read and understood the{' '}
                          <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); setShowCustomerTnC(true); }}
                            className="text-blue-600 underline hover:text-blue-800 font-medium"
                          >
                            Terms and Conditions
                          </button>
                        </span>
                      </label>
                    </div>
                  )}
                  
                  <button 
                    onClick={async () => {
                      const amt = parseFloat(topUpAmt);
                      if (!amt || amt < 10) {
                        alert('Minimum top-up amount is $10');
                        return;
                      }
                      if (!tncAccepted) {
                        alert('Please tick the checkbox to agree to the Terms and Conditions before making payment.');
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
                          // Store amount for logging after successful payment
                          localStorage.setItem('moveit_pending_topup', JSON.stringify({ amount: amt, timestamp: new Date().toISOString() }));
                          // Use direct navigation - most reliable across all platforms including iOS WebViews
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
                    disabled={!topUpAmt || parseFloat(topUpAmt) < 10 || !tncAccepted}
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

            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Create Delivery ⚡</h3>
                  <p className="text-sm text-gray-500">Fast. Simple. Done.</p>
                </div>
                <button onClick={() => setShowPasteOrder(!showPasteOrder)} className="flex items-center gap-2 px-3 py-2 border border-purple-200 text-purple-700 rounded-xl text-xs font-medium hover:bg-purple-50">📋 Paste order (optional)</button>
              </div>
              {showPasteOrder && (
                <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-purple-800">Paste your order details</p>
                    <button onClick={() => { setShowPasteOrder(false); setAiInput(''); setAiResult(null); }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>
                  <textarea value={aiInput} onChange={(e) => setAiInput(e.target.value)} className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white" rows={3} placeholder='e.g. "Bedok 460456 to Jurong 600123, bike delivery, today 2pm"' />
                  <div className="flex gap-2 mt-2">
                    <button onClick={analyzeWithAI} disabled={aiAnalyzing || aiInput.trim().length < 20} className={`flex-1 py-2 rounded-lg font-semibold text-sm ${aiAnalyzing || aiInput.trim().length < 20 ? 'bg-gray-200 text-gray-400' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>{aiAnalyzing ? 'Analyzing...' : 'Analyze'}</button>
                    <button onClick={() => { setAiInput(''); setAiResult(null); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">Clear</button>
                  </div>
                  {aiResult && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                      <p className="font-semibold text-green-800 text-sm mb-2">AI Result</p>
                      <div className="space-y-1 text-xs">
                        <div className="p-1.5 bg-orange-50 rounded"><span className="text-orange-600 font-medium">Pickup:</span> {aiResult.pickup}</div>
                        {aiResult.stops?.map((stop: any, idx: number) => (<div key={idx} className="p-1.5 bg-green-50 rounded"><span className="text-green-600 font-medium">Drop-off {idx+1}:</span> {stop.address} {stop.region && <span className="text-gray-400">({stop.region})</span>}</div>))}
                        <div className="p-1.5 bg-blue-50 rounded"><span className="text-blue-600 font-medium">Vehicle:</span> <span className="capitalize">{(aiResult.vehicleType || aiResult.parcelSize)}</span></div>
                        {aiResult.remarks && <div className="p-1.5 bg-yellow-50 rounded"><span className="text-yellow-600 font-medium">Remarks:</span> {aiResult.remarks}</div>}
                      </div>

                      {aiResult.routePlan && (
                        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="font-semibold text-purple-800 text-sm mb-2">🗺️ AI Dispatch Analysis</p>
                          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                            <div className="bg-white p-2 rounded">
                              <p className="text-lg font-bold text-purple-700">{aiResult.routePlan.totalStops}</p>
                              <p className="text-xs text-gray-500">Total Stops</p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <p className="text-lg font-bold text-green-600">{aiResult.routePlan.totalDrivers}</p>
                              <p className="text-xs text-gray-500">Recommended Drivers</p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <p className="text-sm font-bold text-blue-600">{typeof aiResult.routePlan.estimatedTime === 'object' ? aiResult.routePlan.estimatedTime.withRecommendedDrivers : aiResult.routePlan.estimatedTime}</p>
                              <p className="text-xs text-gray-500">Est. Completion</p>
                            </div>
                          </div>
                          {typeof aiResult.routePlan.estimatedTime === 'object' && (
                            <div className="bg-white rounded p-2 mb-3 text-xs">
                              <p className="font-medium text-gray-700 mb-1">Completion Time Estimates:</p>
                              <p className="text-green-600">✅ {aiResult.routePlan.totalDrivers} Drivers: {aiResult.routePlan.estimatedTime.withRecommendedDrivers}</p>
                              {aiResult.routePlan.estimatedTime.withFewerDrivers && <p className="text-yellow-600">⚠️ Fewer Drivers: {aiResult.routePlan.estimatedTime.withFewerDrivers}</p>}
                              {aiResult.routePlan.estimatedTime.withOneDriver && <p className="text-red-600">❌ 1 Driver: {aiResult.routePlan.estimatedTime.withOneDriver}</p>}
                            </div>
                          )}
                          <p className="text-xs font-semibold text-purple-700 mb-2">Driver Assignments:</p>
                          {aiResult.routePlan.routes?.map((route: any, idx: number) => (
                            <div key={idx} className="mb-2 p-2 bg-white rounded border border-purple-100">
                              <div className="flex justify-between items-center">
                                <p className="font-semibold text-sm text-gray-700">{route.driver} → {route.cluster || route.region}</p>
                                <span className="text-xs text-gray-500">{route.stopCount || route.stops?.length} stops</span>
                              </div>
                              <p className="text-xs text-gray-500">{route.estimatedDistance} | {route.estimatedTime}</p>
                              {route.stopDetails && (
                                typeof route.stopDetails === 'string'
                                  ? <p className="text-xs text-blue-600 mt-1">{route.stopDetails}</p>
                                  : <div className="mt-1 space-y-0.5">{route.stopDetails.map((detail: string, dIdx: number) => (<p key={dIdx} className="text-xs text-gray-600">• {detail}</p>))}</div>
                              )}
                            </div>
                          ))}
                          {((aiResult.routePlan.alternatives && aiResult.routePlan.alternatives.length > 0) || (aiResult.routePlan.alternativeOptions && aiResult.routePlan.alternativeOptions.length > 0)) && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                              <p className="text-xs font-semibold text-yellow-700 mb-1">Other Options:</p>
                              {(aiResult.routePlan.alternatives || aiResult.routePlan.alternativeOptions || []).map((alt: any, idx: number) => (
                                <p key={idx} className="text-xs text-gray-600">• {alt.drivers} driver{alt.drivers > 1 ? 's' : ''}: {alt.estimatedTime} — {alt.feasibility || alt.note || ''}</p>
                              ))}
                            </div>
                          )}
                          {aiResult.routePlan.reasoning && <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">{aiResult.routePlan.reasoning}</p>}
                        </div>
                      )}

                      {aiResult.analysis && <p className="text-xs text-gray-600 mt-2 italic">{aiResult.analysis}</p>}

                      <div className="mt-4 border-t pt-4">
                        <p className="font-semibold text-gray-800 text-sm mb-1">Choose Dispatch Option</p>
                        <p className="text-xs text-gray-500 mb-3">Select how you would like to assign riders for this delivery.</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="border-2 border-green-500 rounded-lg p-3 text-center bg-green-50 relative">
                            <span className="absolute -top-2 right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">Recommended</span>
                            <p className="text-2xl mb-1">🤖</p>
                            <p className="font-bold text-sm text-gray-800">Follow AI Suggestion</p>
                            <p className="text-xs text-green-700 font-medium">{aiResult.routePlan?.totalDrivers || aiResult.suggestedDrivers || 1} Riders</p>
                            <p className="text-xs text-gray-500 mt-1">Auto-assign stops using AI-optimized clusters.</p>
                            <button onClick={() => {
                              const bal = curr?.credits || 0;
                              const est = parseFloat(aiResult.suggestedPrice) || (3 + (aiResult.stops?.length || 1) * 2.50);
                              if (bal < est) {
                                alert("Insufficient balance. Your balance: $" + bal.toFixed(2) + ". Estimated cost: $" + est.toFixed(2) + ". Please top up first.");
                                return;
                              }
                              applyAiDispatch();
                            }} className="mt-2 w-full py-1.5 bg-green-600 text-white rounded-lg font-semibold text-xs hover:bg-green-700">Use AI Allocation ({aiResult.routePlan?.totalDrivers || aiResult.suggestedDrivers || 1} Riders)</button>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-3 text-center">
                            <p className="text-2xl mb-1">👤</p>
                            <p className="font-bold text-sm text-gray-800">Use 1 Rider</p>
                            <p className="text-xs text-gray-600 font-medium">All {aiResult.stops?.length || 1} Stops</p>
                            <p className="text-xs text-gray-500 mt-1">Assign all stops to a single rider. Longer completion time.</p>
                            <button onClick={() => {
                              const bal = curr?.credits || 0;
                              const est = parseFloat(aiResult.suggestedPrice) || (3 + (aiResult.stops?.length || 1) * 2.50);
                              if (bal < est) {
                                if (!window.confirm("Your balance ($" + bal.toFixed(2) + ") may be insufficient for the estimated price ($" + est.toFixed(2) + "). Continue anyway?")) return;
                              }
                              applyAiResult();
                            }} className="mt-2 w-full py-1.5 bg-orange-500 text-white rounded-lg font-semibold text-xs hover:bg-orange-600">1 Rider for All Stops</button>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-3 text-center">
                            <p className="text-2xl mb-1">✏️</p>
                            <p className="font-bold text-sm text-gray-800">Custom Manual Assign</p>
                            <p className="text-xs text-gray-600 font-medium">Your Own Setup</p>
                            <p className="text-xs text-gray-500 mt-1">Manually choose riders and assign stops as you prefer.</p>
                            <button onClick={() => setAiResult(null)} className="mt-2 w-full py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold text-xs hover:bg-gray-50">Custom Manual Assign</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-2 mb-3"><span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span> Pickup & Drop-off</p>
              <div className="space-y-4">
              {/* Pickup Location */}
                <div className="relative">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-orange-600"></div>
                      <div className="w-0.5 h-full bg-gray-300 min-h-[60px]"></div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pickup Location
                        {lookingUp.pickup && <span className="ml-2 text-xs text-blue-600 font-normal">🔄 Looking up...</span>}
                      </label>
                      <input 
                        type="text" 
                        value={jobForm.pickup} 
                        onChange={async (e) => {
                          const value = e.target.value;
                          setJobForm({...jobForm, pickup: value});
                          // Auto-lookup if user enters exactly 6 digits
                          if (/^\d{6}$/.test(value)) {
                            setLookingUp(prev => ({ ...prev, pickup: true }));
                            const address = await lookupPostalCode(value);
                            setLookingUp(prev => ({ ...prev, pickup: false }));
                            if (address) {
                              setJobForm(prev => {
                                // Only replace if the user hasn't kept typing past the postal code
                                if (/^\d{6}$/.test(prev.pickup)) {
                                  return { ...prev, pickup: address };
                                }
                                return prev;
                              });
                            }
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
                      
                      <div className="mt-2 flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                        <input type="checkbox" checked={useMyProfile} onChange={(e) => { setUseMyProfile(e.target.checked); if (e.target.checked) { setJobForm(prev => ({...prev, pickupContact: curr?.name || '', pickupPhone: curr?.phone || ''})); } else { setJobForm(prev => ({...prev, pickupContact: '', pickupPhone: ''})); } }} className="w-5 h-5 text-blue-600 rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700">Use my profile contact</p>
                          {useMyProfile && <p className="text-xs text-gray-500 truncate">{curr?.name} · {curr?.phone}</p>}
                        </div>
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
                            {lookingUp.stops?.[index] && <span className="ml-2 text-xs text-blue-600 font-normal">🔄 Looking up...</span>}
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
                            newStops[index] = { ...newStops[index], address: value };
                            setJobForm({...jobForm, stops: newStops});
                            // Auto-lookup if user enters exactly 6 digits
                            if (/^\d{6}$/.test(value)) {
                              setLookingUp(prev => ({ ...prev, stops: { ...(prev.stops || {}), [index]: true } }));
                              const address = await lookupPostalCode(value);
                              setLookingUp(prev => ({ ...prev, stops: { ...(prev.stops || {}), [index]: false } }));
                              if (address) {
                                // Use functional update with prev (latest state) so we don't overwrite
                                // any keystrokes the user typed while OneMap was responding.
                                setJobForm(prev => {
                                  const latestStops = [...prev.stops];
                                  // Only replace if the user hasn't kept typing past the postal code
                                  if (latestStops[index] && /^\d{6}$/.test(latestStops[index].address)) {
                                    latestStops[index] = { ...latestStops[index], address };
                                  }
                                  return { ...prev, stops: latestStops };
                                });
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

                <p className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-2 mb-3 mt-4"><span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span> Delivery Date & Time</p>
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
                    Delivery Fee
                  </label>
                  
                <p className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-2 mb-3 mt-4"><span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span> Vehicle Type</p>
                {/* Vehicle Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type <span className="text-red-500">*</span></label>
                  <select 
                    value={jobForm.parcelSize} 
                    onChange={(e) => setJobForm({...jobForm, parcelSize: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bike">🏍️ Bike</option>
                    <option value="car">🚗 Car</option>
                    <option value="van">🚐 Van</option>
                  </select>
                </div>

                  <p className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-2 mb-3 mt-4"><span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span> Price</p>
                  {/* Suggested Pricing Breakdown */}
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold text-blue-800 mb-1"><span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">Recommended</span></p>
                    <p className="text-xs text-gray-500 mb-2">Most jobs matched in 5–10 mins</p>
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">View price breakdown</summary>
                      <div className="mt-2 text-xs text-gray-700 space-y-1 p-2 bg-white rounded">
                        <div className="flex justify-between"><span>Base fee</span><span>$3.00</span></div>
                        {formDistance !== null && (<div className="flex justify-between"><span>Delivery Fee</span><span>${(formDistance * 0.95).toFixed(2)}</span></div>)}
                        <div className="flex justify-between"><span>Drop-off surcharge</span><span>${((jobForm.stops.filter((s: any) => s.address).length || 1) * 2.50).toFixed(2)}</span></div>
                        <div className="flex justify-between pt-1 mt-1 border-t font-bold"><span>Total</span><span>${formDistance !== null ? (3 + (formDistance * 0.95) + ((jobForm.stops.filter((s: any) => s.address).length || 1) * 2.50)).toFixed(2) : (3 + ((jobForm.stops.filter((s: any) => s.address).length || 1) * 2.50)).toFixed(2)}</span></div>
                      </div>
                    </details>
                    {formDistance !== null && (
                      <button type="button" onClick={() => { const drops = jobForm.stops.filter((s: any) => s.address).length || 1; const suggested = 3 + (formDistance * 0.95) + (drops * 2.50); setJobForm({...jobForm, price: suggested.toFixed(2)}); }} className="mt-2 w-full py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700">
                        Use Recommended Price
                      </button>
                    )}
                  </div>
                  
                  <button type="button" onClick={() => { const p = (parseFloat(jobForm.price) || 10) + 2; setJobForm({...jobForm, price: p.toFixed(2)}); }} className="w-full py-2 border-2 border-blue-200 rounded-lg text-center hover:bg-blue-50 mb-3">
                    <p className="text-blue-700 font-bold text-sm">⚡ Boost +$2.00</p>
                    <p className="text-xs text-gray-500">Get driver faster (2–5 mins)</p>
                  </button>
                  <div className="flex items-center justify-center gap-3 sm:gap-4">
                    <button type="button" onClick={() => { const p = Math.max(3, (parseFloat(jobForm.price) || 3) - 1); setJobForm({...jobForm, price: p.toFixed(2)}); }} className="w-9 h-9 rounded-full border-2 border-gray-300 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-100">−</button>
                    <input type="number" value={jobForm.price} onChange={(e) => setJobForm({...jobForm, price: e.target.value})} className="w-24 sm:w-28 text-center text-xl sm:text-2xl font-bold border-0 focus:ring-0 bg-transparent" min="3" step="0.5" />
                    <button type="button" onClick={() => { const p = (parseFloat(jobForm.price) || 3) + 1; setJobForm({...jobForm, price: p.toFixed(2)}); }} className="w-9 h-9 rounded-full border-2 border-gray-300 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-100">+</button>
                  </div>
                </div>
                
                
                <details className="border border-gray-200 rounded-xl overflow-hidden">
                  <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-600 flex items-center gap-2 hover:bg-gray-50 bg-gray-50">🏷️ More options (optional)</summary>
                  <div className="px-4 pb-4 pt-2 space-y-4">
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
                  <div className="flex gap-2 flex-wrap">
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


                    <button type="button" onClick={() => setShowDeliveryPlan(true)} className="w-full bg-blue-50 text-blue-700 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-100 border border-blue-100">📅 Delivery Plan</button>
                    <button type="button" onClick={() => setShowCustomerBulkImport(!showCustomerBulkImport)} className="w-full bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-100 border border-gray-200"><Upload size={16} /> Bulk Import</button>
                  </div>
                </details>

                <button 
                  onClick={createJob} 
                  disabled={isSubmittingJob}
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                    isSubmittingJob 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSubmittingJob ? '⏳ Finding driver...' : (
                    <>Get Driver Now – ${promoDiscount && jobForm.price ? getDiscountedPrice(parseFloat(jobForm.price)).toFixed(2) : jobForm.price} {jobForm.stops.length > 1 ? `(${jobForm.stops.length} stops)` : ''}
                    {promoDiscount && <span className="text-yellow-300 text-sm ml-1">(promo applied)</span>}</>
                  )}
                </button>
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

            {boostStage >= 1 && (
              <div className={`rounded-lg shadow p-4 ${boostStage >= 2 ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
                <p className={`font-bold text-sm ${boostStage >= 2 ? 'text-red-700' : 'text-orange-700'}`}>{boostStage >= 2 ? '🔥 High demand now' : '⚡ No driver accepted yet'}</p>
                <p className="text-xs text-gray-600 my-2">{boostStage >= 2 ? 'Increase price to get matched sooner' : 'Boost +$2 for faster match'}</p>
                <button onClick={async () => { const amt = boostStage >= 2 ? 4 : 2; const pj = jobs.filter((j: any) => j.customer_id === auth.id && j.status === 'posted'); for (const p of pj) { await api(`jobs?id=eq.${p.id}`, 'PATCH', { price: (parseFloat(p.price) || 0) + amt }); } setBoostStage(0); setJobPostTime(null); await loadData(); alert(`Price boosted by $${amt}!`); }} className={`w-full py-2 rounded-lg font-semibold text-sm text-white ${boostStage >= 2 ? 'bg-red-600' : 'bg-orange-500'}`}>{boostStage >= 2 ? 'Increase Price +$4' : 'Boost Price +$2'}</button>
              </div>
            )}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-bold">My Delivery Jobs</h3>
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
                      
                      {/* Rider Info - only show when in progress */}
                      {job.rider_name && (job.status === 'accepted' || job.status === 'picked_up' || job.status === 'in_transit') && (
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
                                  href={`https://wa.me/${job.rider_phone.replace(/\D/g, '').length > 8 ? job.rider_phone.replace(/\D/g, '') : '65' + job.rider_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${job.rider_name},\n\nCustomer: ${curr?.name || ''}\nOrder ID: ${job.order_id || 'N/A'}\nPickup: ${job.pickup}\nDrop-off: ${job.delivery}\n\nThank you!`)}`}
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
                        <div className="mb-3 space-y-2">
                          <button
                            onClick={() => setShowBoostModal(job)}
                            className="w-full py-2 px-3 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
                          >
                            ⚡ Boost Order — Get a Driver Faster
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Cancel this order?\n\nOrder: ${job.order_id || ''}\nAmount: $${parseFloat(job.price).toFixed(2)}\n\nThe amount will be refunded to your wallet.`)) {
                                try {
                                  await api(`jobs?id=eq.${job.id}`, 'PATCH', { status: 'cancelled', cancelled_at: new Date().toISOString() });
                                  // Refund credits
                                  const freshCust = await api(`customers?id=eq.${auth.id}`);
                                  const freshCredits = freshCust && freshCust.length > 0 ? (freshCust[0].credits || 0) : 0;
                                  await api(`customers?id=eq.${auth.id}`, 'PATCH', { credits: freshCredits + parseFloat(job.price) });
                                  await logAuditAction('customer_cancel_order', {
                                    jobId: job.id,
                                    orderId: job.order_id,
                                    refundAmount: parseFloat(job.price),
                                    customerId: auth.id
                                  });
                                  alert(`Order cancelled. $${parseFloat(job.price).toFixed(2)} refunded to your wallet.`);
                                  loadData();
                                } catch (e: any) {
                                  alert('Error cancelling order: ' + e.message);
                                }
                              }
                            }}
                            className="w-full py-2 px-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors"
                          >
                            ✕ Cancel Order
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
                          
                          {/* Lazy-load POD photos on demand to save egress */}
                          {(() => {
                            const cached = podCache[job.id];
                            if (!cached) {
                              return (
                                <button
                                  onClick={() => fetchJobPod(job.id)}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700"
                                >
                                  📷 View Proof of Delivery
                                </button>
                              );
                            }
                            if (cached.loading) {
                              return <p className="text-xs text-gray-500">Loading POD photos...</p>;
                            }
                            const podImages = cached.pod_images;
                            const podImage = cached.pod_image;
                            const podTimestamp = cached.pod_timestamp;
                            if (podImages && Array.isArray(podImages) && podImages.length > 0) {
                              return (
                                <div>
                                  <p className="text-xs text-gray-600 mb-2">Proof of Delivery ({podImages.length} photo{podImages.length > 1 ? 's' : ''}):</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {podImages.map((pod: any, idx: number) => (
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
                              );
                            }
                            if (podImage && !podImage.includes('truncated')) {
                              return (
                                <div>
                                  <p className="text-xs text-gray-600 mb-2">Proof of Delivery:</p>
                                  <img 
                                    src={podImage} 
                                    alt="Proof of Delivery" 
                                    className="w-full max-w-xs rounded-lg border cursor-pointer hover:opacity-90"
                                    onClick={() => setViewingPodImage(podImage)}
                                  />
                                  {podTimestamp && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Delivered: {formatSGT(podTimestamp)}
                                    </p>
                                  )}
                                </div>
                              );
                            }
                            return <p className="text-xs text-gray-500">No POD photo uploaded</p>;
                          })()}
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
          <div className="flex flex-col gap-4 sm:gap-6">
            {curr.status === 'deactivated' && (  /* order-first */
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 text-center">
                <XCircle size={48} className="mx-auto mb-3 text-red-400" />
                <h3 className="text-lg font-bold text-red-700 mb-2">Account Inactive</h3>
                <p className="text-sm text-red-600">Your account is currently inactive. Please contact support.</p>
                <a href="https://wa.me/6580201980" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 text-sm">💬 Contact Support</a>
              </div>
            )}
            {/* === Available Jobs (First Screen) === */}
            {curr.status !== 'deactivated' && (
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold">Available Jobs</h3>
                  {filteredAvailableJobs.length > 0 && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">🔥 High demand</span>}
                </div>
                {!riderIsOnline ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">Go online to see available jobs</p>
                  </div>
                ) : filteredAvailableJobs.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">No jobs available right now</p>
                    <p className="text-xs text-gray-400 mt-1">Stay online — new jobs will appear here</p>
                  </div>
                ) : (
                  <>
                  <details className="mb-3 border border-gray-200 rounded-lg">
                    <summary className="px-3 py-2 cursor-pointer text-sm text-gray-600 flex items-center gap-2 hover:bg-gray-50">🔍 Filter Jobs</summary>
                    <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                      <input type="text" placeholder="Pickup..." value={riderJobFilter.pickup} onChange={(e) => setRiderJobFilter({...riderJobFilter, pickup: e.target.value})} className="px-2 py-1.5 border rounded text-xs" />
                      <input type="text" placeholder="Drop-off..." value={riderJobFilter.dropoff} onChange={(e) => setRiderJobFilter({...riderJobFilter, dropoff: e.target.value})} className="px-2 py-1.5 border rounded text-xs" />
                      <input type="text" placeholder="Customer..." value={riderJobFilter.customer} onChange={(e) => setRiderJobFilter({...riderJobFilter, customer: e.target.value})} className="px-2 py-1.5 border rounded text-xs" />
                    </div>
                  </details>
                  <div className="space-y-2">
                    {filteredAvailableJobs.slice(0, 10).map((job: any) => {
                      const comm = calculateCommissions(job.price, curr.tier, curr.upline_chain || [], job.total_stops || 1);
                      const pickupArea = extractAreaName(job.pickup) || 'Pickup';
                      const stopsList: any[] = Array.isArray(job.stops) && job.stops.length > 0
                        ? job.stops
                        : (job.delivery ? [{ address: job.delivery }] : []);
                      const dropoffAreas = stopsList
                        .map((s: any) => extractAreaName(s.address) || 'Drop-off')
                        .join(' → ');
                      return (
                        <div key={`pv-${job.id}`} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex gap-1 flex-wrap mb-1">
                                {parseFloat(job.price) >= 12 && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">🔥 High demand</span>}
                              </div>
                              <div className="text-xs text-gray-600 space-y-0.5">
                                <p className="break-words"><span className="font-semibold">🟢 Pickup:</span> {pickupArea}</p>
                                <p className="break-words"><span className="font-semibold">🔴 Drop-off:</span> {dropoffAreas || 'Drop-off'}{stopsList.length > 1 && <span className="ml-1 text-gray-500">({stopsList.length} stops)</span>}</p>
                              </div>
                              <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                {job.distance_km && <span>{job.distance_km} km</span>}
                                <span>{job.delivery_date ? new Date(job.delivery_date + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} {job.timeframe || job.delivery_slot ? '• ' + (job.timeframe || job.delivery_slot) : ''}</span>
                                {job.parcel_size && <span className="capitalize">📦 {job.parcel_size}</span>}
                              </div>
                              {job.remarks && <p className="text-xs text-gray-400 italic mt-0.5 break-words">{job.remarks}</p>}
                              <details className="mt-1"><summary className="text-xs text-blue-600 cursor-pointer">View details</summary><div className="mt-1 text-xs bg-gray-50 rounded p-2 space-y-0.5">
                                <p className="break-words"><strong>Route:</strong> {pickupArea} → {dropoffAreas}</p>
                                <p><strong>Vehicle:</strong> <span className="capitalize">{job.parcel_size}</span></p>
                                {job.distance_km && <p><strong>Distance:</strong> {job.distance_km} km</p>}
                                <p><strong>Delivery:</strong> {job.delivery_date} {job.timeframe || job.delivery_slot || ''}</p>
                                {job.remarks && <p className="break-words"><strong>Remark:</strong> {job.remarks}</p>}
                                <p className="text-gray-400 italic mt-1">Full address and contact shown after accepting</p>
                              </div></details>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-2xl font-bold text-green-600">${comm.activeRider.toFixed(2)}</p>
                              {job.distance_km > 0 && <p className="text-xs font-semibold text-blue-600">${(comm.activeRider / job.distance_km).toFixed(2)}/km</p>}
                              <button onClick={() => { setPendingTnCAction({ type: 'accept', jobId: job.id }); setShowRiderTnC(true); setTncAccepted(false); }} className="mt-1 px-5 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700">Accept</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
            )}

            {/* Online/Offline - Part 2 */}
            <div style={{order: 2}}>
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
                <p className="text-xs text-orange-600 mt-2">⚠️ GPS must be enabled to go online and accept jobs</p>
              )}
              {riderIsOnline && <p className="text-xs text-green-600 mt-2">⚡ Stay online to get more jobs and higher priority</p>}
              
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
                      if (autoAcceptEnabled) {
                        setAutoAcceptEnabled(false);
                        alert('🔴 Auto-Accept disabled. You will need to manually accept jobs.');
                      } else {
                        // Show T&C before enabling auto-accept
                        setPendingTnCAction({ type: 'auto_accept' });
                        setShowRiderTnC(true);
                        setTncAccepted(false);
                      }
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
                        onClick={() => { setPendingTnCAction({ type: 'accept', jobId: job.id }); setShowRiderTnC(true); setTncAccepted(false); }}
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
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
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
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
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
                            {delivery.pod_timestamp && (
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
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
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
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
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

            </div>

            {/* Earnings/Performance/Referral - Part 3 */}
            <div style={{order: 3}}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs font-medium text-green-600 uppercase">Earnings</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-700">${(curr.earnings || 0).toFixed(2)}</p>
                  <p className="text-xs text-green-500">{curr.completed_jobs || 0} jobs</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs font-medium text-blue-600 uppercase">{bonusConfig.period === 'daily' ? 'Daily' : bonusConfig.period === 'custom' ? 'Bonus' : 'Weekly'} Target</p>
                  {(bonusConfig.method === 'earnings' || bonusConfig.method === 'both') && bonusConfig.earningsTarget > 0 ? (
                    <>
                      <p className="text-lg font-bold text-blue-700">${(curr.earnings || 0).toFixed(0)}<span className="text-xs font-normal text-blue-400">/${bonusConfig.earningsTarget}</span></p>
                      <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1"><div className="bg-blue-600 h-1.5 rounded-full" style={{width: `${Math.min(100, ((curr.earnings || 0) / bonusConfig.earningsTarget) * 100)}%`}}></div></div>
                      <p className="text-xs mt-1">{(curr.earnings || 0) >= bonusConfig.earningsTarget ? <span className="text-green-600 font-semibold">🎉 +${bonusConfig.earningsBonus} Bonus!</span> : <span className="text-blue-500">${(bonusConfig.earningsTarget - (curr.earnings || 0)).toFixed(0)} to go</span>}</p>
                    </>
                  ) : (bonusConfig.method === 'orders') && bonusConfig.ordersTarget > 0 ? (
                    <>
                      <p className="text-lg font-bold text-blue-700">{bonusPeriodCount}<span className="text-xs font-normal text-blue-400">/{bonusConfig.ordersTarget}</span></p>
                      <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1"><div className="bg-blue-600 h-1.5 rounded-full" style={{width: `${Math.min(100, ((bonusPeriodCount) / Math.max(bonusConfig.ordersTarget, 1)) * 100)}%`}}></div></div>
                      <p className="text-xs mt-1">{bonusPeriodCount >= bonusConfig.ordersTarget ? <span className="text-green-600 font-semibold">🎉 +${bonusConfig.ordersBonus} Bonus!</span> : <span className="text-blue-500">{bonusConfig.ordersTarget - bonusPeriodCount} orders to go</span>}</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 mt-2">No target set</p>
                  )}
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-xs font-medium text-purple-600 uppercase">Referral</p>
                  <p className="text-lg font-bold text-purple-700">{curr.referral_code}</p>
                  <p className="text-xs text-purple-500">Share to earn!</p>
                </div>
              </div>
              {getActiveJobsForRider.length > 0 && (
                <div className="mt-3 bg-yellow-50 rounded-xl p-3 flex justify-between items-center">
                  <div><p className="text-xs font-medium text-yellow-600 uppercase">Active Jobs</p><p className="text-lg font-bold text-yellow-700">{getActiveJobsForRider.length} in progress</p></div>
                  <Package size={24} className="text-yellow-400" />
                </div>
              )}
            </div>

            {/* Earnings & Bonus Progress */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-800">Earnings & Bonus</h4>

              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600">Total Earnings</p>
                  <p className="text-xl font-bold text-green-700">${(curr.earnings || 0).toFixed(2)}</p>
                  <p className="text-xs text-green-500">{curr.completed_jobs || 0} jobs</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600">Orders in Bonus Period</p>
                  <p className="text-lg font-bold text-blue-700">{bonusPeriodCount} / {bonusConfig.ordersTarget}</p>
                  <p className="text-xs text-blue-500">{bonusPeriodCount >= bonusConfig.ordersTarget ? '🎉 Bonus earned!' : `${bonusConfig.ordersTarget - bonusPeriodCount} more to get $${bonusConfig.ordersBonus}`}</p>
                  <p className="text-sm text-blue-700 font-semibold mt-1">{(() => {
                    const now = new Date();
                    const fmt = (d: Date) => d.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });
                    if (bonusConfig.period === 'daily') return fmt(now);
                    if (bonusConfig.period === 'custom' && bonusConfig.startDate && bonusConfig.endDate) return fmt(new Date(bonusConfig.startDate)) + ' to ' + fmt(new Date(bonusConfig.endDate));
                    const day = now.getDay();
                    const mo = day === 0 ? -6 : 1 - day;
                    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mo);
                    const sun = new Date(mon.getTime() + 6 * 24 * 60 * 60 * 1000);
                    return fmt(mon) + ' to ' + fmt(sun);
                  })()}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: `${Math.min(100, ((bonusPeriodCount) / Math.max(bonusConfig.ordersTarget, 1)) * 100)}%`}}></div>
              </div>
              <p className="text-sm text-gray-700 font-medium">🎁 {bonusConfig.ordersTarget} orders → ${bonusConfig.ordersBonus} bonus</p>
            </div>

            {/* Withdrawal moved to Earnings page */}
            {showRiderPerformance && (
            <>
            {showRiderPerformance && (
            <>
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

            </>
            )}

            </>
            )}

            {/* Active Jobs - Grouped by TODAY and UPCOMING */}
            {activeJobsList.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
                <h4 className="font-bold text-gray-800 mb-3">📋 Your Active Jobs ({activeJobsList.length})</h4>
                {(() => {
                  const todaySGT = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
                  const todayDisplay = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Singapore', day: '2-digit', month: 'short', year: 'numeric' });
                  
                  const todayJobs = activeJobsList.filter((j: any) => j.delivery_date === todaySGT || !j.delivery_date);
                  const upcomingJobs = activeJobsList.filter((j: any) => j.delivery_date && j.delivery_date > todaySGT);
                  const pastJobs = activeJobsList.filter((j: any) => j.delivery_date && j.delivery_date < todaySGT);
                  
                  // Extract pickup time from remarks
                  const getPickupTime = (remarks: string): string => {
                    if (!remarks) return '';
                    const match = remarks.match(/pick\s*up\s*(?:at\s*)?(\d{1,2}[.:]\d{0,2}\s*(?:am|pm|AM|PM)?|\d{1,2}\s*(?:am|pm|AM|PM))/i);
                    return match ? `Pickup: ${match[1]}` : '';
                  };
                  
                  return (
                    <div className="space-y-4">
                      {/* Today's Jobs */}
                      {todayJobs.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full inline-block mb-2">
                            📅 TODAY ({todayDisplay})
                          </p>
                          <div className="space-y-2">
                            {todayJobs.map((job: any) => {
                              const comm = calculateCommissions(job.price, curr.tier, curr.upline_chain || [], job.total_stops || 1);
                              const pickupTime = getPickupTime(job.remarks);
                              return (
                                <div 
                                  key={job.id}
                                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                    (selectedJobId === job.id || (!selectedJobId && activeJobsList[0]?.id === job.id))
                                      ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                                  }`}
                                  onClick={() => setSelectedJobId(job.id)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-semibold text-sm">{extractAreaName(job.pickup)} → {extractAreaName(job.delivery)}</p>
                                      <p className="text-xs text-gray-500">
                                        {job.timeframe || job.delivery_slot || ''}
                                        {pickupTime && ` • ${pickupTime}`}
                                      </p>
                                      <p className="text-xs text-gray-400">{job.status?.toUpperCase()}</p>
                                    </div>
                                    <span className="text-lg font-bold text-green-600">${comm.activeRider.toFixed(2)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Upcoming Jobs */}
                      {upcomingJobs.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full inline-block mb-2">
                            📆 UPCOMING
                          </p>
                          <div className="space-y-2">
                            {upcomingJobs
                              .sort((a: any, b: any) => (a.delivery_date || '').localeCompare(b.delivery_date || ''))
                              .map((job: any) => {
                              const comm = calculateCommissions(job.price, curr.tier, curr.upline_chain || [], job.total_stops || 1);
                              const pickupTime = getPickupTime(job.remarks);
                              const dateDisplay = job.delivery_date ? new Date(job.delivery_date + 'T00:00:00+08:00').toLocaleDateString('en-GB', { timeZone: 'Asia/Singapore', day: '2-digit', month: 'short' }) : '';
                              return (
                                <div 
                                  key={job.id}
                                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                    selectedJobId === job.id
                                      ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                                  }`}
                                  onClick={() => setSelectedJobId(job.id)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-blue-600">{dateDisplay} ({job.timeframe || job.delivery_slot || ''})</p>
                                      <p className="font-semibold text-sm">{extractAreaName(job.pickup)} → {extractAreaName(job.delivery)}</p>
                                      {pickupTime && <p className="text-xs text-gray-500">{pickupTime}</p>}
                                      <p className="text-xs text-gray-400">{job.status?.toUpperCase()}</p>
                                    </div>
                                    <span className="text-lg font-bold text-green-600">${comm.activeRider.toFixed(2)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Past (overdue) Jobs */}
                      {pastJobs.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full inline-block mb-2">
                            ⚠️ OVERDUE
                          </p>
                          <div className="space-y-2">
                            {pastJobs.map((job: any) => {
                              const comm = calculateCommissions(job.price, curr.tier, curr.upline_chain || [], job.total_stops || 1);
                              const dateDisplay = job.delivery_date ? formatDeliveryDate(job.delivery_date) : '';
                              return (
                                <div 
                                  key={job.id}
                                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors border-red-300 bg-red-50 hover:border-red-400`}
                                  onClick={() => setSelectedJobId(job.id)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-red-600">{dateDisplay} ({job.timeframe || ''})</p>
                                      <p className="font-semibold text-sm">{extractAreaName(job.pickup)} → {extractAreaName(job.delivery)}</p>
                                      <p className="text-xs text-red-400">{job.status?.toUpperCase()}</p>
                                    </div>
                                    <span className="text-lg font-bold text-green-600">${comm.activeRider.toFixed(2)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {activeJob && (
              <div className="bg-white rounded-lg shadow-xl p-4 border-2 border-blue-500">
                {/* Pickup Time Reminder */}
                {activeJob.delivery_date && activeJob.timeframe && (() => {
                  const now = new Date();
                  let slotHour = 6;
                  if (activeJob.timeframe?.includes('12pm') || activeJob.timeframe?.includes('12PM')) slotHour = 12;
                  else if (activeJob.timeframe?.includes('6pm') || activeJob.timeframe?.includes('6PM')) slotHour = 18;
                  const pickupTime = new Date(activeJob.delivery_date + 'T' + String(slotHour).padStart(2, '0') + ':00:00+08:00');
                  const diffMinutes = (pickupTime.getTime() - now.getTime()) / (1000 * 60);
                  
                  if (diffMinutes > 0 && diffMinutes <= 60) {
                    return (
                      <div className="mb-3 p-3 bg-red-50 border-2 border-red-300 rounded-lg animate-pulse">
                        <p className="text-sm font-bold text-red-700">⏰ Pickup time is in {Math.round(diffMinutes)} minutes!</p>
                        <p className="text-xs text-red-600">Please head to the pickup location now.</p>
                      </div>
                    );
                  } else if (diffMinutes <= 0 && diffMinutes > -120) {
                    return (
                      <div className="mb-3 p-3 bg-orange-50 border-2 border-orange-300 rounded-lg">
                        <p className="text-sm font-bold text-orange-700">⚠️ Pickup time has passed ({Math.abs(Math.round(diffMinutes))} min ago)</p>
                        <p className="text-xs text-orange-600">Please update the status or contact the customer.</p>
                      </div>
                    );
                  }
                  return null;
                })()}
                
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
                            {(activeJob.stops?.length || 1) <= 1 && (
                              <button 
                                onClick={() => submitPodAndComplete(activeJob.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                              >
                                ✓ Submit & Complete
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

            {/* Available Jobs - Part 1: Top */}
            {curr.status !== 'deactivated' && (
            <div style={{order: 1}}>
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h3 className="text-xl sm:text-2xl font-bold mb-4">Available Jobs</h3>
              
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
                      {filteredAvailableJobs.length > 0 && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">🔥 High demand</span>}
                    </div>
                    
                    {filteredAvailableJobs.map((job: any) => {
                      const comm = calculateCommissions(job.price, curr.tier, curr.upline_chain || [], job.total_stops || 1);
                      const isSelected = selectedJobsForAccept.includes(job.id);
                      const pickupArea = extractAreaName(job.pickup) || 'Pickup';
                      const stopsList: any[] = Array.isArray(job.stops) && job.stops.length > 0
                        ? job.stops
                        : (job.delivery ? [{ address: job.delivery }] : []);
                      const dropoffAreas = stopsList
                        .map((s: any) => extractAreaName(s.address) || 'Drop-off')
                        .join(' → ');
                      return (
                        <div 
                          key={job.id} 
                          className="border rounded-lg p-3 transition-all border-gray-200 hover:border-green-400 hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            
                            <div className="flex-1 min-w-0">
                              <div className="mb-2 space-y-0.5">
                                <p className="text-sm text-gray-700 break-words"><span className="font-semibold">🟢 Pickup:</span> {pickupArea}</p>
                                <p className="text-sm text-gray-700 break-words"><span className="font-semibold">🔴 Drop-off:</span> {dropoffAreas || 'Drop-off'}{stopsList.length > 1 && <span className="ml-1 text-gray-500 text-xs">({stopsList.length} stops)</span>}</p>
                              </div>
                              <div className="mb-1">
                                <div className="flex gap-3 text-xs text-gray-500">
                                  {job.delivery_date && <span>📅 {new Date(job.delivery_date + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                                  {job.timeframe && <span>🕐 {job.timeframe}</span>}
                                </div>
                                {job.remarks && <p className="text-xs text-gray-400 italic mt-1 break-words">{job.remarks}</p>}
                              </div>
                              <details className="mt-1"><summary className="text-xs text-blue-600 cursor-pointer">View details</summary><div className="mt-1 text-xs bg-gray-50 rounded p-2 space-y-0.5">
                                <p className="break-words"><strong>Route:</strong> {pickupArea} → {dropoffAreas}</p>
                                <p><strong>Vehicle:</strong> <span className="capitalize">{job.parcel_size}</span></p>
                                {job.distance_km && <p><strong>Distance:</strong> {job.distance_km} km</p>}
                                <p><strong>Delivery:</strong> {job.delivery_date} {job.timeframe || ''}</p>
                                {job.remarks && <p className="break-words"><strong>Remark:</strong> {job.remarks}</p>}
                                <p className="text-gray-400 italic mt-1">Full address and contact shown after accepting</p>
                              </div></details>
                            </div>
                            <div className="text-right">
                              <p className="text-xl sm:text-2xl font-bold text-green-600">${comm.activeRider.toFixed(2)}</p>
                              {job.distance_km && job.distance_km > 0 && <p className="text-xs text-gray-500">{job.distance_km} km</p>}
                              {job.distance_km && job.distance_km > 0 && <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold ${(comm.activeRider / job.distance_km) >= 2 ? 'bg-green-100 text-green-700' : (comm.activeRider / job.distance_km) >= 1.2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{(comm.activeRider / job.distance_km) >= 2 ? 'High earning' : (comm.activeRider / job.distance_km) >= 1.2 ? 'Good deal' : 'Low value'}</span>}
                              {parseFloat(job.price) >= 12 && <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 mt-1">🔥 High Demand</span>}
                              {job.price_increased && <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 mt-1 ml-1">⚡ Boosted</span>}
                              <button onClick={(e) => { e.stopPropagation(); setPendingTnCAction({ type: 'accept', jobId: job.id }); setShowRiderTnC(true); setTncAccepted(false); }} className="mt-2 w-full py-2.5 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700">Accept</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    

                  </div>
                )}
                </>
              )}
            </div>
            </div>
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
                  <select value={customerSort} onChange={(e) => { setCustomerSort(e.target.value); setCustomerPage(1); }} className="px-3 py-1.5 border rounded-lg text-sm">
                    <option value="name">Sort by Name</option>
                    <option value="registered_desc">Registered (Newest)</option>
                    <option value="registered_asc">Registered (Oldest)</option>
                    <option value="login_desc">Last Login (Recent)</option>
                    <option value="login_asc">Last Login (Oldest)</option>
                  </select>
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
                            <p className="text-sm font-bold text-green-600 mt-1 cursor-pointer hover:underline" onClick={() => { setShowCustomerWallet(c); setWalletDateFrom(""); setWalletDateTo(""); }}>
                              Credits: ${(c.credits || 0).toFixed(2)} 👁️
                            </p>
                            <p className="text-xs text-gray-400 mt-1">📅 Registered: {c.created_at ? formatSGT(c.created_at) : 'N/A'}</p>
                            <p className="text-xs text-gray-400">🕐 Last Login: {c.last_login ? formatSGT(c.last_login) : 'Never'}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setShowCustomerWallet(c)} className="p-2 bg-green-100 rounded hover:bg-green-200" title="View Wallet"><CreditCard size={18} /></button>
                            {adminCan.editCustomers && <button onClick={() => setEditCust({...c, password: ''})} className="p-2 bg-blue-100 rounded hover:bg-blue-200" title="Edit"><Edit2 size={18} /></button>}
                            {adminCan.editCustomers && <button onClick={async () => { if (window.confirm('Delete customer?')) { await api(`customers?id=eq.${c.id}`, 'DELETE'); loadData(); }}} className="p-2 bg-red-100 rounded hover:bg-red-200" title="Delete"><Trash2 size={18} /></button>}
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
                  <select value={riderSort} onChange={(e) => { setRiderSort(e.target.value); setRiderPage(1); }} className="px-3 py-1.5 border rounded-lg text-sm">
                    <option value="name">Sort by Name</option>
                    <option value="registered_desc">Registered (Newest)</option>
                    <option value="registered_asc">Registered (Oldest)</option>
                    <option value="login_desc">Last Login (Recent)</option>
                    <option value="login_asc">Last Login (Oldest)</option>
                    <option value="tier_desc">Tier (Highest)</option>
                    <option value="tier_asc">Tier (Lowest)</option>
                  </select>
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
                            <p className="font-semibold text-lg">{r.name} - Tier {r.tier} <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'deactivated' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.status === 'deactivated' ? 'Inactive' : 'Active'}</span></p>
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
                            <button onClick={async () => { const ns = r.status === 'deactivated' ? 'active' : 'deactivated'; const reason = prompt(`${ns === 'deactivated' ? 'Deactivate' : 'Activate'} ${r.name}? Reason:`); if (reason !== null) { await api(`riders?id=eq.${r.id}`, 'PATCH', { status: ns }); await logAuditAction('rider_status_change', { riderId: r.id, riderName: r.name, newStatus: ns, reason }); await loadData(); } }} className={`p-2 rounded text-xs font-semibold ${r.status === 'deactivated' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status === 'deactivated' ? '✅' : '⏸️'}</button>
                            <button onClick={() => { setShowRiderEarnings(r); setRiderEarnFrom(""); setRiderEarnTo(""); }} className="p-2 bg-green-100 rounded hover:bg-green-200" title="Earnings"><CreditCard size={18} /></button>
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

            {adminView === 'riders' && (
              <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h4 className="text-lg font-bold mb-4">🎯 Bonus Configuration</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Bonus Period</label><select value={bonusConfig.period} onChange={(e) => setBonusConfig({...bonusConfig, period: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="custom">Custom Date Range</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Bonus Method</label><select value={bonusConfig.method} onChange={(e) => setBonusConfig({...bonusConfig, method: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="earnings">Earnings Only</option><option value="orders">Orders Only</option><option value="both">Both</option></select></div>
                </div>
                {bonusConfig.period === 'custom' && (<div className="grid grid-cols-2 gap-4 mb-4"><div><label className="block text-xs text-gray-600 mb-1">Start</label><input type="date" value={bonusConfig.startDate} onChange={(e) => setBonusConfig({...bonusConfig, startDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-xs text-gray-600 mb-1">End</label><input type="date" value={bonusConfig.endDate} onChange={(e) => setBonusConfig({...bonusConfig, endDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div></div>)}
                <div className="grid grid-cols-2 gap-4">
                  {(bonusConfig.method === 'earnings' || bonusConfig.method === 'both') && (<div className="p-4 bg-blue-50 rounded-lg"><p className="text-sm font-semibold text-blue-800 mb-2">Earnings Target</p><div className="flex gap-2 items-center flex-wrap"><span className="text-sm">Earn $</span><input type="number" value={bonusConfig.earningsTarget} onChange={(e) => setBonusConfig({...bonusConfig, earningsTarget: parseInt(e.target.value) || 0})} className="w-20 px-2 py-1 border rounded text-sm" /><span className="text-sm">→ +$</span><input type="number" value={bonusConfig.earningsBonus} onChange={(e) => setBonusConfig({...bonusConfig, earningsBonus: parseInt(e.target.value) || 0})} className="w-16 px-2 py-1 border rounded text-sm" /><span className="text-sm">bonus</span></div></div>)}
                  {(bonusConfig.method === 'orders' || bonusConfig.method === 'both') && (<div className="p-4 bg-green-50 rounded-lg"><p className="text-sm font-semibold text-green-800 mb-2">Orders Target</p><div className="flex gap-2 items-center flex-wrap"><span className="text-sm">Complete</span><input type="number" value={bonusConfig.ordersTarget} onChange={(e) => setBonusConfig({...bonusConfig, ordersTarget: parseInt(e.target.value) || 0})} className="w-16 px-2 py-1 border rounded text-sm" /><span className="text-sm">orders → +$</span><input type="number" value={bonusConfig.ordersBonus} onChange={(e) => setBonusConfig({...bonusConfig, ordersBonus: parseInt(e.target.value) || 0})} className="w-16 px-2 py-1 border rounded text-sm" /><span className="text-sm">bonus</span></div></div>)}
                </div>
                <button 
                  onClick={() => saveBonusConfig(bonusConfig)}
                  className="mt-4 w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700"
                >
                  💾 Save Bonus Configuration
                </button>
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
                      onClick={() => {
                        const acceptedJobs = jobs.filter((j: any) => 
                          j.status === 'accepted' && j.rider_id && j.rider_phone && !remindersSent[j.id]
                        );
                        if (acceptedJobs.length === 0) {
                          alert('No pending reminders to send. All accepted jobs have already been reminded or have no rider assigned.');
                          return;
                        }
                        if (window.confirm(`Send reminders to ${acceptedJobs.length} rider(s) for accepted jobs?\n\nThis will open WhatsApp for each rider.`)) {
                          acceptedJobs.forEach((j: any, idx: number) => {
                            setTimeout(() => sendRiderReminder(j), idx * 1500);
                          });
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 text-sm font-medium"
                    >
                      <Clock size={16} /> Bulk Remind
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
                            {/* Rematch - Remove rider and push back to available pool */}
                            {j.rider_id && j.status === 'accepted' && (
                              <button 
                                onClick={async () => {
                                  if (window.confirm(`Rematch this order?\n\nThis will:\n• Remove ${j.rider_name || 'current rider'} from this job\n• Push the order back to the available pool\n• Notify all nearby riders\n\nProceed?`)) {
                                    try {
                                      await api(`jobs?id=eq.${j.id}`, 'PATCH', { 
                                        status: 'posted', 
                                        rider_id: null, 
                                        rider_name: null, 
                                        rider_phone: null, 
                                        rider_vehicle_type: null,
                                        accepted_at: null 
                                      });
                                      await logAuditAction('admin_rematch_order', {
                                        jobId: j.id,
                                        orderId: j.order_id,
                                        previousRider: j.rider_name,
                                        previousRiderPhone: j.rider_phone,
                                        reason: 'Admin rematching'
                                      });
                                      alert(`Order ${j.order_id || ''} has been rematched.\n\n${j.rider_name} has been removed and the order is now available for other riders.`);
                                      loadData();
                                    } catch (e: any) {
                                      alert('Error rematching: ' + e.message);
                                    }
                                  }
                                }}
                                className="p-2 bg-orange-100 rounded hover:bg-orange-200 flex items-center gap-1 text-xs text-orange-700" 
                                title="Remove rider and push back to pool"
                              >
                                <RefreshCw size={16} /> Rematch
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
                            {/* Send Reminder Button - for accepted jobs with rider */}
                            {j.rider_id && j.rider_phone && j.status !== 'completed' && j.status !== 'cancelled' && (
                              <button 
                                onClick={() => sendRiderReminder(j)}
                                className={`p-2 rounded flex items-center gap-1 text-xs ${
                                  remindersSent[j.id] 
                                    ? 'bg-gray-100 text-gray-500' 
                                    : 'bg-teal-100 hover:bg-teal-200 text-teal-700'
                                }`}
                                title={remindersSent[j.id] ? 'Reminder already sent' : 'Send Reminder via WhatsApp'}
                              >
                                <Clock size={16} /> {remindersSent[j.id] ? 'Sent' : 'Remind'}
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
                            onClick={async () => {
                              // Egress optimization: POD photos aren't in the polled jobs list — fetch on demand
                              const pod = await fetchJobPod(job.id);
                              setSelectedPodJob({ ...job, pod_image: pod?.pod_image, pod_images: pod?.pod_images, pod_timestamp: pod?.pod_timestamp || job.pod_timestamp });
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                          >
                            View POD
                          </button>
                          {!job.pod_flagged && adminCan.flagPod && (
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
                
                <details className="mb-4 border border-blue-200 rounded-lg">
                  <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-blue-700 hover:bg-blue-50">+ Add Rider Withdrawal</summary>
                  <div className="px-4 pb-4 pt-2 space-y-3">
                    <select id="admin-wd-rider" className="w-full px-3 py-2 border rounded-lg text-sm" onChange={(e) => {
                      const r = riders.find((x: any) => x.id === e.target.value);
                      if (r) {
                        const nameEl = document.getElementById("admin-wd-fullname") as HTMLInputElement;
                        const mobileEl = document.getElementById("admin-wd-mobile") as HTMLInputElement;
                        if (nameEl) nameEl.value = r.name || "";
                        if (mobileEl) mobileEl.value = r.phone || "";
                      }
                    }}>
                      <option value="">Select Rider</option>
                      {riders.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name} - ${(r.earnings || 0).toFixed(2)} | {r.phone}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" id="admin-wd-amount" placeholder="Amount ($)" className="px-3 py-2 border rounded-lg text-sm" min="0.01" step="0.01" />
                      <select id="admin-wd-method" className="px-3 py-2 border rounded-lg text-sm">
                        <option value="paynow">PayNow</option>
                        <option value="bank">Bank Transfer</option>
                      </select>
                    </div>
                    <input type="text" id="admin-wd-fullname" placeholder="Full Name" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" id="admin-wd-mobile" placeholder="Mobile Number" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    <select id="admin-wd-bank" className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="">Select Bank</option>
                      <option value="DBS">DBS</option>
                      <option value="OCBC">OCBC</option>
                      <option value="UOB">UOB</option>
                      <option value="Standard Chartered">Standard Chartered</option>
                      <option value="HSBC">HSBC</option>
                      <option value="Maybank">Maybank</option>
                      <option value="CIMB">CIMB</option>
                      <option value="Citibank">Citibank</option>
                      <option value="Bank of China">Bank of China</option>
                      <option value="RHB">RHB</option>
                    </select>
                    <input type="text" id="admin-wd-paynow" placeholder="PayNow / Account No" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    <button onClick={async () => {
                      const riderEl = document.getElementById("admin-wd-rider") as HTMLSelectElement;
                      const amtEl = document.getElementById("admin-wd-amount") as HTMLInputElement;
                      const methodEl = document.getElementById("admin-wd-method") as HTMLSelectElement;
                      const nameEl = document.getElementById("admin-wd-fullname") as HTMLInputElement;
                      const mobileEl = document.getElementById("admin-wd-mobile") as HTMLInputElement;
                      const bankEl = document.getElementById("admin-wd-bank") as HTMLSelectElement;
                      const acctEl = document.getElementById("admin-wd-paynow") as HTMLInputElement;
                      const riderId = riderEl?.value;
                      const amt = parseFloat(amtEl?.value || "0");
                      const method = methodEl?.value || "paynow";
                      const fullName = nameEl?.value || "";
                      const mobile = mobileEl?.value || "";
                      const bank = bankEl?.value || "";
                      const acctNo = acctEl?.value || "";
                      if (!riderId) return alert("Please select a rider");
                      if (amt <= 0) return alert("Please enter a valid amount");
                      if (!fullName) return alert("Please enter full name");
                      if (!mobile) return alert("Please enter mobile number");
                      if (!bank) return alert("Please select a bank");
                      if (!acctNo) return alert("Please enter PayNow/Account number");
                      const rider = riders.find((r: any) => r.id === riderId);
                      if (!rider) return alert("Rider not found");
                      if (!window.confirm("Add withdrawal request for " + rider.name + " - $" + amt.toFixed(2) + "?")) return;
                      try {
                        const newEarnings = (rider.earnings || 0) - amt;
                        await api("riders?id=eq." + riderId, "PATCH", { earnings: newEarnings });
                        await api("audit_logs", "POST", {
                          action: "withdrawal_request",
                          user_id: riderId,
                          user_type: "admin",
                          details: JSON.stringify({
                            riderId: riderId,
                            riderName: rider.name,
                            riderPhone: rider.phone,
                            amount: amt,
                            withdrawMethod: method,
                            fullName: fullName,
                            mobileNumber: mobile,
                            bankName: bank,
                            paynowNo: method === "paynow" ? acctNo : null,
                            bankAccountNo: method === "bank" ? acctNo : null,
                            status: "pending",
                            requestedAt: new Date().toISOString(),
                            addedByAdmin: true
                          }),
                          timestamp: new Date().toISOString()
                        });
                        amtEl.value = "";
                        nameEl.value = "";
                        mobileEl.value = "";
                        acctEl.value = "";
                        await loadData();
                        await loadWithdrawalRequests();
                        alert("Withdrawal request added for " + rider.name + " - $" + amt.toFixed(2));
                      } catch (e: any) { alert("Error: " + e.message); }
                    }} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700">Add Withdrawal Request</button>
                    <button onClick={() => {
                      const ids = ["admin-wd-rider", "admin-wd-amount", "admin-wd-fullname", "admin-wd-mobile", "admin-wd-paynow"];
                      ids.forEach((id) => { const el = document.getElementById(id) as HTMLInputElement; if (el) el.value = ""; });
                      const selects = ["admin-wd-method", "admin-wd-bank"];
                      selects.forEach((id) => { const el = document.getElementById(id) as HTMLSelectElement; if (el) el.selectedIndex = 0; });
                      const riderEl = document.getElementById("admin-wd-rider") as HTMLSelectElement; if (riderEl) riderEl.selectedIndex = 0;
                    }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Clear</button>
                    <p className="text-xs text-gray-400">Rider earnings will be deducted on submission. If rejected, earnings will be restored.</p>
                  </div>
                </details>
                
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
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-xs text-red-500">Rejected</span>
                                  <button
                                    onClick={() => processWithdrawalRequest(req.id, 'pending', req)}
                                    className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                                  >
                                    ↩ Restore
                                  </button>
                                </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                    <select
                      value={adminOrderForm.parcelSize}
                      onChange={(e) => setAdminOrderForm({...adminOrderForm, parcelSize: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="bike">🏍️ Bike</option>
                      <option value="car">🚗 Car</option>
                      <option value="van">🚐 Van</option>
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
                  <div id="live-rider-map" style={{ width: '100%', height: '100%' }} ref={(el) => {
                    if (!el) return;
                    if ((el as any).__mapInit) return;
                    (el as any).__mapInit = true;
                    const loadMap = () => {
                      if (!(window as any).L) {
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
                        document.head.appendChild(link);
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
                        script.onload = () => initMap(el);
                        document.head.appendChild(script);
                      } else {
                        initMap(el);
                      }
                    };
                    const initMap = (container: HTMLElement) => {
                      const L = (window as any).L;
                      const locs = allRiderLocations.filter((l: any) => l.latitude && l.longitude);
                      const center = locs.length > 0 ? [locs.reduce((s: number, l: any) => s + l.latitude, 0) / locs.length, locs.reduce((s: number, l: any) => s + l.longitude, 0) / locs.length] : [1.3521, 103.8198];
                      const map = L.map(container).setView(center, 12);
                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
                      locs.forEach((loc: any) => {
                        const rider = riders.find((r: any) => r.id === loc.rider_id);
                        const name = rider?.name || 'Rider';
                        const icon = L.divIcon({ className: '', html: '<div style="background:#22c55e;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">' + name.charAt(0).toUpperCase() + '</div>', iconSize: [32, 32], iconAnchor: [16, 16] });
                        L.marker([loc.latitude, loc.longitude], { icon }).addTo(map).bindPopup('<b>' + name + '</b><br>Updated: ' + new Date(loc.updated_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }));
                      });
                      if (locs.length > 1) {
                        const bounds = L.latLngBounds(locs.map((l: any) => [l.latitude, l.longitude]));
                        map.fitBounds(bounds, { padding: [30, 30] });
                      }
                    };
                    loadMap();
                  }} />
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
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
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
                    <option value="all_riders">All Riders ({riders.filter((r: any) => r.phone).length})</option>
                    <option value="online_riders">Online Riders Only ({riders.filter((r: any) => r.phone && r.is_online).length})</option>
                    <option value="all_customers">All Customers ({customers.filter((c: any) => c.phone).length})</option>
                    <option value="all">Everyone ({riders.filter((r: any) => r.phone).length + customers.filter((c: any) => c.phone).length})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject (Optional)</label>
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
                
                {/* Message Preview */}
                {broadcastMessage.message && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs font-medium text-green-600 mb-1">Preview (WhatsApp):</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      Hi [Name] 👋{'\n\n'}📢 *MoveIt Logistics*{broadcastMessage.subject ? `\n*${broadcastMessage.subject}*` : ''}{'\n\n'}{broadcastMessage.message}
                    </p>
                  </div>
                )}
                
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    ⚠️ This will open a WhatsApp window for each recipient. You will need to click send in each window. For large numbers, messages will open with 1.5 second delays.
                  </p>
                </div>
                
                <button
                  onClick={sendBroadcast}
                  disabled={!broadcastMessage.message}
                  className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                    broadcastMessage.message 
                      ? 'bg-orange-600 text-white hover:bg-orange-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send size={18} />
                  Send via WhatsApp
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
                {/* AI Analyze - Paste Order */}
                <details className="border border-purple-200 rounded-lg">
                  <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-purple-700 hover:bg-purple-50 flex items-center gap-2">📋 Paste Order (AI Analyze)</summary>
                  <div className="px-4 pb-4 pt-1">
                    <textarea
                      id="admin-ai-input"
                      className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white"
                      rows={3}
                      placeholder='e.g. "Pickup from Bedok 460456 #05-123, contact Ali 91234567, deliver to Jurong 600123 #12-456, recipient Sarah 98765432, bike delivery, today 2pm"'
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        id="admin-ai-btn"
                        onClick={async () => {
                          const input = (document.getElementById("admin-ai-input") as HTMLTextAreaElement)?.value || "";
                          if (input.trim().length < 20) return alert("Please enter at least 20 characters");
                          const btn = document.getElementById("admin-ai-btn") as HTMLButtonElement;
                          if (btn) btn.textContent = "Analyzing...";
                          try {
                            const resp = await fetch("/api/ai-analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deliveryDetails: input }) });
                            const result = await resp.json();
                            if (result.error) { alert(result.error); return; }
                            
                            // Compute real distance-based price (overrides AI's suggestedPrice)
                            let aiPrice = result.suggestedPrice?.toString();
                            try {
                              const aiStops = (result.stops && result.stops.length > 0)
                                ? result.stops.map((s: any) => ({ address: s.address || '', unitNo: s.unitNo || 'N/A' }))
                                : [{ address: result.stops?.[0]?.address || '', unitNo: 'N/A' }];
                              const priceCalc = await computeDistancePrice(result.pickup || '', aiStops);
                              if (priceCalc) aiPrice = priceCalc.price.toFixed(2);
                            } catch (e) { /* keep AI suggested price */ }
                            
                            setAdminJobForm((prev: any) => ({
                              ...prev,
                              pickup: result.pickup || prev.pickup,
                              pickupUnit: result.pickupUnitNo || prev.pickupUnit,
                              pickupContact: result.pickupContact || prev.pickupContact,
                              pickupPhone: result.pickupPhone || prev.pickupPhone,
                              delivery: result.stops?.[0]?.address || prev.delivery,
                              deliveryUnit: result.stops?.[0]?.unitNo || prev.deliveryUnit,
                              recipientName: result.stops?.[0]?.recipientName || prev.recipientName,
                              recipientPhone: result.stops?.[0]?.recipientPhone || prev.recipientPhone,
                              parcelSize: result.vehicleType || result.parcelSize || prev.parcelSize,
                              remarks: result.remarks || prev.remarks,
                              price: aiPrice || prev.price,
                              deliveryDate: result.deliveryDate || prev.deliveryDate,
                              deliverySlot: result.deliverySlot || prev.deliverySlot,
                            }));
                            alert("AI analysis applied! Please review the auto-filled fields.");
                          } catch (e: any) { alert("AI analysis failed: " + e.message); }
                          finally { if (btn) btn.textContent = "Analyze"; }
                        }}
                        className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700"
                      >Analyze</button>
                      <button onClick={() => { const el = document.getElementById("admin-ai-input") as HTMLTextAreaElement; if (el) el.value = ""; }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">Clear</button>
                    </div>
                  </div>
                </details>

                {/* Customer Information */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">👤 Customer Information</h4>
                  
                  {/* Searchable customer dropdown */}
                  <div className="mb-3 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search Customer <span className="text-gray-400 text-xs">(by name or phone)</span>
                    </label>
                    <input
                      type="text"
                      value={adminCustomerSearch}
                      onChange={(e) => {
                        setAdminCustomerSearch(e.target.value);
                        setAdminCustomerDropdownOpen(true);
                        // If admin clears the search, also clear the selected customer link
                        if (!e.target.value) {
                          setAdminJobForm(prev => ({ ...prev, customerId: '', customerName: '', customerPhone: '' }));
                        }
                      }}
                      onFocus={() => setAdminCustomerDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setAdminCustomerDropdownOpen(false), 200)}
                      placeholder="Type customer name or phone to search..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {/* Dropdown results */}
                    {adminCustomerDropdownOpen && adminCustomerSearch.trim().length > 0 && (() => {
                      const searchLower = adminCustomerSearch.trim().toLowerCase();
                      const searchDigits = adminCustomerSearch.replace(/\D/g, '');
                      const matches = customers.filter((c: any) => {
                        const nameMatch = (c.name || '').toLowerCase().includes(searchLower);
                        const phoneDigits = (c.phone || '').replace(/\D/g, '');
                        const phoneMatch = searchDigits.length >= 3 && phoneDigits.includes(searchDigits);
                        return nameMatch || phoneMatch;
                      }).slice(0, 8);
                      
                      return (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                          {matches.length > 0 ? (
                            matches.map((c: any) => (
                              <button
                                type="button"
                                key={c.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setAdminJobForm(prev => ({
                                    ...prev,
                                    customerId: c.id,
                                    customerName: c.name || '',
                                    customerPhone: c.phone || ''
                                  }));
                                  setAdminCustomerSearch(`${c.name} (${c.phone})`);
                                  setAdminCustomerDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-sm text-gray-800">{c.name || '(no name)'}</div>
                                <div className="text-xs text-gray-500">{c.phone || '(no phone)'}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500 italic">
                              No registered customer matches "{adminCustomerSearch}". You can still type the name and phone below for a walk-in customer.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Selected customer indicator OR manual entry hint */}
                  {adminJobForm.customerId ? (
                    <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-800 flex justify-between items-center">
                      <span>✓ Linked to registered customer — they will see this job in their portal</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminJobForm(prev => ({ ...prev, customerId: '', customerName: '', customerPhone: '' }));
                          setAdminCustomerSearch('');
                        }}
                        className="text-red-600 hover:text-red-800 font-semibold ml-2"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (adminJobForm.customerName || adminJobForm.customerPhone) ? (
                    <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                      ⚠ Walk-in customer (no account) — this job will not appear in any customer portal
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={adminJobForm.customerName}
                        onChange={(e) => setAdminJobForm({...adminJobForm, customerName: e.target.value, customerId: ''})}
                        placeholder="Enter customer name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        readOnly={!!adminJobForm.customerId}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={adminJobForm.customerPhone}
                        onChange={(e) => setAdminJobForm({...adminJobForm, customerPhone: e.target.value, customerId: ''})}
                        placeholder="Enter customer phone"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        readOnly={!!adminJobForm.customerId}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pickup Address <span className="text-red-500">*</span>
                          {lookingUp.adminPickup && <span className="ml-2 text-xs text-blue-600 font-normal">🔄 Looking up...</span>}
                        </label>
                        <input
                          type="text"
                          value={adminJobForm.pickup}
                          onChange={async (e) => {
                            const value = e.target.value;
                            setAdminJobForm({...adminJobForm, pickup: value});
                            // Auto-lookup if user enters exactly 6 digits
                            if (/^\d{6}$/.test(value)) {
                              setLookingUp(prev => ({ ...prev, adminPickup: true }));
                              const address = await lookupPostalCode(value);
                              setLookingUp(prev => ({ ...prev, adminPickup: false }));
                              if (address) {
                                setAdminJobForm(prev => {
                                  if (/^\d{6}$/.test(prev.pickup)) {
                                    return { ...prev, pickup: address };
                                  }
                                  return prev;
                                });
                              }
                            }
                          }}
                          placeholder="Enter postal code (e.g., 238858) or full address"
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
                        <span className="text-sm font-medium text-orange-800">
                          Stop {idx + 1}
                          {lookingUp.adminStops?.[idx] && <span className="ml-2 text-xs text-blue-600 font-normal">🔄 Looking up...</span>}
                        </span>
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
                            onChange={async (e) => {
                              const value = e.target.value;
                              const newStops = [...adminJobForm.stops];
                              newStops[idx] = { ...newStops[idx], address: value };
                              setAdminJobForm({...adminJobForm, stops: newStops});
                              // Auto-lookup if user enters exactly 6 digits
                              if (/^\d{6}$/.test(value)) {
                                setLookingUp(prev => ({ ...prev, adminStops: { ...(prev.adminStops || {}), [idx]: true } }));
                                const address = await lookupPostalCode(value);
                                setLookingUp(prev => ({ ...prev, adminStops: { ...(prev.adminStops || {}), [idx]: false } }));
                                if (address) {
                                  setAdminJobForm(prev => {
                                    const latestStops = [...prev.stops];
                                    if (latestStops[idx] && /^\d{6}$/.test(latestStops[idx].address)) {
                                      latestStops[idx] = { ...latestStops[idx], address };
                                    }
                                    return { ...prev, stops: latestStops };
                                  });
                                }
                              }
                            }}
                            placeholder="Enter postal code or full address"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type <span className="text-red-500">*</span></label>
                      <select
                        value={adminJobForm.parcelSize}
                        onChange={(e) => setAdminJobForm({...adminJobForm, parcelSize: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="bike">🏍️ Bike</option>
                        <option value="car">🚗 Car</option>
                        <option value="van">🚐 Van</option>
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
                    
                    // Recompute price from real distance (overrides any stale form price from AI suggestedPrice)
                    let finalPrice = parseFloat(adminJobForm.price);
                    try {
                      const priceCalc = await computeDistancePrice(adminJobForm.pickup, adminJobForm.stops);
                      if (priceCalc) {
                        finalPrice = priceCalc.price;
                        setAdminJobForm(prev => ({ ...prev, price: priceCalc.price.toFixed(2) }));
                      }
                    } catch (e) { /* fall back to form price */ }
                    
                    const minPrice = 3 + (adminJobForm.stops.length - 1) * 2;
                    if (!finalPrice || finalPrice < minPrice) return alert(`Minimum price is $${minPrice} for ${adminJobForm.stops.length} stop(s)`);

                    // Generate Order ID
                    const orderId = generateOrderId();

                    // Determine which customer this job belongs to:
                    // (1) If admin explicitly selected a customer from the dropdown, use that customer_id directly.
                    // (2) Otherwise, try to match the typed phone against a registered customer.
                    // (3) Otherwise, leave customer_id null (walk-in customer without an account).
                    const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').replace(/^65/, '').slice(-8);
                    let linkedCustomerId: string | null = null;
                    let matchedCustomer: any = null;
                    if (adminJobForm.customerId) {
                      matchedCustomer = customers.find((c: any) => c.id === adminJobForm.customerId) || null;
                      linkedCustomerId = matchedCustomer ? matchedCustomer.id : null;
                    } else {
                      const adminPhoneKey = normalizePhone(adminJobForm.customerPhone);
                      if (adminPhoneKey) {
                        matchedCustomer = customers.find((c: any) => normalizePhone(c.phone) === adminPhoneKey) || null;
                        linkedCustomerId = matchedCustomer ? matchedCustomer.id : null;
                      }
                    }
                    if (!matchedCustomer && adminJobForm.customerPhone) {
                      console.log('[AdminCreateJob] No registered customer found — job saved without customer_id (walk-in).');
                    }

                    try {
                      const deliveryAddresses = adminJobForm.stops.map(s => `${s.address} ${s.unitNo}`).join(' → ');
                      
                      await api('jobs', 'POST', {
                        order_id: orderId,
                        customer_id: linkedCustomerId,
                        customer_name: matchedCustomer ? matchedCustomer.name : adminJobForm.customerName,
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
                        price: finalPrice,
                        status: 'posted',
                        recipient_name: adminJobForm.stops[0]?.recipientName || null,
                        recipient_phone: adminJobForm.stops[0]?.recipientPhone || null,
                        parcel_size: adminJobForm.parcelSize,
                        remarks: adminJobForm.remarks || null
                      });

                      alert(`Job created successfully!\nOrder ID: ${orderId}`);
                      
                      // Reset form
                      setAdminJobForm({
                        customerId: '',
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
                        parcelSize: 'bike',
                        remarks: ''
                      });
                      setAdminCustomerSearch('');
                      setAdminCustomerDropdownOpen(false);
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
                <p className="text-sm text-yellow-800">⚠️ <strong>Online</strong> riders with <strong>GPS</strong> are shown first. Offline riders are also available below.</p>
              </div>

              <h4 className="font-semibold text-gray-700 mb-3">Select a Rider:</h4>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {(() => {
                  // Show ALL riders - online with GPS first, then others
                  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
                  const allAvailableRiders = riders.filter((r: any) => {
                    const isCurrentRider = showAssignRider.rider_id === r.id;
                    return !isCurrentRider;
                  }).map((r: any) => {
                    const riderLoc = allRiderLocations?.find((loc: any) => loc.rider_id === r.id);
                    const isOnline = r.is_online === true;
                    const hasRecentGPS = riderLoc && riderLoc.updated_at > thirtyMinsAgo;
                    return { ...r, isOnline, hasRecentGPS };
                  }).sort((a: any, b: any) => {
                    if (a.isOnline && a.hasRecentGPS && !(b.isOnline && b.hasRecentGPS)) return -1;
                    if (!(a.isOnline && a.hasRecentGPS) && b.isOnline && b.hasRecentGPS) return 1;
                    if (a.isOnline && !b.isOnline) return -1;
                    if (!a.isOnline && b.isOnline) return 1;
                    return a.name.localeCompare(b.name);
                  });
                  
                  if (allAvailableRiders.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <p className="text-gray-500 mb-2">No other riders available</p>
                      </div>
                    );
                  }
                  
                  return allAvailableRiders.map((r: any) => (
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
                      className={`w-full p-3 border rounded-lg text-left transition-colors ${r.isOnline && r.hasRecentGPS ? 'hover:border-green-500 hover:bg-green-50' : 'hover:border-yellow-500 hover:bg-yellow-50 opacity-80'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{r.name}</p>
                          <p className="text-sm text-gray-600">{r.phone} | Tier {r.tier} | {r.completed_jobs || 0} jobs</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.isOnline && r.hasRecentGPS ? (
                            <>
                              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Online"></span>
                              <span className="text-green-600 text-xs font-medium">Online</span>
                            </>
                          ) : r.isOnline ? (
                            <>
                              <span className="w-3 h-3 bg-yellow-500 rounded-full" title="Online, no GPS"></span>
                              <span className="text-yellow-600 text-xs font-medium">No GPS</span>
                            </>
                          ) : (
                            <>
                              <span className="w-3 h-3 bg-gray-400 rounded-full" title="Offline"></span>
                              <span className="text-gray-500 text-xs font-medium">Offline</span>
                            </>
                          )}
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
                      href={`https://wa.me/${showRiderTracking.rider_phone.replace(/\D/g, '').length > 8 ? showRiderTracking.rider_phone.replace(/\D/g, '') : '65' + showRiderTracking.rider_phone.replace(/\D/g, '')}?text=Hi ${showRiderTracking.rider_name}, checking on the delivery status for order to ${showRiderTracking.delivery}`}
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
                {/* Pickup */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address</label>
                  <input type="text" value={editJob.pickup || ''} onChange={(e) => setEditJob({...editJob, pickup: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Contact</label>
                    <input type="text" value={editJob.pickup_contact || ''} onChange={(e) => setEditJob({...editJob, pickup_contact: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Phone</label>
                    <input type="text" value={editJob.pickup_phone || ''} onChange={(e) => setEditJob({...editJob, pickup_phone: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                {/* Drop-offs - All stops */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">📍 Drop-off Location(s)</label>
                  {(editJob.stops && editJob.stops.length > 0 ? editJob.stops : [{ address: editJob.delivery || '', unitNo: '', recipientName: editJob.recipient_name || '', recipientPhone: editJob.recipient_phone || '' }]).map((stop: any, idx: number) => (
                    <div key={idx} className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs font-bold text-green-700 mb-2">Drop-off {idx + 1}</p>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Address</label>
                          <input
                            type="text"
                            value={stop.address || ''}
                            onChange={(e) => {
                              const newStops = [...(editJob.stops || [{ address: editJob.delivery || '', unitNo: '', recipientName: editJob.recipient_name || '', recipientPhone: editJob.recipient_phone || '' }])];
                              newStops[idx] = {...newStops[idx], address: e.target.value};
                              const deliveryStr = newStops.map((s: any) => `${s.address} ${s.unitNo || ''}`).join(' → ');
                              setEditJob({...editJob, stops: newStops, delivery: deliveryStr});
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Unit No</label>
                          <input
                            type="text"
                            value={stop.unitNo || ''}
                            onChange={(e) => {
                              const newStops = [...(editJob.stops || [{ address: editJob.delivery || '', unitNo: '', recipientName: editJob.recipient_name || '', recipientPhone: editJob.recipient_phone || '' }])];
                              newStops[idx] = {...newStops[idx], unitNo: e.target.value};
                              setEditJob({...editJob, stops: newStops});
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="#01-01 or N/A"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Recipient Name</label>
                            <input
                              type="text"
                              value={stop.recipientName || ''}
                              onChange={(e) => {
                                const newStops = [...(editJob.stops || [{ address: editJob.delivery || '', unitNo: '', recipientName: editJob.recipient_name || '', recipientPhone: editJob.recipient_phone || '' }])];
                                newStops[idx] = {...newStops[idx], recipientName: e.target.value};
                                // Also update legacy field for first stop
                                const updates: any = { stops: newStops };
                                if (idx === 0) updates.recipient_name = e.target.value;
                                setEditJob({...editJob, ...updates});
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                              placeholder="Recipient name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Recipient Phone</label>
                            <input
                              type="text"
                              value={stop.recipientPhone || ''}
                              onChange={(e) => {
                                const newStops = [...(editJob.stops || [{ address: editJob.delivery || '', unitNo: '', recipientName: editJob.recipient_name || '', recipientPhone: editJob.recipient_phone || '' }])];
                                newStops[idx] = {...newStops[idx], recipientPhone: e.target.value};
                                const updates: any = { stops: newStops };
                                if (idx === 0) updates.recipient_phone = e.target.value;
                                setEditJob({...editJob, ...updates});
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                              placeholder="Phone number"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                    <input type="date" value={editJob.delivery_date || ''} onChange={(e) => setEditJob({...editJob, delivery_date: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Slot</label>
                    <select value={editJob.timeframe || editJob.delivery_slot || ''} onChange={(e) => setEditJob({...editJob, timeframe: e.target.value, delivery_slot: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
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
                    <input type="number" value={editJob.price || ''} onChange={(e) => setEditJob({...editJob, price: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" step="0.5" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                    <select value={editJob.parcel_size || 'bike'} onChange={(e) => setEditJob({...editJob, parcel_size: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="bike">🏍️ Bike</option>
                      <option value="car">🚗 Car</option>
                      <option value="van">🚐 Van</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea value={editJob.remarks || ''} onChange={(e) => setEditJob({...editJob, remarks: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} />
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setEditJob(null)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const stops = editJob.stops || [];
                        const deliveryStr = stops.length > 0 
                          ? stops.map((s: any) => `${s.address || ''} ${s.unitNo || ''}`).join(' → ')
                          : editJob.delivery;
                        
                        await api(`jobs?id=eq.${editJob.id}`, 'PATCH', {
                          pickup: editJob.pickup,
                          delivery: deliveryStr,
                          pickup_contact: editJob.pickup_contact,
                          pickup_phone: editJob.pickup_phone,
                          recipient_name: stops[0]?.recipientName || editJob.recipient_name,
                          recipient_phone: stops[0]?.recipientPhone || editJob.recipient_phone,
                          stops: stops,
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

        {/* Rider Earnings Modal */}
        {showRiderEarnings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">💰 Rider Earnings</h3>
                <button onClick={() => setShowRiderEarnings(null)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="font-semibold text-lg">{showRiderEarnings.name}</p>
                <p className="text-sm text-gray-600">{showRiderEarnings.email} | {showRiderEarnings.phone}</p>
                <p className="text-2xl font-bold text-green-600 mt-1">${(showRiderEarnings.earnings || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500">{showRiderEarnings.completed_jobs || 0} completed jobs</p>
              </div>

              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-gray-800">📜 Earning Transactions</h4>
                <button onClick={() => {
                  const riderJobs = jobs.filter((j: any) => j.rider_id === showRiderEarnings.id && (j.status === 'completed' || j.status === 'delivered'));
                  const filtered = riderJobs.filter((j: any) => {
                    const jd = new Date(j.updated_at || j.created_at);
                    if (riderEarnFrom && jd < new Date(riderEarnFrom)) return false;
                    if (riderEarnTo && jd > new Date(riderEarnTo + 'T23:59:59')) return false;
                    return true;
                  }).sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
                  const NL = String.fromCharCode(10);
                  let csv = 'Date,Order ID,Pickup,Dropoff,Price,Commission' + NL;
                  filtered.forEach((j: any) => {
                    const d = new Date(j.updated_at || j.created_at).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' });
                    const comm = calculateCommissions(j.price, showRiderEarnings.tier, showRiderEarnings.upline_chain || [], j.total_stops || 1);
                    csv += d + ',' + (j.order_id || '') + ',' + String(j.pickup || '').replace(/,/g, ' ').substring(0, 40) + ',' + String(j.delivery || '').replace(/,/g, ' ').substring(0, 40) + ',' + j.price + ',' + comm.activeRider.toFixed(2) + NL;
                  });
                  csv += ',,,,Total,' + filtered.reduce((s: number, j: any) => { const c = calculateCommissions(j.price, showRiderEarnings.tier, showRiderEarnings.upline_chain || [], j.total_stops || 1); return s + c.activeRider; }, 0).toFixed(2) + NL;
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const el = document.createElement('a');
                  el.href = url;
                  el.download = showRiderEarnings.name + '_earnings.csv';
                  el.click();
                }} className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold hover:bg-green-200"><Download size={12} /> Export</button>
              </div>

              <div className="flex gap-2 mb-3">
                <input type="date" value={riderEarnFrom} onChange={(e) => setRiderEarnFrom(e.target.value)} className="flex-1 px-2 py-1 border rounded text-xs" />
                <input type="date" value={riderEarnTo} onChange={(e) => setRiderEarnTo(e.target.value)} className="flex-1 px-2 py-1 border rounded text-xs" />
                {(riderEarnFrom || riderEarnTo) && (
                  <button onClick={() => { setRiderEarnFrom(""); setRiderEarnTo(""); }} className="px-2 text-xs text-gray-500">Clear</button>
                )}
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(() => {
                  const riderJobs = jobs.filter((j: any) => j.rider_id === showRiderEarnings.id && (j.status === 'completed' || j.status === 'delivered'));
                  const filtered = riderJobs.filter((j: any) => {
                    const jd = new Date(j.updated_at || j.created_at);
                    if (riderEarnFrom && jd < new Date(riderEarnFrom)) return false;
                    if (riderEarnTo && jd > new Date(riderEarnTo + 'T23:59:59')) return false;
                    return true;
                  }).sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

                  if (filtered.length === 0) return <p className="text-center text-gray-500 py-4">No earning transactions found</p>;

                  const totalEarnings = filtered.reduce((s: number, j: any) => { const c = calculateCommissions(j.price, showRiderEarnings.tier, showRiderEarnings.upline_chain || [], j.total_stops || 1); return s + c.activeRider; }, 0);

                  return (
                    <>
                      <div className="bg-green-50 p-2 rounded text-center mb-2">
                        <p className="text-xs text-green-600">{filtered.length} jobs | Total: <strong>${totalEarnings.toFixed(2)}</strong></p>
                      </div>
                      {filtered.map((j: any, idx: number) => {
                        const comm = calculateCommissions(j.price, showRiderEarnings.tier, showRiderEarnings.upline_chain || [], j.total_stops || 1);
                        return (
                          <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 truncate">{j.order_id} - {extractAreaName(j.pickup)} → {extractAreaName(j.delivery)}</p>
                              <p className="text-xs text-gray-400">{formatSGT(j.updated_at || j.created_at)}</p>
                            </div>
                            <p className="font-bold text-sm text-green-600 ml-2">+${comm.activeRider.toFixed(2)}</p>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>

              <button onClick={() => setShowRiderEarnings(null)} className="w-full mt-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">Close</button>
            </div>
          </div>
        )}

        {/* Customer Wallet Detail Modal */}
        {showCustomerWallet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">👛 Customer Wallet</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      // Refresh customer data
                      const fresh = await api(`customers?id=eq.${showCustomerWallet.id}`);
                      if (fresh && fresh.length > 0) {
                        setShowCustomerWallet(fresh[0]);
                      }
                      await loadData();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full text-blue-600" title="Refresh"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <button onClick={() => setShowCustomerWallet(null)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-lg">{showCustomerWallet.name}</p>
                <p className="text-sm text-gray-600">{showCustomerWallet.email} | {showCustomerWallet.phone}</p>
              </div>
              
              {/* Wallet Summary */}
              {(() => {
                const customerJobs = jobs.filter((j: any) => j.customer_id === showCustomerWallet.id || (j.customer_name && j.customer_name.trim() === showCustomerWallet.name.trim()));
                const completedAndActiveJobs = customerJobs.filter((j: any) => j.status !== 'cancelled');
                const amountUsed = completedAndActiveJobs.reduce((sum: number, j: any) => sum + (parseFloat(j.price) || 0), 0);
                const cancelledJobs = customerJobs.filter((j: any) => j.status === 'cancelled');
                const totalRefunded = cancelledJobs.reduce((sum: number, j: any) => sum + (parseFloat(j.price) || 0), 0);
                const topupLogs = auditLogs.filter((log: any) => {
                  if (log.action !== 'customer_topup' && log.action !== 'stripe_topup_success') return false;
                  const d = typeof log.details === 'string' ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : (log.details || {});
                  return d?.customerId === showCustomerWallet.id || log.user_id === showCustomerWallet.id;
                });
                const seenTopups = new Set();
                const totalTopUps = topupLogs.reduce((sum: number, log: any) => {
                  const d = typeof log.details === 'string' ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : (log.details || {});
                  const amt = d?.amount || 0;
                  const key = amt.toFixed(2) + '_' + new Date(log.timestamp).toISOString().substring(0, 16);
                  if (seenTopups.has(key)) return sum;
                  seenTopups.add(key);
                  return sum + amt;
                }, 0);
                
                return (
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-green-50 p-3 rounded-lg text-center border border-green-200">
                      <p className="text-xs text-green-600">Current Balance</p>
                      <p className="text-2xl font-bold text-green-700">${(showCustomerWallet.credits || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-200">
                      <p className="text-xs text-blue-600">Amount Used</p>
                      <p className="text-2xl font-bold text-blue-700">${amountUsed.toFixed(2)}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center border border-purple-200">
                      <p className="text-xs text-purple-600">Total Top-ups</p>
                      <p className="text-2xl font-bold text-purple-700">${totalTopUps.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })()}
              
              {/* Manual Top-up Entry */}
              <details className="mb-3 border border-blue-200 rounded-lg">
                <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-blue-700 hover:bg-blue-50">+ Add Manual Top-up Record</summary>
                <div className="px-3 pb-3 pt-1">
                  <div className="flex gap-2 mb-2">
                    <input type="number" id="manual-topup-amount" placeholder="Amount" className="flex-1 px-2 py-1.5 border rounded text-sm" min="1" step="0.01" />
                    <input type="date" id="manual-topup-date" className="flex-1 px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <select id="manual-topup-method" className="w-full px-2 py-1.5 border rounded text-sm mb-2">
                    <option value="stripe_payment">Stripe Payment</option>
                    <option value="paynow">PayNow</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                  <input type="text" id="manual-topup-note" placeholder="Note (optional)" className="w-full px-2 py-1.5 border rounded text-sm mb-2" />
                  <button onClick={async () => {
                    const amtEl = document.getElementById("manual-topup-amount") as HTMLInputElement;
                    const dateEl = document.getElementById("manual-topup-date") as HTMLInputElement;
                    const methodEl = document.getElementById("manual-topup-method") as HTMLSelectElement;
                    const noteEl = document.getElementById("manual-topup-note") as HTMLInputElement;
                    const amt = parseFloat(amtEl?.value || "0");
                    const date = dateEl?.value || new Date().toISOString().split("T")[0];
                    const method = methodEl?.value || "stripe_payment";
                    const note = noteEl?.value || "";
                    if (amt <= 0) return alert("Please enter a valid amount");
                    if (!window.confirm("Add top-up record of $" + amt.toFixed(2) + " for " + showCustomerWallet.name + "?")) return;
                    try {
                      await api("audit_logs", "POST", { action: "customer_topup", user_id: showCustomerWallet.id, user_type: "admin", details: JSON.stringify({ customerId: showCustomerWallet.id, customerName: showCustomerWallet.name, amount: amt, status: method, note: note, manual: true }), timestamp: new Date(date + "T00:00:00").toISOString() });
                      await loadData();
                      const fresh = await api("customers?id=eq." + showCustomerWallet.id);
                      if (fresh && fresh.length > 0) setShowCustomerWallet(fresh[0]);
                      amtEl.value = "";
                      noteEl.value = "";
                      alert("Top-up record added!");
                    } catch (e: any) { alert("Error: " + e.message); }
                  }} className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700">Add Record</button>
                  <p className="text-xs text-gray-400 mt-1">Adds record to history only. Edit customer credits separately to adjust balance.</p>
                </div>
              </details>

              {/* Transaction History */}
              <div className="flex justify-between items-center mb-2"><h4 className="font-semibold text-gray-800">📜 Transaction History</h4><button onClick={() => exportWalletCSV(showCustomerWallet)} className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold hover:bg-green-200"><Download size={12} /> Export</button></div>
              <div className="flex gap-2 mb-2">
                <input type="date" value={walletDateFrom} onChange={(e) => setWalletDateFrom(e.target.value)} className="flex-1 px-2 py-1 border rounded text-xs" />
                <input type="date" value={walletDateTo} onChange={(e) => setWalletDateTo(e.target.value)} className="flex-1 px-2 py-1 border rounded text-xs" />
                {(walletDateFrom || walletDateTo) && (
                  <button onClick={() => { setWalletDateFrom(""); setWalletDateTo(""); }} className="px-2 text-xs text-gray-500">Clear</button>
                )}
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(() => {
                  const customerJobs = jobs
                    .filter((j: any) => j.customer_id === showCustomerWallet.id || (j.customer_name && j.customer_name.trim() === showCustomerWallet.name.trim()))
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  
                  // Get top-up and refund audit logs for this customer
                  const relevantLogs = auditLogs
                    .filter((log: any) => {
                      if (log.action !== 'customer_topup' && log.action !== 'stripe_topup_success' && log.action !== 'admin_job_cancel_refund') return false;
                      const details = typeof log.details === 'string' ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : (log.details || {});
                      return details?.customerId === showCustomerWallet.id;
                    });
                  
                  const transactions: any[] = [];
                  
                  // Add top-up logs (NOT refund logs — refunds will be shown from cancelled jobs)
                  relevantLogs.forEach((log: any) => {
                    const details = typeof log.details === 'string' ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : (log.details || {});
                    if (log.action === 'customer_topup' || log.action === 'stripe_topup_success') {
                      transactions.push({
                        type: 'topup',
                        amount: details?.amount || 0,
                        date: log.timestamp,
                        logId: log.id,
                        description: details?.status === 'stripe_payment' 
                          ? `💳 Top-up via Stripe` 
                          : `📱 Top-up via PayNow${details?.refNumber ? ` (Ref: ${details.refNumber})` : ''}`
                      });
                    }
                  });
                  
                  // Add job transactions
                  customerJobs.forEach((j: any) => {
                    if (j.status === 'cancelled') {
                      // Cancelled job = refund (show as single +refund entry)
                      transactions.push({
                        type: 'refund',
                        amount: parseFloat(j.price) || 0,
                        date: j.cancelled_at || j.created_at,
                        description: `Refund - ${j.order_id || 'Cancelled order'}`
                      });
                    } else {
                      // Active/completed job = deduction
                      transactions.push({
                        type: 'deduction',
                        amount: parseFloat(j.price) || 0,
                        date: j.created_at,
                        description: `Order ${j.order_id || ''} - ${extractAreaName(j.pickup)} → ${extractAreaName(j.delivery)}`
                      });
                    }
                  });
                  
                  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  // Deduplicate top-ups (webhook + frontend may both log)
                  const seen = new Set();
                  const dedupedTxns = transactions.filter((t: any) => {
                    if (t.type !== 'topup') return true;
                    const key = t.amount.toFixed(2) + '_' + new Date(t.date).toISOString().substring(0, 16);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  });
                  const wF = walletDateFrom ? new Date(walletDateFrom) : null;
                  const wT = walletDateTo ? new Date(walletDateTo + "T23:59:59") : null;
                  const filteredTxns = dedupedTxns.filter((t: any) => { const td = new Date(t.date); if (wF && td < wF) return false; if (wT && td > wT) return false; return true; });
                  
                  return filteredTxns.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No transactions yet</p>
                  ) : filteredTxns.slice(0, 50).map((t: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{t.description}</p>
                        <p className="text-xs text-gray-400">{formatSGT(t.date)}</p>
                      </div>
                      {t.logId && (
                        <button onClick={async () => { if (!window.confirm("Delete this record?")) return; try { await api("audit_logs?id=eq." + t.logId, "DELETE"); await loadData(); const fr = await api("customers?id=eq." + showCustomerWallet.id); if (fr && fr.length > 0) setShowCustomerWallet(fr[0]); } catch (e: any) { alert("Error: " + e.message); } }} className="text-red-400 hover:text-red-600 px-1" title="Delete"><Trash2 size={14} /></button>
                      )}
                      <p className={`font-bold text-sm whitespace-nowrap ml-2 ${
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
                {!selectedPodJob.pod_flagged && adminCan.flagPod && (
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

        {/* Delivery Plan Modal (Customer) */}
        {showDeliveryPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">📅 Delivery Plan</h3>
                <button onClick={() => setShowDeliveryPlan(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">Pre-set weekly or monthly recurring deliveries. Jobs will be created automatically for your selected dates.</p>
              
              <div className="space-y-4">
                {/* Plan Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plan Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeliveryPlan({...deliveryPlan, planType: 'weekly'})}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm ${deliveryPlan.planType === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      📆 Weekly
                    </button>
                    <button
                      onClick={() => setDeliveryPlan({...deliveryPlan, planType: 'monthly'})}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm ${deliveryPlan.planType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      🗓️ Monthly
                    </button>
                  </div>
                </div>

                {/* Weekly Days Selection */}
                {deliveryPlan.planType === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Days</label>
                    <div className="flex flex-wrap gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <button
                          key={day}
                          onClick={() => {
                            const days = deliveryPlan.weeklyDays.includes(day)
                              ? deliveryPlan.weeklyDays.filter(d => d !== day)
                              : [...deliveryPlan.weeklyDays, day];
                            setDeliveryPlan({...deliveryPlan, weeklyDays: days});
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium ${
                            deliveryPlan.weeklyDays.includes(day) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-500 mb-1">Generate for how many weeks?</label>
                      <select 
                        value={deliveryPlan.weeksToGenerate}
                        onChange={(e) => setDeliveryPlan({...deliveryPlan, weeksToGenerate: parseInt(e.target.value)})}
                        className="px-3 py-2 border rounded-lg text-sm"
                      >
                        {[1, 2, 3, 4, 6, 8].map(w => <option key={w} value={w}>{w} week{w > 1 ? 's' : ''}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* Monthly Dates Selection */}
                {deliveryPlan.planType === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Dates of Month</label>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({length: 31}, (_, i) => i + 1).map((date) => (
                        <button
                          key={date}
                          onClick={() => {
                            const dates = deliveryPlan.monthlyDates.includes(date)
                              ? deliveryPlan.monthlyDates.filter(d => d !== date)
                              : [...deliveryPlan.monthlyDates, date];
                            setDeliveryPlan({...deliveryPlan, monthlyDates: dates});
                          }}
                          className={`p-1.5 rounded text-xs font-medium ${
                            deliveryPlan.monthlyDates.includes(date) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {date}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time Slot */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Slot</label>
                  <select value={deliveryPlan.timeSlot} onChange={(e) => setDeliveryPlan({...deliveryPlan, timeSlot: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                    <option value="6am-11am">6am – 11am</option>
                    <option value="12pm-5pm">12pm – 5pm</option>
                    <option value="6pm-11pm">6pm – 11pm</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start From</label>
                  <input type="date" value={deliveryPlan.startDate} onChange={(e) => setDeliveryPlan({...deliveryPlan, startDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>

                {/* Addresses */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address</label>
                  <input type="text" value={deliveryPlan.pickup} onChange={(e) => setDeliveryPlan({...deliveryPlan, pickup: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Pickup address with postal code" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Unit No</label>
                  <input type="text" value={deliveryPlan.pickupUnitNo} onChange={(e) => setDeliveryPlan({...deliveryPlan, pickupUnitNo: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="#01-01 or N/A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Drop-off Address</label>
                  <input type="text" value={deliveryPlan.delivery} onChange={(e) => setDeliveryPlan({...deliveryPlan, delivery: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Drop-off address with postal code" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Drop-off Unit No</label>
                    <input type="text" value={deliveryPlan.deliveryUnitNo} onChange={(e) => setDeliveryPlan({...deliveryPlan, deliveryUnitNo: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="#05-10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price per Job ($)</label>
                    <input type="number" value={deliveryPlan.price} onChange={(e) => setDeliveryPlan({...deliveryPlan, price: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" min="3" step="0.5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                    <input type="text" value={deliveryPlan.recipientName} onChange={(e) => setDeliveryPlan({...deliveryPlan, recipientName: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Phone</label>
                    <input type="text" value={deliveryPlan.recipientPhone} onChange={(e) => setDeliveryPlan({...deliveryPlan, recipientPhone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select value={deliveryPlan.parcelSize} onChange={(e) => setDeliveryPlan({...deliveryPlan, parcelSize: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="bike">🏍️ Bike</option>
                    <option value="car">🚗 Car</option>
                    <option value="van">🚐 Van</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <input type="text" value={deliveryPlan.remarks} onChange={(e) => setDeliveryPlan({...deliveryPlan, remarks: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Any special instructions" />
                </div>

                {/* Preview */}
                {(() => {
                  // Calculate dates
                  const dates: string[] = [];
                  const start = new Date(deliveryPlan.startDate + 'T00:00:00+08:00');
                  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
                  
                  if (deliveryPlan.planType === 'weekly' && deliveryPlan.weeklyDays.length > 0) {
                    for (let w = 0; w < deliveryPlan.weeksToGenerate; w++) {
                      for (const day of deliveryPlan.weeklyDays) {
                        const d = new Date(start);
                        d.setDate(d.getDate() + (w * 7) + ((dayMap[day] - start.getDay() + 7) % 7));
                        if (d >= start) dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }));
                      }
                    }
                  } else if (deliveryPlan.planType === 'monthly' && deliveryPlan.monthlyDates.length > 0) {
                    const currentMonth = start.getMonth();
                    const currentYear = start.getFullYear();
                    for (let m = 0; m < 2; m++) {
                      for (const date of deliveryPlan.monthlyDates.sort((a, b) => a - b)) {
                        const d = new Date(currentYear, currentMonth + m, date);
                        if (d >= start && d.getDate() === date) {
                          dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }));
                        }
                      }
                    }
                  }
                  
                  const uniqueDates = Array.from(new Set(dates)).sort();
                  const totalCost = uniqueDates.length * (parseFloat(deliveryPlan.price) || 0);
                  
                  return uniqueDates.length > 0 ? (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-semibold text-green-800 mb-2">📋 Plan Preview — {uniqueDates.length} deliveries</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {uniqueDates.map((d, i) => (
                          <p key={i} className="text-xs text-gray-600">• {formatDeliveryDate(d)} ({deliveryPlan.timeSlot})</p>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-green-300 flex justify-between">
                        <span className="text-sm text-gray-700">Total Cost:</span>
                        <span className="text-sm font-bold text-green-700">${totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Submit */}
                <button
                  onClick={async () => {
                    if (!deliveryPlan.pickup || !deliveryPlan.delivery) {
                      alert('Please fill in pickup and drop-off addresses.');
                      return;
                    }
                    
                    // Calculate dates
                    const dates: string[] = [];
                    const start = new Date(deliveryPlan.startDate + 'T00:00:00+08:00');
                    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
                    
                    if (deliveryPlan.planType === 'weekly' && deliveryPlan.weeklyDays.length > 0) {
                      for (let w = 0; w < deliveryPlan.weeksToGenerate; w++) {
                        for (const day of deliveryPlan.weeklyDays) {
                          const d = new Date(start);
                          d.setDate(d.getDate() + (w * 7) + ((dayMap[day] - start.getDay() + 7) % 7));
                          if (d >= start) dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }));
                        }
                      }
                    } else if (deliveryPlan.planType === 'monthly' && deliveryPlan.monthlyDates.length > 0) {
                      const currentMonth = start.getMonth();
                      const currentYear = start.getFullYear();
                      for (let m = 0; m < 2; m++) {
                        for (const date of deliveryPlan.monthlyDates.sort((a, b) => a - b)) {
                          const d = new Date(currentYear, currentMonth + m, date);
                          if (d >= start && d.getDate() === date) {
                            dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }));
                          }
                        }
                      }
                    }
                    
                    const uniqueDates = Array.from(new Set(dates)).sort();
                    if (uniqueDates.length === 0) {
                      alert('Please select at least one delivery day/date.');
                      return;
                    }
                    
                    const pricePerJob = parseFloat(deliveryPlan.price) || 10;
                    const totalCost = uniqueDates.length * pricePerJob;
                    
                    // Check credits
                    const freshCust = await api(`customers?id=eq.${auth.id}`);
                    const freshCredits = freshCust && freshCust.length > 0 ? (freshCust[0].credits || 0) : 0;
                    if (freshCredits < totalCost) {
                      alert(`Insufficient credits.\n\nNeeded: $${totalCost.toFixed(2)} (${uniqueDates.length} jobs × $${pricePerJob.toFixed(2)})\nBalance: $${freshCredits.toFixed(2)}\n\nPlease top up first.`);
                      return;
                    }
                    
                    if (!window.confirm(`Create ${uniqueDates.length} delivery jobs?\n\nTotal: $${totalCost.toFixed(2)} will be deducted from your wallet.\nBalance after: $${(freshCredits - totalCost).toFixed(2)}`)) return;
                    
                    try {
                      // Deduct all credits first
                      await api(`customers?id=eq.${auth.id}`, 'PATCH', { credits: freshCredits - totalCost });
                      
                      let created = 0;
                      for (const date of uniqueDates) {
                        const orderId = generateOrderId();
                        await api('jobs', 'POST', {
                          order_id: orderId,
                          customer_id: auth.id,
                          customer_name: curr?.name,
                          customer_phone: curr?.phone,
                          pickup: `${deliveryPlan.pickup} ${deliveryPlan.pickupUnitNo}`.trim(),
                          delivery: `${deliveryPlan.delivery} ${deliveryPlan.deliveryUnitNo}`.trim(),
                          stops: [{ address: deliveryPlan.delivery, unitNo: deliveryPlan.deliveryUnitNo, recipientName: deliveryPlan.recipientName, recipientPhone: deliveryPlan.recipientPhone }],
                          total_stops: 1,
                          timeframe: deliveryPlan.timeSlot,
                          delivery_slot: deliveryPlan.timeSlot,
                          delivery_date: date,
                          price: pricePerJob,
                          status: 'posted',
                          recipient_name: deliveryPlan.recipientName || null,
                          recipient_phone: deliveryPlan.recipientPhone || null,
                          parcel_size: deliveryPlan.parcelSize,
                          remarks: deliveryPlan.remarks || null
                        });
                        created++;
                      }
                      
                      alert(`✅ Delivery plan created!\n\n${created} jobs scheduled.\n$${totalCost.toFixed(2)} deducted from wallet.`);
                      setShowDeliveryPlan(false);
                      loadData();
                    } catch (e: any) {
                      alert('Error creating delivery plan: ' + e.message);
                    }
                  }}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  📅 Create Delivery Plan
                </button>
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

        {/* Customer Terms & Conditions Modal (Read-only viewer) */}
        {showCustomerTnC && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">📋 Terms and Conditions</h3>
                <button onClick={() => setShowCustomerTnC(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg border text-sm text-gray-700 whitespace-pre-line" style={{maxHeight: '60vh'}}>
                {CUSTOMER_TNC}
              </div>
              
              <button
                onClick={() => setShowCustomerTnC(false)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Rider Terms & Conditions Modal */}
        {showRiderTnC && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">📋 Terms and Conditions</h3>
                <button onClick={() => { setShowRiderTnC(false); setTncAccepted(false); setPendingTnCAction(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg border text-sm text-gray-700 whitespace-pre-line" style={{maxHeight: '50vh'}}>
                {RIDER_TNC}
              </div>
              
              <div className="border-t pt-4">
                <label className="flex items-start gap-3 cursor-pointer mb-4">
                  <input 
                    type="checkbox" 
                    checked={tncAccepted} 
                    onChange={(e) => setTncAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    I have read and understood the Terms and Conditions
                  </span>
                </label>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowRiderTnC(false); setTncAccepted(false); setPendingTnCAction(null); }}
                    className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!tncAccepted) {
                        alert('Please tick the checkbox to agree to the Terms and Conditions before proceeding.');
                        return;
                      }
                      setShowRiderTnC(false);
                      setTncAccepted(false);
                      
                      if (pendingTnCAction?.type === 'accept') {
                        await acceptJob(pendingTnCAction.jobId);
                      } else if (pendingTnCAction?.type === 'bulk_accept') {
                        for (const jobId of pendingTnCAction.jobIds) {
                          await acceptJob(jobId);
                        }
                        setSelectedJobsForAccept([]);
                      } else if (pendingTnCAction?.type === 'auto_accept') {
                        setAutoAcceptEnabled(true);
                        alert(`🟢 Auto-Accept enabled!\n\nJobs within ${curr?.vehicle_type === 'car' || curr?.vehicle_type === 'van' || curr?.vehicle_type === 'lorry' ? '5km' : '10km'} will be automatically accepted.`);
                      }
                      setPendingTnCAction(null);
                    }}
                    disabled={!tncAccepted}
                    className={`flex-1 py-3 rounded-lg font-semibold ${
                      tncAccepted 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {pendingTnCAction?.type === 'auto_accept' ? 'Agree & Enable Auto-Accept' : 'Agree & Accept Job'}
                  </button>
                </div>
              </div>
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
