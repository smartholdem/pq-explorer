import type { Directive } from 'vue'

// copies <th> captions onto every <td data-label> so the card layout can show them on phones
const label = (table: HTMLTableElement) => {
  const heads = [...table.querySelectorAll<HTMLTableCellElement>('thead th')].map((th) => th.textContent?.trim() ?? '')
  table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((tr) => {
    let col = 0
    for (const td of tr.cells) {
      if (td.colSpan === 1) td.dataset.label = heads[col] ?? ''
      td.toggleAttribute('data-empty', !td.textContent?.trim() && !td.querySelector('svg,img,input,button'))
      col += td.colSpan
    }
  })
}
export const vCardTable: Directive<HTMLTableElement> = {
  mounted: (el) => { el.classList.add('table-cards'); label(el) },
  updated: label,
}
