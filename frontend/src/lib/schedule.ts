import { toISO } from './days.ts'

export const DAY_START = 6
export const DAY_END = 16

export const hours = Array.from({ length: 24 }, (_, hour) => hour)

export function startOfWeek(date: Date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  copy.setDate(copy.getDate() - copy.getDay())
  return copy
}

export function addWeeks(date: Date, weeks: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + weeks * 7)
  return copy
}

export function weekDates(start: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

export function slotKey(iso: string, hour: number) {
  return `${iso}-${hour}`
}

export function pesos(hour: number) {
  return hour >= DAY_START && hour < DAY_END ? 600 : 700
}

export function rateName(hour: number) {
  return hour >= DAY_START && hour < DAY_END ? 'Daytime' : 'Evening and lights'
}

export function hourLabel(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

export function hourRange(hour: number) {
  const end = hour === 23 ? '24:00' : hourLabel(hour + 1)
  return `${hourLabel(hour)}–${end}`
}

export function isPast(iso: string, hour: number, now: Date) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day, hour).getTime() <= now.getTime()
}

export function weekLabel(days: Date[]) {
  const first = days[0]
  const last = days[6]
  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    const month = first.toLocaleDateString('en-GB', { month: 'long' })
    return `${first.getDate()}–${last.getDate()} ${month}`
  }
  const format = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
  return `${format.format(first)} – ${format.format(last)}`
}

export function sameDay(date: Date, iso: string) {
  return toISO(date) === iso
}
