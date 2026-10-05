// Shapes of the database rows the tenant app reads (same schema as the website)

export type UserRole          = 'owner' | 'tenant'
export type PaymentMethod     = 'mtn_momo' | 'orange_money' | 'bank_transfer' | 'cash'
export type PaymentStatus     = 'pending' | 'confirmed' | 'rejected'
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved'
export type Priority          = 'low' | 'medium' | 'high'

export interface Profile {
  id:         string
  role:       UserRole
  full_name:  string
  email:      string | null
  phone:      string | null
  avatar_url: string | null
  created_at: string
}

export interface Store {
  id:        string
  area_id:   string | null
  code:      string
  name:      string
  address:   string | null
  photo_url: string | null
  rent_usd:  number
  status:    'occupied' | 'vacant'
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
  status:           'active' | 'ended'
  agreement_url:    string | null
  created_at:       string
  store?:           Partial<Store> | null
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
  notes:           string | null
  receipt_number:  string | null
  created_at:      string
  lease?:          { lease_code?: string | null; store?: Partial<Store> | null } | null
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
}
