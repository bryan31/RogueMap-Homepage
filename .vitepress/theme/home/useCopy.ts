import { onBeforeUnmount, ref } from 'vue'

export function useCopy(resetMs = 1600) {
  const copied = ref(false)
  let timer = 0

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    copied.value = true
    clearTimeout(timer)
    timer = window.setTimeout(() => (copied.value = false), resetMs)
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return { copied, copy }
}
