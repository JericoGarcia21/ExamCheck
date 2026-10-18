import { useQuery } from '@tanstack/react-query'
import { getAppAccess } from '../services/adminService'

export function useAppAccess() {
  return useQuery({ queryKey: ['appAccess'], queryFn: getAppAccess, refetchInterval: 15_000, refetchOnWindowFocus: true })
}
