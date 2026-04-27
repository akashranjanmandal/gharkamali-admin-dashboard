// GKM API — All endpoints verified against swagger.json v2.1.0
// Prod: https://gkm.gobt.in/api

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://gkm.gobt.in/api';

export const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('gkm_admin_token') : null;

export class ApiError extends Error {
  constructor(public message: string, public status: number, public data?: any) {
    super(message);
  }
}

async function req<T = any>(path: string, opts: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = true, ...rest } = opts;
  const headers: Record<string, string> = { ...(rest.headers as any) };
  if (auth) { const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}`; }
  if (!(rest.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json?.message || `Error ${res.status}`, res.status, json);
  return (json?.data ?? json) as T;
}

export const qs = (p?: Record<string, any>) => {
  if (!p) return '';
  const s = Object.entries(p).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return s ? `?${s}` : '';
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const sendOtp = (phone: string) =>
  req('/auth/send-otp', { method: 'POST', auth: false, body: JSON.stringify({ phone }) });

export const verifyOtp = (phone: string, otp: string, name?: string) =>
  req('/auth/verify-otp', { method: 'POST', auth: false, body: JSON.stringify({ phone, otp, ...(name ? { name } : {}) }) });

export const adminLogin = (phone: string, password: string) =>
  req('/auth/admin-login', { method: 'POST', auth: false, body: JSON.stringify({ phone, password }) });

// Gardener login is OTP-based, NOT password-based
export const gardenerOtpLogin = (phone: string, otp: string) =>
  req('/auth/gardener-login', { method: 'POST', auth: false, body: JSON.stringify({ phone, otp }) });

export const gardenerRegister = (form: FormData) =>
  req('/auth/gardener-register', { method: 'POST', auth: false, body: form });

export const getProfile = () => req('/auth/profile');

// Profile update is multipart/form-data
export const updateProfile = (form: FormData) =>
  req('/auth/profile', { method: 'PUT', body: form });

// ─── ZONES ────────────────────────────────────────────────────────────────────
export const getZones = () => req('/zones', { auth: false });

// Serviceability check: GET not POST, under /payments/ path
export const checkServiceability = (lat: number, lng: number) =>
  req(`/payments/check-serviceability?latitude=${lat}&longitude=${lng}`, { auth: false });

// ─── PLANS & ADDONS ───────────────────────────────────────────────────────────
export const getPlans = () => req('/plans', { auth: false });
export const getAddons = () => req('/addons', { auth: false });

// ─── BOOKINGS (customer) ──────────────────────────────────────────────────────
export const createBooking = (b: {
  zone_id: number; scheduled_date: string; scheduled_time?: string;
  service_address: string; service_latitude: number; service_longitude: number;
  plant_count?: number; preferred_gardener_id?: number; customer_notes?: string;
}) => req('/bookings', { method: 'POST', body: JSON.stringify(b) });

export const getMyBookings = (p?: { status?: string; page?: number; limit?: number }) =>
  req(`/bookings/my${qs(p)}`);

export const getBooking = (id: number) => req(`/bookings/${id}`);

// Cancel = POST /bookings/cancel with body, NOT DELETE
export const cancelBooking = (booking_id: number, reason?: string) =>
  req('/bookings/cancel', { method: 'POST', body: JSON.stringify({ booking_id, ...(reason ? { reason } : {}) }) });

// Rate = POST /bookings/rate with body
export const rateBooking = (booking_id: number, rating: number, review?: string) =>
  req('/bookings/rate', { method: 'POST', body: JSON.stringify({ booking_id, rating, ...(review ? { review } : {}) }) });

export const trackBooking = (booking_id: number) =>
  req(`/bookings/track/${booking_id}`);

// Reschedule = POST /payments/reschedule
export const rescheduleBooking = (booking_id: number, new_date: string, new_time?: string) =>
  req('/payments/reschedule', { method: 'POST', body: JSON.stringify({ booking_id, new_date, ...(new_time ? { new_time } : {}) }) });

export const addBookingAddons = (id: number, addon_ids: { addon_id: number; quantity: number }[]) =>
  req(`/bookings/${id}/addons`, { method: 'POST', body: JSON.stringify({ addon_ids }) });

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
export const createSubscription = (b: any) =>
  req('/subscriptions', { method: 'POST', body: JSON.stringify(b) });

export const getMySubscriptions = () => req('/subscriptions/my');

export const cancelSubscription = (id: number) =>
  req(`/subscriptions/${id}/cancel`, { method: 'PUT' }); // PUT not POST

export const pauseSubscription = (id: number) =>
  req(`/subscriptions/${id}/pause`, { method: 'PATCH' }); // PATCH not POST

export const resumeSubscription = (id: number) =>
  req(`/subscriptions/${id}/resume`, { method: 'PATCH' }); // PATCH not POST

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export const initiatePayment = (b: any) =>
  req('/payments/initiate', { method: 'POST', body: JSON.stringify(b) });

export const getPayments = (page?: number, limit?: number) =>
  req(`/payments/my${qs({ page, limit })}`);

export const walletTopup = (amount: number) =>
  req('/payments/wallet-topup', { method: 'POST', body: JSON.stringify({ amount }) });

// ─── PLANTOPEDIA ──────────────────────────────────────────────────────────────
export const identifyPlant = (form: FormData) =>
  req('/plants/identify', { method: 'POST', body: form });

export const getPlantHistory = () => req('/plants/history');

// ─── BLOGS ────────────────────────────────────────────────────────────────────
export const getBlogs = (p?: any) => req(`/blogs${qs(p)}`, { auth: false });
export const getBlog = (slug: string) => req(`/blogs/${slug}`, { auth: false });

// ─── SHOP ─────────────────────────────────────────────────────────────────────
export const getShopCategories = () => req('/shop/categories', { auth: false });
export const getShopProducts = (p?: any) => req(`/shop/products${qs(p)}`, { auth: false });
export const getProductDetail = (id: number) => req(`/shop/products/${id}`, { auth: false });
export const createOrder = (b: any) => req('/shop/orders', { method: 'POST', body: JSON.stringify(b) });
export const getMyOrders = () => req('/shop/orders/my');

// ─── CITIES ───────────────────────────────────────────────────────────────────
export const getCities = () => req('/cities', { auth: false });
export const getCity = (slug: string) => req(`/cities/${slug}`, { auth: false });

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const getNotifications = () => req('/notifications');
export const markRead = (id: number) => req(`/notifications/${id}/read`, { method: 'PUT' });
export const markAllRead = () => req('/notifications/read-all', { method: 'PUT' });

// ─── COMPLAINTS ───────────────────────────────────────────────────────────────
// type is required (not optional), no "subject" field in swagger
export const createComplaint = (b: {
  type: 'service_quality' | 'late_arrival' | 'no_show' | 'rude_behavior' | 'billing' | 'damage' | 'other';
  description: string;
  booking_id?: number;
  priority?: 'low' | 'medium' | 'high';
}) => req('/complaints', { method: 'POST', body: JSON.stringify(b) });

export const getMyComplaints = () => req('/complaints/my');

// ─── GARDENER ─────────────────────────────────────────────────────────────────
export const getGardenerProfile = () => req('/gardener/profile');
export const updateGardenerProfile = (b: any) =>
  req('/gardener/profile', { method: 'PUT', body: JSON.stringify(b) });

// PATCH not PUT
export const setAvailability = (is_available: boolean) =>
  req('/gardener/availability', { method: 'PATCH', body: JSON.stringify({ is_available }) });

export const getGardenerJobs = (p?: any) =>
  req(`/bookings/gardener/jobs${qs(p)}`);

export const getGardenerEarnings = (period?: 'daily' | 'weekly' | 'monthly') =>
  req(`/bookings/gardener/earnings${qs({ period })}`);

// Gardener verifies customer OTP to start visit
export const verifyVisitOtp = (booking_id: number, otp: string) =>
  req('/bookings/verify-otp', { method: 'POST', body: JSON.stringify({ booking_id, otp }) });

// Status update is multipart/form-data PUT to /bookings/status
export const updateBookingStatus = (form: FormData) =>
  req('/bookings/status', { method: 'PUT', body: form });

// POST /bookings/location
export const updateLocation = (latitude: number, longitude: number, booking_id?: number) =>
  req('/bookings/location', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude, ...(booking_id ? { booking_id } : {}) }),
  });

export const getGardenerRewards = (p?: any) =>
  req(`/gardener/rewards${qs(p)}`);

// ─── ADMIN ────────────────────────────────────────────────────────────────────
export const AdminAPI = {
  dashboard: () => req('/admin/dashboard'),
  analytics: (p?: any) => req(`/admin/analytics${qs(p)}`),
  utilization: (p?: any) => req(`/admin/utilization${qs(p)}`),

  gardeners: (p?: any) => req(`/admin/gardeners${qs(p)}`),
  gardenerDetail: (id: number) => req(`/admin/gardeners/${id}`),
  updateGardener: (id: number, b: any) => req(`/admin/gardeners/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  approveGardener: (id: number, approved: boolean) =>
    req(approved ? '/admin/gardeners/approve' : '/admin/gardeners/reject', {
      method: 'POST', body: JSON.stringify({ user_id: id })
    }),
  deleteGardener: (id: number) => req(`/admin/gardeners/${id}`, { method: 'DELETE' }),
  gardenerDocuments: (id: number) => req(`/admin/gardeners/${id}/documents`),
  updateDocumentStatus: (gardenerId: number, docId: number, status: 'verified' | 'rejected' | 'pending', admin_notes?: string) =>
    req(`/admin/gardeners/${gardenerId}/documents/${docId}`, { method: 'PATCH', body: JSON.stringify({ status, ...(admin_notes ? { admin_notes } : {}) }) }),

  geofences: () => req('/admin/geofence'),
  createGeofence: (b: any) => req('/admin/geofence', { method: 'POST', body: JSON.stringify(b) }),
  updateGeofence: (id: number, b: any) => req(`/admin/geofence/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteGeofence: (id: number) => req(`/admin/geofence/${id}`, { method: 'DELETE' }),

  customers: (p?: any) => req(`/admin/customers${qs(p)}`),
  customerDetail: (id: number) => req(`/admin/customers/${id}`),

  bookings: (p?: any) => req(`/admin/bookings${qs(p)}`),
  bookingDetail: (id: number) => req(`/admin/bookings/${id}`),
  checkGardenerAvailability: (date: string, gardener_id?: number, geofence_id?: number) =>
    req(`/bookings/check-availability${qs({ date, gardener_id, geofence_id })}`),
  reassignBooking: (id: number, gardener_id: number, reason?: string) =>
    req(`/admin/bookings/${id}/reassign`, {
      method: 'PATCH',
      body: JSON.stringify({ gardener_id, ...(reason ? { reason } : {}) }),
    }),

  subscriptions: (p?: any) => req(`/admin/subscriptions${qs(p)}`),

  zones: () => req('/admin/zones'),
  createZone: (b: any) => req('/admin/zones', { method: 'POST', body: JSON.stringify(b) }),
  updateZone: (id: number, b: any) => req(`/admin/zones/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteZone: (id: number) => req(`/admin/zones/${id}`, { method: 'DELETE' }),

  plans: () => req('/admin/plans'),
  createPlan: (b: any) => req('/admin/plans', { method: 'POST', body: JSON.stringify(b) }),
  updatePlan: (id: number, b: any) => req(`/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deletePlan: (id: number) => req(`/admin/plans/${id}`, { method: 'DELETE' }),

  addons: () => req('/admin/addons'),
  createAddon: (b: any) => req('/admin/addons', { method: 'POST', body: JSON.stringify(b) }),
  updateAddon: (id: number, b: any) => req(`/admin/addons/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteAddon: (id: number) => req(`/admin/addons/${id}`, { method: 'DELETE' }),

  supervisors: () => req('/admin/supervisors'),
  createSupervisor: (b: any) => req('/admin/supervisors', { method: 'POST', body: JSON.stringify(b) }),
  updateSupervisor: (id: number, b: any) => req(`/admin/supervisors/${id}`, { method: 'PUT', body: JSON.stringify(b) }),

  faqs: () => req('/admin/faqs'),
  createFaq: (b: any) => req('/admin/faqs', { method: 'POST', body: JSON.stringify(b) }),
  updateFaq: (id: number, b: any) => req(`/admin/faqs/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteFaq: (id: number) => req(`/admin/faqs/${id}`, { method: 'DELETE' }),

  rewards: (p?: any) => req(`/admin/rewards${qs(p)}`),
  createReward: (b: any) => req('/admin/rewards', { method: 'POST', body: JSON.stringify(b) }),

  assignGardenerZone: (gardener_id: number, geofence_ids: number[]) => req(`/admin/gardeners/${gardener_id}/zones`, { method: 'POST', body: JSON.stringify({ geofence_ids }) }),

  slaConfig: () => req('/admin/sla/config'),
  updateSlaConfig: (b: any) => req('/admin/sla/config', { method: 'PUT', body: JSON.stringify(b) }),
  slaBreaches: (p?: any) => req(`/admin/sla/breaches${qs(p)}`),
  resolveBreach: (id: number) => req(`/admin/sla/breaches/${id}/resolve`, { method: 'PUT' }),

  blogs: (p?: any) => req(`/admin/blogs${qs(p)}`),
  getBlogCategories: () => req('/blogs/categories', { auth: false }),
  createBlog: (form: FormData) => req('/admin/blogs', { method: 'POST', body: form }),
  updateBlog: (id: number, form: FormData) => req(`/admin/blogs/${id}`, { method: 'PUT', body: form }),
  deleteBlog: (id: number) => req(`/admin/blogs/${id}`, { method: 'DELETE' }),

  // Complaints admin: GET /complaints (not /admin/complaints)
  complaints: (p?: any) => req(`/complaints${qs(p)}`),
  updateComplaint: (id: number, b: any) => req(`/complaints/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  complaintStats: () => req('/complaints/stats'),

  // City SEO
  cityPages: () => req('/cities'),
  upsertCityPage: (b: any) => req('/admin/cities', { method: 'POST', body: JSON.stringify(b) }),

  // Logs & Audits
  allPayments: (p?: any) => req(`/admin/payments${qs(p)}`),
  plantIdentifications: (p?: any) => req(`/admin/plants/history${qs(p)}`),

  supervisorDashboard: () => req('/supervisor/dashboard'),

  supervisorGardeners: () => req('/supervisor/gardeners'),
  gardenerPerformance: (id: number, period?: string) =>
    req(`/supervisor/gardeners/${id}/performance${qs({ period })}`),

  priceHikeSchedules: () => req('/admin/price-hike/schedules'),
  triggerPriceHike: (b: any) => req('/admin/price-hike', { method: 'POST', body: JSON.stringify(b) }),

  // Shop Management
  shopCategories: () => req('/admin/shop/categories'),
  createShopCategory: (form: FormData) => req('/admin/shop/categories', { method: 'POST', body: form }),
  updateShopCategory: (id: number, form: FormData) => req(`/admin/shop/categories/${id}`, { method: 'PUT', body: form }),
  deleteShopCategory: (id: number) => req(`/admin/shop/categories/${id}`, { method: 'DELETE' }),

  shopProducts: () => req('/admin/shop/products'),
  createShopProduct: (form: FormData) => req('/admin/shop/products', { method: 'POST', body: form }),
  updateShopProduct: (id: number, form: FormData) => req(`/admin/shop/products/${id}`, { method: 'PUT', body: form }),
  deleteShopProduct: (id: number) => req(`/admin/shop/products/${id}`, { method: 'DELETE' }),

  shopOrders: (p?: any) => req(`/admin/shop/orders${qs(p)}`),
  updateOrderStatus: (id: number, status: string) => req(`/admin/shop/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Taglines
  taglines: () => req('/admin/taglines'),
  createTagline: (form: FormData) => req('/admin/taglines', { method: 'POST', body: form }),
  updateTagline: (id: number, form: FormData) => req(`/admin/taglines/${id}`, { method: 'PUT', body: form }),
  deleteTagline: (id: number) => req(`/admin/taglines/${id}`, { method: 'DELETE' }),

  // Tags
  tags: () => req('/admin/tags'),
  createTag: (b: any) => req('/admin/tags', { method: 'POST', body: JSON.stringify(b) }),
  updateTag: (id: number, b: any) => req(`/admin/tags/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteTag: (id: number) => req(`/admin/tags/${id}`, { method: 'DELETE' }),

  // Booking Logs
  bookingLogs: (bookingId: number) => req(`/admin/bookings/${bookingId}/logs`),

  // Reviews Management
  reviews: (p?: any) => req(`/admin/reviews${qs(p)}`),
  updateReview: (id: number, b: any) => req(`/admin/reviews/${id}`, { method: 'PUT', body: JSON.stringify(b) }),

  // Withdrawals
  withdrawals: (p?: any) => req(`/admin/withdrawals${qs(p)}`),
  updateWithdrawal: (id: number, b: any) => req(`/admin/withdrawals/${id}`, { method: 'PUT', body: JSON.stringify(b) }),

  // Global Search
  search: (q: string) => req(`/admin/search?q=${encodeURIComponent(q)}`),

  // Export Reports
  exportReport: (type: string, format?: string) => `${API_BASE}/admin/reports/export?type=${type}&format=${format || 'csv'}&token=${getToken()}`,

  // Contact Messages
  contacts: (p?: any) => req(`/admin/contacts${qs(p)}`),

  // System Settings
  settings: () => req('/admin/settings'),
  updateSetting: (key: string, value: string) => req(`/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),

  sendBroadcast: (b: { title: string; body: string; type: string; geofence_id?: number; target_role?: string }) =>
    req('/admin/notifications/broadcast', { method: 'POST', body: JSON.stringify(b) }),

  // Order Tracking
  updateOrderTracking: (id: number, b: any) => req(`/admin/shop/orders/${id}/tracking`, { method: 'PUT', body: JSON.stringify(b) }),

  // Product Zone Pricing
  productZonePrices: () => req('/admin/product-zone-prices'),
  upsertProductZonePrice: (b: any) => req('/admin/product-zone-prices', { method: 'POST', body: JSON.stringify(b) }),
  deleteProductZonePrice: (id: number) => req(`/admin/product-zone-prices/${id}`, { method: 'DELETE' }),

  // Supervisor-Gardener Assignment
  assignGardenersToSupervisor: (supervisorId: number, gardener_ids: number[]) =>
    req(`/admin/supervisors/${supervisorId}/gardeners`, { method: 'POST', body: JSON.stringify({ gardener_ids }) }),
  removeGardenerFromSupervisor: (supervisorId: number, gardenerId: number) =>
    req(`/admin/supervisors/${supervisorId}/gardeners/${gardenerId}`, { method: 'DELETE' }),

  // Gardener Zones
  gardenerZones: (id: number) => req(`/admin/gardeners/${id}/zones`),
  removeGardenerZone: (id: number, geofence_id: number) =>
    req(`/admin/gardeners/${id}/zones/${geofence_id}`, { method: 'DELETE' }),

  // Toggle gardener active status
  toggleGardener: (id: number) => req(`/admin/gardeners/${id}/toggle`, { method: 'PATCH' }),
};

// ─── PUBLIC APIs ──────────────────────────────────────────────────────────────
export const getPublicReviews = (p?: any) => req(`/reviews${qs(p)}`, { auth: false });
export const getSocialProof = () => req('/social-proof', { auth: false });
export const getPublicFaqs = () => req('/faqs', { auth: false });
export const submitContact = (b: { name: string; email?: string; phone?: string; message: string }) =>
  req('/contact', { method: 'POST', auth: false, body: JSON.stringify(b) });
export const getSetting = (key: string) => req(`/settings/${key}`, { auth: false });

// Tip & Review (customer)
export const tipGardener = (bookingId: number, amount: number) =>
  req(`/bookings/${bookingId}/tip`, { method: 'POST', body: JSON.stringify({ amount }) });
export const submitReview = (bookingId: number, rating: number, comment?: string) =>
  req(`/bookings/${bookingId}/review`, { method: 'POST', body: JSON.stringify({ rating, comment }) });

// Gardener Withdrawals
export const requestWithdrawal = (amount: number) =>
  req('/gardener/withdraw', { method: 'POST', body: JSON.stringify({ amount }) });
export const getMyWithdrawals = () => req('/gardener/withdrawals');
