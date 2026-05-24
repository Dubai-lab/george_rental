import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Store, Area } from '@/types'
import Pill from '@/components/ui/Pill'
import StoreThumb from '@/components/ui/StoreThumb'
import Btn from '@/components/ui/Btn'
import { IconSearch, IconDots, IconClose } from '@/components/ui/Icons'
import mapboxgl from 'mapbox-gl'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

type Filter = 'all' | 'paid' | 'due' | 'overdue' | 'vacant'
type StoreWithArea = Store & { area: Area | null }

// ── Store form modal ────────────────────────────────────────────
interface StoreFormProps {
  areas: Area[]
  initial?: StoreWithArea | null
  onClose: () => void
  onSaved: () => void
}

function StoreForm({ areas, initial, onClose, onSaved }: StoreFormProps) {
  const isEdit = !!initial
  const qc     = useQueryClient()
  const [code,        setCode]        = useState(initial?.code ?? '')
  const [name,        setName]        = useState(initial?.name ?? '')
  const [address,     setAddress]     = useState(initial?.address ?? '')
  const [areaId,      setAreaId]      = useState(initial?.area_id ?? '')
  const [rent,        setRent]        = useState(String(initial?.rent_usd ?? ''))
  const [photos,      setPhotos]      = useState<string[]>(initial?.photos ?? [])
  const [videoUrl,    setVideoUrl]    = useState(initial?.video_url ?? '')
  const [err,         setErr]         = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [localAreas,  setLocalAreas]  = useState<Area[]>(areas)
  const [showAddArea, setShowAddArea] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [addingArea,  setAddingArea]  = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  async function createArea() {
    if (!newAreaName.trim()) return
    setAddingArea(true)
    const { data, error } = await supabase
      .from('areas')
      .insert({ name: newAreaName.trim(), city: 'Monrovia' })
      .select()
      .single()
    if (error) { setErr(error.message); setAddingArea(false); return }
    const created = data as Area
    const updated = [...localAreas, created].sort((a, b) => a.name.localeCompare(b.name))
    setLocalAreas(updated)
    setAreaId(created.id)
    setNewAreaName('')
    setShowAddArea(false)
    setAddingArea(false)
    qc.invalidateQueries({ queryKey: ['areas'] })
  }

  async function uploadPhotos(files: FileList) {
    setUploading(true)
    try {
      const storeId = initial?.id ?? `new-${Date.now()}`
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const ext  = file.name.split('.').pop()
        const path = `stores/${storeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('store-photos').upload(path, file, { upsert: true })
        if (error) { setErr(error.message); break }
        else {
          const { data: { publicUrl } } = supabase.storage.from('store-photos').getPublicUrl(path)
          uploaded.push(publicUrl)
        }
      }
      setPhotos(prev => [...prev, ...uploaded])
    } catch (e: any) {
      setErr(e?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function uploadVideo(file: File) {
    if (!file.type.startsWith('video/')) { setErr('Please select a video file (MP4, MOV, etc.)'); return }
    if (file.size > 100 * 1024 * 1024) { setErr('Video must be under 100 MB'); return }
    setUploading(true)
    try {
      const storeId = initial?.id ?? `new-${Date.now()}`
      const ext  = file.name.split('.').pop()
      const path = `stores/${storeId}/video.${ext}`
      const { error } = await supabase.storage.from('store-photos').upload(path, file, { upsert: true })
      if (error) { setErr(error.message); return }
      const { data: { publicUrl } } = supabase.storage.from('store-photos').getPublicUrl(path)
      setVideoUrl(publicUrl)
    } catch (e: any) {
      setErr(e?.message ?? 'Video upload failed')
    } finally {
      setUploading(false)
    }
  }

  function removePhoto(url: string) {
    setPhotos(prev => prev.filter(p => p !== url))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim() || !rent) { setErr('Code, name and rent are required.'); return }
    const rentNum = parseFloat(rent)
    if (isNaN(rentNum) || rentNum <= 0) { setErr('Rent must be a positive number.'); return }
    setSaving(true)
    setErr(null)
    const payload = {
      code:      code.trim(),
      name:      name.trim(),
      address:   address.trim() || null,
      area_id:   areaId || null,
      rent_usd:  rentNum,
      photos,
      photo_url: photos[0] ?? null,
      video_url: videoUrl.trim() || null,
    }
    if (isEdit) {
      const { error } = await supabase.from('stores').update(payload).eq('id', initial!.id)
      if (error) { setErr(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('stores').insert({ ...payload, status: 'vacant' })
      if (error) { setErr(error.message); setSaving(false); return }
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(6,9,20,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 40px 80px rgba(6,9,20,0.3)', margin: 'auto' }}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--gr-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--gr-ink)' }}>
              {isEdit ? 'Edit Store' : 'Add New Store'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginTop: 2 }}>
              {isEdit ? `Editing ${initial!.code}` : 'Fill in the store details below'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gr-stone-2)', padding: 4 }}>
            <IconClose size={18} stroke="currentColor" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {err && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(209,31,44,0.06)', border: '1px solid rgba(209,31,44,0.2)', color: 'var(--gr-crimson)', fontSize: 13 }}>
              {err}
            </div>
          )}

          {/* Basic info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>Store Code *</label>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. GR-151" style={inp} />
              <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 4 }}>Must be unique</div>
            </div>
            <div>
              <label style={lbl}>Monthly Rent (USD) *</label>
              <input value={rent} onChange={e => setRent(e.target.value)} type="number" min="0" step="10" placeholder="e.g. 300" style={inp} />
            </div>
          </div>

          <div>
            <label style={lbl}>Store Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Broad Street #51" style={inp} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>Area</label>
              <select value={areaId} onChange={e => setAreaId(e.target.value)} style={inp}>
                <option value="">— No area —</option>
                {localAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              {/* Inline area creator */}
              {!showAddArea ? (
                <button
                  type="button"
                  onClick={() => setShowAddArea(true)}
                  style={{ marginTop: 5, fontSize: 12, fontWeight: 600, color: 'var(--gr-crimson)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  + Add new area
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input
                    autoFocus
                    value={newAreaName}
                    onChange={e => setNewAreaName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createArea() } if (e.key === 'Escape') { setShowAddArea(false); setNewAreaName('') } }}
                    placeholder="e.g. Red Light"
                    style={{ ...inp, height: 34, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={createArea}
                    disabled={addingArea || !newAreaName.trim()}
                    style={{ height: 34, padding: '0 12px', borderRadius: 8, background: 'var(--gr-crimson)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: addingArea || !newAreaName.trim() ? 0.5 : 1 }}
                  >
                    {addingArea ? '…' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddArea(false); setNewAreaName('') }}
                    style={{ height: 34, padding: '0 10px', borderRadius: 8, background: 'var(--gr-paper)', color: 'var(--gr-stone)', border: '1px solid var(--gr-line)', fontSize: 13, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 20 Broad St" style={inp} />
            </div>
          </div>

          {/* ── Photos ─────────────────────────────────────── */}
          <div>
            <label style={lbl}>Store Photos</label>

            {/* Existing photo previews */}
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {photos.map((url, i) => (
                  <div key={url} style={{ position: 'relative', width: 80, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--gr-line)' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {i === 0 && (
                      <div style={{ position: 'absolute', top: 2, left: 2, background: 'rgba(6,9,20,0.7)', borderRadius: 4, padding: '1px 5px', fontSize: 9, color: '#fff', fontWeight: 700 }}>
                        COVER
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 99, background: 'rgba(209,31,44,0.85)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => e.target.files && uploadPhotos(e.target.files)}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%', padding: '14px', borderRadius: 10,
                border: '2px dashed var(--gr-line)', background: 'var(--gr-paper)',
                cursor: 'pointer', fontSize: 13, color: 'var(--gr-stone)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {uploading ? '⏳ Uploading…' : '📷 Click to upload photos'}
            </button>
            <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 4 }}>
              JPG, PNG, WebP · Multiple allowed · First photo is the cover image
            </div>
          </div>

          {/* ── Video ──────────────────────────────────────── */}
          <div>
            <label style={lbl}>Store Video <span style={{ fontWeight: 400, color: 'var(--gr-stone-2)' }}>(optional)</span></label>

            {videoUrl && (
              <div style={{ marginBottom: 10, position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
                <video src={videoUrl} controls style={{ width: '100%', maxHeight: 160, display: 'block' }} />
                <button
                  type="button"
                  onClick={() => setVideoUrl('')}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(209,31,44,0.85)', border: 'none', borderRadius: 6, padding: '3px 8px', color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                >
                  Remove
                </button>
              </div>
            )}

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && uploadVideo(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%', padding: '14px', borderRadius: 10,
                border: '2px dashed var(--gr-line)', background: 'var(--gr-paper)',
                cursor: 'pointer', fontSize: 13, color: 'var(--gr-stone)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {uploading ? '⏳ Uploading…' : '🎥 Click to upload a video tour'}
            </button>
            <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 4 }}>
              MP4, MOV, WebM · Max 100 MB · Shows on the public store listing
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <Btn kind="ghost" style={{ flex: 1 }} onClick={onClose} type="button">Cancel</Btn>
            <Btn kind="crimson" style={{ flex: 2 }} type="submit" loading={saving || uploading}>
              {isEdit ? 'Save changes' : 'Add store'}
            </Btn>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Store row dots menu ─────────────────────────────────────────
function StoreMenu({ store, onEdit, onToggle, onDelete }: { store: StoreWithArea; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gr-stone-2)', padding: 4, borderRadius: 6 }}>
        <IconDots size={16} stroke="currentColor" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, background: '#fff', border: '1px solid var(--gr-line)', borderRadius: 10, boxShadow: '0 8px 24px rgba(6,9,20,0.12)', overflow: 'hidden', minWidth: 160 }}
          >
            <button onClick={() => { setOpen(false); onEdit() }} style={menuBtn}>
              ✏️ Edit store
            </button>
            <button onClick={() => { setOpen(false); onToggle() }} style={{ ...menuBtn, color: store.status === 'occupied' ? 'var(--gr-stone)' : 'var(--gr-mint)' }}>
              {store.status === 'occupied' ? '🔓 Mark vacant' : '🔒 Mark occupied'}
            </button>
            <div style={{ borderTop: '1px solid var(--gr-line)', margin: '4px 0' }} />
            <button onClick={() => { setOpen(false); onDelete() }} style={{ ...menuBtn, color: '#D11F2C' }}>
              🗑️ Delete store
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Stores page ────────────────────────────────────────────
export default function Stores() {
  const [filter,    setFilter]    = useState<Filter>('all')
  const [view,      setView]      = useState<'list' | 'map'>('list')
  const [search,    setSearch]    = useState('')
  const [addOpen,       setAddOpen]       = useState(false)
  const [editStore,     setEditStore]     = useState<StoreWithArea | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<StoreWithArea | null>(null)
  const [deleting,      setDeleting]      = useState(false)
  const mapRef      = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<mapboxgl.Map | null>(null)
  const qc          = useQueryClient()

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['stores-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*, area:areas(*)')
        .order('code')
      if (error) throw error
      return (data ?? []) as StoreWithArea[]
    },
    staleTime: 30_000,
  })

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ['areas'],
    queryFn: async () => {
      const { data } = await supabase.from('areas').select('*').order('name')
      return (data ?? []) as Area[]
    },
  })

  const { data: leases = [] } = useQuery({
    queryKey: ['stores-active-leases'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leases')
        .select('store_id, tenant:profiles(full_name)')
        .eq('status', 'active')
      return (data ?? []) as { store_id: string; tenant: { full_name: string } | null }[]
    },
    staleTime: 60_000,
  })

  const { data: payments = [] } = useQuery({
    queryKey: ['payments-month'],
    queryFn: async () => {
      const month = new Date().toISOString().slice(0, 7)
      const { data } = await supabase
        .from('payments')
        .select('store_id, status')
        .eq('period_month', month)
      return data ?? []
    },
    staleTime: 30_000,
  })

  const toggleStatus = useMutation({
    mutationFn: async (store: StoreWithArea) => {
      const next = store.status === 'occupied' ? 'vacant' : 'occupied'
      const { error } = await supabase.from('stores').update({ status: next }).eq('id', store.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores-full'] }),
  })

  async function deleteStore(store: StoreWithArea) {
    setDeleting(true)
    try {
      const { error } = await supabase.from('stores').delete().eq('id', store.id)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['stores-full'] })
      setConfirmDelete(null)
    } catch (e: any) {
      alert(e?.message ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  function storePaymentStatus(storeId: string): 'paid' | 'pending' | 'overdue' | 'vacant' | 'due' {
    const store = stores.find(s => s.id === storeId)
    if (store?.status === 'vacant') return 'vacant'
    const pmt = payments.find((p: any) => p.store_id === storeId)
    if (!pmt) return 'due'
    if (pmt.status === 'confirmed') return 'paid'
    if (pmt.status === 'rejected')  return 'overdue'
    return 'pending'
  }

  const filtered = stores.filter(s => {
    const ps = storePaymentStatus(s.id)
    const matchFilter = filter === 'all' || ps === filter
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.area?.name ?? '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const grouped = Array.from(new Set(stores.map(s => s.area?.name ?? 'Other'))).sort().map(area => ({
    area,
    stores: filtered.filter(s => (s.area?.name ?? 'Other') === area),
  })).filter(g => g.stores.length > 0)

  // Mapbox
  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !import.meta.env.VITE_MAPBOX_TOKEN) return
    mapInstance.current = new mapboxgl.Map({ container: mapRef.current, style: 'mapbox://styles/mapbox/dark-v11', center: [-10.8037, 6.3156], zoom: 13 })
    mapInstance.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    return () => { mapInstance.current?.remove(); mapInstance.current = null }
  }, [view])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || !stores.length) return
    const onLoad = () => {
      stores.forEach(s => {
        if (s.lat == null || s.lng == null) return
        const ps = storePaymentStatus(s.id)
        const color = ps === 'paid' ? '#2FB875' : ps === 'overdue' ? '#D11F2C' : ps === 'vacant' ? 'rgba(246,241,228,0.5)' : '#E9B949'
        const el = document.createElement('div')
        el.style.cssText = `width:28px;height:28px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;cursor:pointer;`
        new mapboxgl.Marker({ element: el }).setLngLat([s.lng, s.lat]).setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML(`<b>${s.name}</b><br>$${s.rent_usd}/mo`)).addTo(map)
      })
    }
    if (map.loaded()) onLoad(); else map.on('load', onLoad)
  }, [stores, payments])

  const filterCounts = {
    all:     stores.length,
    paid:    stores.filter(s => storePaymentStatus(s.id) === 'paid').length,
    due:     stores.filter(s => storePaymentStatus(s.id) === 'due').length,
    overdue: stores.filter(s => storePaymentStatus(s.id) === 'overdue').length,
    vacant:  stores.filter(s => s.status === 'vacant').length,
  }

  const filterConfig: { id: Filter; label: string; tone?: string }[] = [
    { id: 'all',     label: 'All'     },
    { id: 'paid',    label: 'Paid'    },
    { id: 'due',     label: 'Due'     },
    { id: 'overdue', label: 'Overdue', tone: 'rust' },
    { id: 'vacant',  label: 'Vacant',  tone: 'gold' },
  ]

  function getTenantName(storeId: string): string | null {
    return leases.find(l => l.store_id === storeId)?.tenant?.full_name ?? null
  }

  function refreshStores() { qc.invalidateQueries({ queryKey: ['stores-full'] }) }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ height: 60, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--gr-line-2)', background: '#fff', flexShrink: 0 }}>
        {/* Search */}
        <div style={{ position: 'relative', width: 220 }}>
          <IconSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gr-stone-2)', pointerEvents: 'none' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search stores…"
            style={{ width: '100%', height: 34, paddingLeft: 32, paddingRight: 12, borderRadius: 8, border: '1px solid var(--gr-line)', background: 'var(--gr-paper)', fontSize: 13, color: 'var(--gr-ink)', outline: 'none' }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6 }}>
          {filterConfig.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999,
              background: filter === f.id ? 'var(--gr-navy)' : 'transparent',
              color: filter === f.id ? 'var(--gr-cream)' : 'var(--gr-stone)',
              border: filter === f.id ? 'none' : '1px solid var(--gr-line)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>
              {f.label}
              <span style={{ padding: '0 6px', fontSize: 11, lineHeight: '17px', borderRadius: 99, fontWeight: 600, background: filter === f.id ? 'rgba(246,241,228,0.18)' : 'var(--gr-paper)', color: filter === f.id ? 'var(--gr-cream)' : 'var(--gr-stone)' }}>
                {filterCounts[f.id]}
              </span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: 'inline-flex', padding: 3, background: 'var(--gr-paper)', borderRadius: 8, border: '1px solid var(--gr-line)', marginRight: 8 }}>
          {(['list', 'map'] as const).map(v => (
            <span key={v} onClick={() => setView(v)} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6, cursor: 'pointer', background: view === v ? '#fff' : 'transparent', color: view === v ? 'var(--gr-ink)' : 'var(--gr-stone-2)', boxShadow: view === v ? 'var(--sh-1)' : 'none', textTransform: 'capitalize' }}>
              {v}
            </span>
          ))}
        </div>

        {/* Add store button */}
        <Btn kind="crimson" size="sm" onClick={() => setAddOpen(true)}>
          + Add Store
        </Btn>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: view === 'map' ? '1fr 520px' : '1fr', minHeight: 0 }}>
        {/* List */}
        <div style={{ overflow: 'auto', padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {isLoading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--gr-stone-2)' }}>Loading stores…</div>}
          {grouped.map(({ area, stores: areaStores }) => (
            <AreaGroup
              key={area}
              title={area}
              stores={areaStores}
              getStatus={storePaymentStatus}
              getTenant={getTenantName}
              onEdit={s => setEditStore(s)}
              onToggle={s => toggleStatus.mutate(s)}
              onDelete={s => setConfirmDelete(s)}
            />
          ))}
          {!isLoading && filtered.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏪</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gr-ink)', marginBottom: 4 }}>No stores found</div>
              <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginBottom: 20 }}>Try a different filter, or add your first store.</div>
              <Btn kind="crimson" size="sm" onClick={() => setAddOpen(true)}>+ Add Store</Btn>
            </div>
          )}
        </div>

        {/* Map */}
        {view === 'map' && (
          <div style={{ borderLeft: '1px solid var(--gr-line)', position: 'relative' }}>
            {import.meta.env.VITE_MAPBOX_TOKEN && import.meta.env.VITE_MAPBOX_TOKEN !== 'pk.eyJ1IjoiZ2VvcmdlcmVudGFsIiwiYSI6ImNteHgifQ.placeholder' ? (
              <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            ) : (
              <FallbackMap />
            )}
          </div>
        )}
      </div>

      {/* Add modal */}
      <AnimatePresence>
        {addOpen && (
          <StoreForm areas={areas} onClose={() => setAddOpen(false)} onSaved={refreshStores} />
        )}
      </AnimatePresence>

      {/* Edit modal */}
      <AnimatePresence>
        {editStore && (
          <StoreForm areas={areas} initial={editStore} onClose={() => setEditStore(null)} onSaved={refreshStores} />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(6,9,20,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => !deleting && setConfirmDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 24px 64px rgba(6,9,20,0.2)' }}
            >
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 8 }}>Delete store?</div>
              <div style={{ fontSize: 14, color: 'var(--gr-stone-2)', lineHeight: 1.6, marginBottom: 24 }}>
                Are you sure you want to delete <strong>{confirmDelete.code} — {confirmDelete.name}</strong>? This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn kind="ghost" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)} type="button" disabled={deleting}>Cancel</Btn>
                <button
                  type="button"
                  onClick={() => deleteStore(confirmDelete)}
                  disabled={deleting}
                  style={{ flex: 2, height: 44, borderRadius: 10, background: '#D11F2C', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Area group ──────────────────────────────────────────────────
function AreaGroup({ title, stores, getStatus, getTenant, onEdit, onToggle, onDelete }: {
  title: string
  stores: StoreWithArea[]
  getStatus: (id: string) => string
  getTenant: (id: string) => string | null
  onEdit: (s: StoreWithArea) => void
  onToggle: (s: StoreWithArea) => void
  onDelete: (s: StoreWithArea) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const expectedTotal = stores.reduce((s, st) => s + st.rent_usd, 0)
  const occupied = stores.filter(s => s.status === 'occupied').length

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
        <h3 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 15, color: 'var(--gr-ink)', margin: 0 }}>{title}, Monrovia</h3>
        <span style={{ fontSize: 12, color: 'var(--gr-stone-2)' }}>
          {stores.length} stores · {occupied} occupied · ${expectedTotal.toLocaleString()} expected/mo
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={() => setCollapsed(v => !v)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--gr-stone-2)', cursor: 'pointer' }}>
          {collapsed ? 'Expand ▸' : 'Collapse ▾'}
        </button>
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', background: '#fff', border: '1px solid var(--gr-line)', borderRadius: 12 }}
          >
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '44px 140px 1.2fr 1fr 100px 110px 36px', gap: 12, padding: '9px 16px', fontSize: 11, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gr-line-2)', background: 'var(--gr-paper)' }}>
              <span /><span>Code / Name</span><span>Tenant</span><span>Address</span><span style={{ textAlign: 'right' }}>Rent/mo</span><span>Status</span><span />
            </div>

            {stores.map((s, i) => {
              const ps = getStatus(s.id)
              const pilTone = ps === 'paid' ? 'mint' : ps === 'overdue' ? 'rust' : ps === 'vacant' ? 'navy' : 'gold'
              const pilLabel = ps === 'paid' ? 'Paid' : ps === 'overdue' ? 'Overdue' : ps === 'vacant' ? 'Vacant' : 'Due'
              return (
                <motion.div
                  key={s.id}
                  whileHover={{ background: 'rgba(11,26,61,0.02)' }}
                  style={{ display: 'grid', gridTemplateColumns: '44px 140px 1.2fr 1fr 100px 110px 36px', gap: 12, padding: '11px 16px', alignItems: 'center', borderBottom: i < stores.length - 1 ? '1px solid var(--gr-line-2)' : 'none' }}
                >
                  <StoreThumb seed={i} w={36} h={28} />
                  <div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--gr-stone-2)' }}>{s.code}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)' }}>{s.name}</div>
                  </div>
                  <div style={{ fontSize: 13, color: s.status === 'vacant' ? 'var(--gr-stone-2)' : 'var(--gr-ink)' }}>
                    {s.status === 'vacant'
                      ? <span style={{ fontStyle: 'italic' }}>Unoccupied</span>
                      : (getTenant(s.id) ?? <span style={{ color: 'var(--gr-stone-2)' }}>—</span>)
                    }
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.address ?? '—'}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--gr-ink)' }}>
                    ${s.rent_usd.toLocaleString()}
                  </div>
                  <Pill tone={pilTone} dot>{pilLabel}</Pill>
                  <StoreMenu store={s} onEdit={() => onEdit(s)} onToggle={() => onToggle(s)} onDelete={() => onDelete(s)} />
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// ── Fallback SVG map ────────────────────────────────────────────
function FallbackMap() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0E1B40', color: 'rgba(246,241,228,0.5)', gap: 12 }}>
      <div style={{ fontSize: 40 }}>🗺️</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>No Mapbox token configured</div>
      <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
        Add <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>VITE_MAPBOX_TOKEN</code> to your <code>.env.local</code> to enable the live map.
      </div>
    </div>
  )
}

// ── Shared styles ───────────────────────────────────────────────
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gr-stone)', marginBottom: 5 }
const inp: React.CSSProperties = { width: '100%', height: 42, padding: '0 12px', borderRadius: 9, border: '1px solid var(--gr-line)', background: 'var(--gr-paper)', fontSize: 14, color: 'var(--gr-ink)', outline: 'none' }
const menuBtn: React.CSSProperties = { width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: 'var(--gr-ink)', display: 'block' }
