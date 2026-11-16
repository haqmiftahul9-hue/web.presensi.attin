/**
 * Utility helper untuk menggabungkan class names secara aman (shadcn standard)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
