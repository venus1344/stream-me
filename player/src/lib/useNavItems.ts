import { useMemo } from 'react'
import { getUser } from './auth'

export function useNavItems() {
  return useMemo(() => {
    const user = getUser()
    const role = user?.role
    const base = [
      { label: 'Player',   to: '/home' },
      { label: 'Settings', to: '/settings' },
    ]
    if (role === 'superuser' || role === 'manager') {
      base.push({ label: 'Admin', to: '/admin' })
    }
    return base
  }, [])
}
