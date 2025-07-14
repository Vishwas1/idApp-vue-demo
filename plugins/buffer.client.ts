import { Buffer } from 'buffer'

export default defineNuxtPlugin(() => {
  // Add Buffer to global window object if missing
  if (!window.Buffer) {
    window.Buffer = Buffer
  }
})