import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const keyLength = 64
let dummy = ''

export function hashPassword(password: string) {
  const salt = randomBytes(16)
  return new Promise<string>((resolve, reject) => {
    scrypt(password, salt, keyLength, (error, key) => {
      if (error) reject(error)
      else resolve(`scrypt$${salt.toString('hex')}$${key.toString('hex')}`)
    })
  })
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, keyHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return Promise.resolve(false)
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(keyHex, 'hex')
  if (salt.length === 0 || expected.length === 0) return Promise.resolve(false)
  return new Promise<boolean>((resolve, reject) => {
    scrypt(password, salt, expected.length, (error, key) => {
      if (error) {
        reject(error)
        return
      }
      resolve(key.length === expected.length && timingSafeEqual(key, expected))
    })
  })
}

export async function warmPasswords() {
  dummy = await hashPassword(randomBytes(32).toString('hex'))
}

export function dummyHash() {
  return dummy
}
