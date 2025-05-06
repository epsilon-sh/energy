import { startOfWeek, endOfDay } from 'date-fns'

export const getDefaultRange = () => {
  const now = new Date()
  return {
    start: startOfWeek(now),
    end: endOfDay(now),
  }
} 