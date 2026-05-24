export type UserRole        = 'owner' | 'tenant'
export type PaymentMethod  = 'mtn_momo' | 'bank_transfer' | 'cash'
export type PaymentStatus  = 'pending' | 'confirmed' | 'rejected'
export type LeaseStatus    = 'active' | 'ended'
export type StoreStatus    = 'occupied' | 'vacant'
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved'
export type Priority       = 'low' | 'medium' | 'high'

export interface Profile {
  id:         string
  role:       UserRole
  full_name:  string
  email:      string | null
  phone:      string | null
  avatar_url: string | null
  created_at: string
}

export interface Area {
  id:         string
  name:       string
  city:       string
  created_at: string
}

export interface Store {
  id:         string
  area_id:    string | null
  code:       string
  name:       string
  address:    string | null
  lat:        number | null
  lng:        number | null
  photo_url:  string | null
  photos:     string[]
  video_url:  string | null
  rent_usd:   number
  status:     StoreStatus
  created_at: string
  area?:      Area
  active_lease?: Lease | null
}

export interface Lease {
  id:               string
  store_id:         string
  tenant_id:        string
  lease_code:       string | null
  business_name:    string | null
  business_type:    string | null
  monthly_rent_usd: number
  start_date:       string
  end_date:         string | null
  status:           LeaseStatus
  agreement_url:    string | null
  created_at:       string
  tenant?:          Profile
  store?:           Store
}

export interface Payment {
  id:              string
  lease_id:        string
  tenant_id:       string
  store_id:        string
  amount_usd:      number
  amount_lrd:      number | null
  fx_rate:         number
  method:          PaymentMethod
  period_month:    string
  months_count:    number
  due_day:         number | null
  transaction_ref: string | null
  proof_url:       string | null
  status:          PaymentStatus
  confirmed_at:    string | null
  confirmed_by:    string | null
  notes:           string | null
  receipt_number:  string | null
  created_at:      string
  tenant?:         Profile
  store?:          Store
  lease?:          Lease
}

export interface MaintenanceRequest {
  id:          string
  lease_id:    string
  tenant_id:   string
  store_id:    string
  title:       string
  description: string | null
  status:      MaintenanceStatus
  priority:    Priority
  created_at:  string
  updated_at:  string
  tenant?:     Profile
  store?:      Store
}

export interface StoreEnquiry {
  id:         string
  store_id:   string
  name:       string
  email:      string | null
  phone:      string | null
  message:    string | null
  status:     'new' | 'read' | 'contacted'
  created_at: string
  store?:     Pick<Store, 'code' | 'name' | 'rent_usd'> | null
}

export interface FxRate {
  id:         string
  rate:       number
  set_by:     string | null
  created_at: string
}

export interface DashboardStats {
  collectedUsd:      number
  collectedLrd:      number
  expectedUsd:       number
  totalStores:       number
  occupiedStores:    number
  overdueCount:      number
  overdueAmountUsd:  number
  nextMonthExpected: number
}
