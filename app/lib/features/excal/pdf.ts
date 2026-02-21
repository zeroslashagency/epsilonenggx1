export interface PdfExportInput {
  canvas: HTMLCanvasElement | null | undefined
  fileName?: string
  contentWidthMm: number
  contentHeightMm: number
}

export function computePdfPageSlices(totalHeightPx: number, pageHeightPx: number): number[] {
  if (!Number.isFinite(totalHeightPx) || !Number.isFinite(pageHeightPx)) return []
  if (totalHeightPx <= 0 || pageHeightPx <= 0) return []

  const slices: number[] = []
  let remaining = Math.floor(totalHeightPx)
  const step = Math.max(1, Math.floor(pageHeightPx))

  while (remaining > 0) {
    const next = Math.min(step, remaining)
    slices.push(next)
    remaining -= next
  }

  return slices
}

export function computePdfCanvasSlices(
  canvasWidthPx: number,
  canvasHeightPx: number,
  contentWidthMm: number,
  contentHeightMm: number
): number[] {
  if (!Number.isFinite(canvasWidthPx) || !Number.isFinite(canvasHeightPx) || !Number.isFinite(contentWidthMm) || !Number.isFinite(contentHeightMm)) {
    return []
  }

  if (canvasWidthPx <= 0 || canvasHeightPx <= 0 || contentWidthMm <= 0 || contentHeightMm <= 0) {
    return []
  }

  const pxPerMm = canvasWidthPx / contentWidthMm
  const pageHeightPx = Math.max(1, Math.floor(contentHeightMm * pxPerMm))
  return computePdfPageSlices(canvasHeightPx, pageHeightPx)
}

export async function exportToPDF(input: PdfExportInput): Promise<number[]> {
  if (!input?.canvas || input.contentWidthMm <= 0 || input.contentHeightMm <= 0) {
    return []
  }

  const canvas = input.canvas
  const slices = computePdfCanvasSlices(canvas.width, canvas.height, input.contentWidthMm, input.contentHeightMm)
  if (!slices.length) return []

  if (typeof document === 'undefined') {
    return slices
  }

  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pxPerMm = canvas.width / input.contentWidthMm
  let sourceY = 0

  for (let i = 0; i < slices.length; i += 1) {
    const sliceHeightPx = slices[i]
    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = canvas.width
    sliceCanvas.height = sliceHeightPx

    const context = sliceCanvas.getContext('2d')
    if (!context) continue

    context.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx
    )

    const sliceHeightMm = sliceHeightPx / pxPerMm
    const imageData = sliceCanvas.toDataURL('image/png')

    if (i > 0) {
      pdf.addPage()
    }

    pdf.addImage(imageData, 'PNG', 0, 0, input.contentWidthMm, sliceHeightMm)
    sourceY += sliceHeightPx
  }

  pdf.save(input.fileName || 'excal-dashboard.pdf')
  return slices
}
