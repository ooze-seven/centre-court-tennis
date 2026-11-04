export const courtTimeZone = 'Asia/Manila'

export type CourtParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export function courtParts(now: Date): CourtParts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: courtTimeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const bag = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]))
  let year = Number(bag.year)
  let month = Number(bag.month)
  let day = Number(bag.day)
  let hour = Number(bag.hour)
  if (hour === 24) {
    hour = 0
    const shifted = new Date(Date.UTC(year, month - 1, day))
    shifted.setUTCDate(shifted.getUTCDate() + 1)
    year = shifted.getUTCFullYear()
    month = shifted.getUTCMonth() + 1
    day = shifted.getUTCDate()
  }
  return {
    year,
    month,
    day,
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
  }
}

function zoneOffset(utcMs: number) {
  const parts = courtParts(new Date(utcMs))
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUTC - utcMs
}

export function courtInstant(iso: string, hour: number, minute = 0) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return Number.NaN
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return Number.NaN
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0)
  return utcGuess - zoneOffset(utcGuess - zoneOffset(utcGuess))
}

export function courtDayIndex(year: number, month: number, day: number) {
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
}

export function isRealDay(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  const probe = new Date(Date.UTC(year, month - 1, day))
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day
}

export function courtWall(now: Date) {
  const parts = courtParts(now)
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
}
