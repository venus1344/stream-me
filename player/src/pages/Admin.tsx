import { useState, useEffect, useCallback } from 'react'
import NavBar from '../components/NavBar'
import GlowBackground from '../components/GlowBackground'
import { apiFetch, getUser, clearToken } from '../lib/auth'
import { useNavItems } from '../lib/useNavItems'

interface User {
  id: string
  email: string
  role: string
  tenantId?: string
  tenantName?: string
}

interface Tenant {
  id: string
  name: string
  plan: string
  admin: User | null
  users: User[]
}

interface Server {
  id: string
  name: string
  serverId: string
  tenantId?: string
  createdAt: string
  tenantName?: string
  status?: string
  workerUrl?: string
  ingestHost?: string
  ingestPort?: number
  omeUrl?: string
}

// ── helpers ───────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    superuser: 'bg-accent/15 text-accent border-accent/30',
    manager:   'bg-blue/10 text-blue border-blue/30',
    user:      'bg-surface-2 text-muted border-border',
  }
  const label: Record<string, string> = {
    superuser: 'Super',
    manager:   'Admin',
    user:      'User',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-black tracking-wide ${styles[role] ?? styles.user}`}>
      {label[role] ?? role}
    </span>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-amber/30 bg-amber/10 text-amber text-[10px] font-black tracking-wide">
      {plan}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-accent text-xs font-extrabold tracking-[1.2px] uppercase">{children}</span>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-muted text-sm py-2">{text}</p>
}

// ── SuperUser view ────────────────────────────────────────────────────────────

function SuperUserPanel({
  users, tenants, servers,
  expandedTenants, toggleTenant,
  expandedServers, toggleServer,
  onSetPlan, savingPlan,
}: {
  users: User[]
  tenants: Tenant[]
  servers: Server[]
  expandedTenants: Set<string>
  toggleTenant: (id: string) => void
  expandedServers: Set<string>
  toggleServer: (id: string) => void
  onSetPlan: (id: string, plan: string) => Promise<void>
  savingPlan: string | null
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* All Users */}
      <section className="bg-surface border border-border-3 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <SectionLabel>All Users</SectionLabel>
          <span className="text-muted text-xs font-bold">{users.length} total</span>
        </div>
        <div className="divide-y divide-border">
          {users.length === 0
            ? <div className="px-6 py-4"><EmptyRow text="No users yet" /></div>
            : users.map(u => (
              <div key={u.id} className="px-6 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs font-black text-muted shrink-0">
                  {u.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text truncate">{u.email}</p>
                  <p className="text-xs text-muted">{u.tenantName ?? `Tenant #${u.tenantId}`}</p>
                </div>
                <RoleBadge role={u.role} />
              </div>
            ))
          }
        </div>
      </section>

      {/* Tenants */}
      <section className="bg-surface border border-border-3 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <SectionLabel>Tenants</SectionLabel>
          <span className="text-muted text-xs font-bold">{tenants.length} total</span>
        </div>
        <div className="divide-y divide-border">
          {tenants.length === 0
            ? <div className="px-6 py-4"><EmptyRow text="No tenants yet" /></div>
            : tenants.map(t => (
              <div key={t.id}>
                <button
                  onClick={() => toggleTenant(t.id)}
                  className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-surface-2 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <strong className="text-text font-extrabold">{t.name}</strong>
                      <PlanBadge plan={t.plan} />
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      Admin: {t.admin?.email ?? 'None'} · {t.users.length} member{t.users.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`w-4 h-4 text-muted shrink-0 transition-transform ${expandedTenants.has(t.id) ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {expandedTenants.has(t.id) && (
                  <div className="bg-surface-2 border-t border-border px-6 py-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3 py-1.5">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">Plan</span>
                      <select
                        value={t.plan}
                        onChange={e => onSetPlan(t.id, e.target.value)}
                        className="bg-surface-3 border border-border-2 rounded-[10px] px-2.5 py-1.5 text-xs font-bold text-text outline-none focus:border-accent cursor-pointer"
                      >
                        <option value="free">Free · 1 dest · 2.5 Mbps</option>
                        <option value="pro">Pro · 3 dest · 6 Mbps</option>
                      </select>
                      {savingPlan === t.id && <span className="text-xs text-muted">saving…</span>}
                    </div>
                    {t.users.length === 0
                      ? <EmptyRow text="No members" />
                      : t.users.map(u => (
                        <div key={u.id} className="flex items-center gap-3 py-1.5">
                          <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-black text-muted shrink-0">
                            {u.email[0].toUpperCase()}
                          </div>
                          <span className="text-sm text-text flex-1 truncate">{u.email}</span>
                          <RoleBadge role={u.role} />
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))
          }
        </div>
      </section>

      {/* Servers */}
      <section className="bg-surface border border-border-3 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <SectionLabel>Servers</SectionLabel>
          <span className="text-muted text-xs font-bold">{servers.length} total</span>
        </div>
        <div className="divide-y divide-border">
          {servers.length === 0
            ? <div className="px-6 py-4"><EmptyRow text="No servers registered" /></div>
            : servers.map(s => (
              <div key={s.id}>
                <button
                  onClick={() => toggleServer(s.id)}
                  className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-surface-2 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-muted">
                      <rect x="2" y="2" width="20" height="8" rx="2" />
                      <rect x="2" y="14" width="20" height="8" rx="2" />
                      <line x1="6" y1="6" x2="6.01" y2="6" />
                      <line x1="6" y1="18" x2="6.01" y2="18" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text">{s.name}</p>
                    <p className="text-xs text-muted font-mono">{s.serverId}</p>
                  </div>
                  {s.status && (
                    <span className={`text-xs border rounded-full px-2.5 py-1 shrink-0 ${s.status === 'healthy' ? 'text-green border-green/30' : 'text-amber border-amber/30'}`}>{s.status}</span>
                  )}
                  {s.tenantName && (
                    <span className="text-xs text-muted border border-border rounded-full px-2.5 py-1 shrink-0">{s.tenantName}</span>
                  )}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`w-4 h-4 text-muted shrink-0 transition-transform ${expandedServers.has(s.id) ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {expandedServers.has(s.id) && (
                  <div className="bg-surface-2 border-t border-border px-6 py-3">
                    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                      <div className="bg-surface border border-border rounded-[14px] p-3">
                        <span className="block text-muted text-[0.7rem] uppercase tracking-wider mb-1">Server ID</span>
                        <strong className="text-sm font-bold font-mono break-all">{s.serverId}</strong>
                      </div>
                      <div className="bg-surface border border-border rounded-[14px] p-3">
                        <span className="block text-muted text-[0.7rem] uppercase tracking-wider mb-1">Tenant</span>
                        <strong className="text-sm font-bold">{s.tenantName ?? '—'}</strong>
                      </div>
                      <div className="bg-surface border border-border rounded-[14px] p-3">
                        <span className="block text-muted text-[0.7rem] uppercase tracking-wider mb-1">Added</span>
                        <strong className="text-sm font-bold">{s.createdAt}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      </section>
    </div>
  )
}

// ── TenantAdmin view ──────────────────────────────────────────────────────────

function TenantAdminPanel({
  currentUser,
  members,
  onInvite,
  message,
}: {
  currentUser: User
  members: User[]
  onInvite: (email: string) => Promise<void>
  message: { text: string; error: boolean }
}) {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviting, setInviting] = useState(false)

  const handleInvite = async () => {
    if (!email.trim()) return
    setInviting(true)
    await onInvite(email.trim())
    setEmail('')
    setInviting(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      {/* Profile */}
      <aside className="bg-surface border border-border-3 rounded-3xl overflow-hidden lg:col-span-1">
        <div className="px-5 py-4 border-b border-border">
          <SectionLabel>Your Profile</SectionLabel>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-xl font-black text-accent shrink-0">
              {currentUser.email[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-text truncate">{currentUser.email}</p>
              <RoleBadge role={currentUser.role} />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black tracking-wider text-muted uppercase block mb-1.5">Email</label>
            <input
              type="email"
              defaultValue={currentUser.email}
              className="w-full bg-surface-3 border border-border-2 rounded-[14px] px-3.5 py-3 font-mono text-xs text-text outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="text-[11px] font-black tracking-wider text-muted uppercase block mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full bg-surface-3 border border-border-2 rounded-[14px] px-3.5 py-3 font-mono text-xs text-text outline-none focus:border-accent placeholder:text-muted"
            />
          </div>

          {newPassword && (
            <div>
              <label className="text-[11px] font-black tracking-wider text-muted uppercase block mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full bg-surface-3 border rounded-[14px] px-3.5 py-3 font-mono text-xs text-text outline-none focus:border-accent placeholder:text-muted ${
                  confirmPassword && newPassword !== confirmPassword ? 'border-danger' : 'border-border-2'
                }`}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-danger text-xs mt-1">Passwords don't match</p>
              )}
            </div>
          )}

          <button className="px-3.5 py-2.5 bg-surface-2 text-text border border-border-2 rounded-full text-[13px] font-extrabold cursor-pointer hover:brightness-110 transition-all">
            Save Changes
          </button>
        </div>
      </aside>

      {/* Team Members */}
      <section className="bg-surface border border-border-3 rounded-3xl overflow-hidden lg:col-span-2">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <SectionLabel>Team Members</SectionLabel>
          <span className="text-muted text-xs font-bold">{members.length} member{members.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Invite bar */}
        <div className="px-6 py-4 border-b border-border bg-surface-2/50">
          <p className="text-xs text-muted mb-2.5">Invite a new member to your account</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              placeholder="member@example.com"
              className="flex-1 bg-surface-3 border border-border-2 rounded-[14px] px-3.5 py-2.5 font-mono text-xs text-text outline-none focus:border-accent placeholder:text-muted"
            />
            <button
              onClick={handleInvite}
              disabled={inviting || !email.trim()}
              className="px-4 py-2.5 bg-accent text-white rounded-full text-[13px] font-extrabold cursor-pointer hover:brightness-110 disabled:opacity-50 transition-all border-none"
            >
              {inviting ? 'Inviting…' : 'Invite'}
            </button>
          </div>
          {message.text && (
            <p className={`text-xs mt-2 ${message.error ? 'text-danger' : 'text-green'}`}>{message.text}</p>
          )}
        </div>

        {/* Member list */}
        <div className="divide-y divide-border">
          {members.length === 0
            ? <div className="px-6 py-6 text-center"><EmptyRow text="No team members yet. Invite someone above." /></div>
            : members.map(m => (
              <div key={m.id} className="px-6 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-sm font-black text-muted shrink-0">
                  {m.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text truncate">{m.email}</p>
                  <p className="text-xs text-muted">Added member</p>
                </div>
                <RoleBadge role={m.role} />
                <button className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-bg transition-colors border-none bg-transparent cursor-pointer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            ))
          }
        </div>
      </section>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Admin() {
  const navItems = useNavItems()
  const currentUser = getUser()
  const role = currentUser?.role ?? 'user'

  const [users, setUsers]       = useState<User[]>([])
  const [tenants, setTenants]   = useState<Tenant[]>([])
  const [servers, setServers]   = useState<Server[]>([])
  const [members, setMembers]   = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const [message, setMessage]   = useState({ text: '', error: false })

  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set())
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set())
  const [savingPlan, setSavingPlan] = useState<string | null>(null)

  const toggle = (set: Set<string>, id: string): Set<string> => {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      if (role === 'superuser') {
        const [usersRes, tenantsRes, serversRes] = await Promise.all([
          apiFetch('/api/users'),
          apiFetch('/api/tenants'),
          apiFetch('/api/servers'),
        ])
        if (usersRes.ok)   setUsers(await usersRes.json())
        if (tenantsRes.ok) setTenants(await tenantsRes.json())
        if (serversRes.ok) setServers(await serversRes.json())
      } else if (role === 'manager') {
        const [membersRes, serversRes] = await Promise.all([
          apiFetch('/api/users'),
          apiFetch('/api/servers'),
        ])
        if (membersRes.ok) setMembers(await membersRes.json())
        if (serversRes.ok) setServers(await serversRes.json())
      }
    } catch (e: any) {
      setMessage({ text: e.message, error: true })
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => { load() }, [load])

  const handleInvite = async (email: string) => {
    try {
      const res = await apiFetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error((await res.json()).detail ?? `Error ${res.status}`)
      setMessage({ text: `Invite sent to ${email}`, error: false })
      load()
    } catch (e: any) {
      setMessage({ text: e.message, error: true })
    }
  }

  const handleSetPlan = async (tenantId: string, plan: string) => {
    setSavingPlan(tenantId)
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error((await res.json()).detail ?? `Error ${res.status}`)
      setMessage({ text: `Plan set to ${plan}`, error: false })
      load()
    } catch (e: any) {
      setMessage({ text: e.message, error: true })
    } finally {
      setSavingPlan(null)
    }
  }


  const titleMap: Record<string, string> = {
    superuser: 'Platform Admin',
    manager:   'Tenant Admin',
    user:      'Account',
  }

  const subtitleMap: Record<string, string> = {
    superuser: 'Manage all users, tenants, and servers across the platform.',
    manager:   'Manage your account details and invite team members.',
    user:      'View your account details.',
  }

  return (
    <main className="w-full max-w-[1400px] mx-auto relative px-4 sm:px-8 lg:px-12 pt-5 sm:pt-7 pb-8 sm:pb-10 z-[1]">
      <GlowBackground variant="settings" />

      <NavBar
        items={navItems}
        rightContent={
          <button
            onClick={() => { clearToken(); window.location.href = '/login' }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border-2 bg-surface-2 text-[13px] font-bold text-muted cursor-pointer hover:text-text hover:brightness-110"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="max-sm:hidden">Sign out</span>
          </button>
        }
      />

      {/* Header */}
      <section className="flex items-center justify-between gap-4 sm:gap-6 p-4 sm:p-7 bg-surface border border-border-3 rounded-[26px] shadow-[0_24px_60px_-30px_rgba(217,119,42,0.2)] mb-5 flex-wrap">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[clamp(24px,4vw,54px)] font-extrabold tracking-[-2px] leading-none">
            {titleMap[role] ?? 'Admin'}
          </h1>
          <p className="text-muted text-base leading-[22px]">{subtitleMap[role]}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {currentUser && <RoleBadge role={currentUser.role} />}
          {currentUser && (
            <span className="text-muted text-sm font-mono">{currentUser.email}</span>
          )}
        </div>
      </section>

      {/* Status bar */}
      {message.text && (
        <section className="flex items-center gap-4 px-4 py-3 border border-border rounded-[18px] bg-surface/90 mb-5">
          <span className={`text-sm ${message.error ? 'text-danger' : 'text-green'}`}>{message.text}</span>
          <button onClick={() => setMessage({ text: '', error: false })} className="ml-auto text-muted hover:text-text bg-transparent border-none cursor-pointer text-lg leading-none">×</button>
        </section>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted text-sm">Loading…</div>
      ) : role === 'superuser' ? (
        <SuperUserPanel
          users={users}
          tenants={tenants}
          servers={servers}
          expandedTenants={expandedTenants}
          toggleTenant={id => setExpandedTenants(prev => toggle(prev, id))}
          expandedServers={expandedServers}
          toggleServer={id => setExpandedServers(prev => toggle(prev, id))}
          onSetPlan={handleSetPlan}
          savingPlan={savingPlan}
        />
      ) : role === 'manager' && currentUser ? (
        <TenantAdminPanel
          currentUser={currentUser}
          members={members}
          onInvite={handleInvite}
          message={message}
        />
      ) : (
        <div className="text-muted text-sm">You don't have access to this page.</div>
      )}
    </main>
  )
}
