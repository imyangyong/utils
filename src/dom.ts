export function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  if (style.position === 'fixed' || element.tagName === 'BODY' || element.tagName === 'HTML') {
    return style.display !== 'none' && style.visibility !== 'hidden'
  }
  return element.offsetParent !== null
}
