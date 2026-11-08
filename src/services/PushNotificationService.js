/**
 * PushNotificationService - Manajemen push notification untuk PWA
 * Menggunakan Web Push API dengan VAPID keys
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// VAPID public key (harus di-generate di production)
// Untuk development, gunakan placeholder
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

export class PushNotificationService {
  constructor() {
    this.registration = null
    this.subscription = null
  }

  async init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker tidak didukung')
      return false
    }

    if (!('PushManager' in window)) {
      console.warn('Push API tidak didukung')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker terdaftar:', this.registration.scope)
      return true
    } catch (err) {
      console.error('Gagal mendaftarkan Service Worker:', err)
      return false
    }
  }

  async subscribe(userId, token = '') {
    if (!this.registration) {
      await this.init()
    }

    try {
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      const subscriptionJson = this.subscription.toJSON()

      // Simpan ke database
      const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          endpoint: subscriptionJson.endpoint,
          p256dh_key: subscriptionJson.keys?.p256dh || '',
          auth_key: subscriptionJson.keys?.auth || '',
          device_info: navigator.userAgent
        })
      })

      if (!res.ok) throw new Error('Gagal menyimpan subscription')

      return this.subscription
    } catch (err) {
      console.error('Gagal subscribe push notification:', err)
      return null
    }
  }

  async unsubscribe(token = '') {
    if (this.subscription) {
      await this.subscription.unsubscribe()
      this.subscription = null
    }

    try {
      const token = localStorage.getItem('simpres.token') || token
      const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?is_active=eq.true`, {
        method: 'PATCH',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: false })
      })
      return res.ok
    } catch (err) {
      console.error('Gagal unsubscribe:', err)
      return false
    }
  }

  urlBase64ToUint8Array(base64String) {
    if (!base64String) {
      // Generate dummy key untuk development
      return new Uint8Array([0])
    }
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  async isSubscribed() {
    if (!this.registration) return false
    const subscription = await this.registration.pushManager.getSubscription()
    return !!subscription
  }
}

export const pushService = new PushNotificationService()

/**
 * Fungsi helper untuk mengirim notifikasi ke semua user (dipakai Superadmin)
 */
export async function sendNotificationToAll(title, body, token = '') {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/send_push_notification`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body })
    })
    return res.ok
  } catch (err) {
    console.error('Gagal mengirim notifikasi:', err)
    return false
  }
}

/**
 * Fungsi helper untuk mengirim notifikasi ke user tertentu
 */
export async function sendNotificationToUser(userId, title, body, token = '') {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/send_push_notification_to_user`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId, title, body })
    })
    return res.ok
  } catch (err) {
    console.error('Gagal mengirim notifikasi ke user:', err)
    return false
  }
}
