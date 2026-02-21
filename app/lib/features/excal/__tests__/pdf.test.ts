import { computePdfCanvasSlices, computePdfPageSlices } from '@/app/lib/features/excal/pdf'

describe('excal pdf slicing', () => {
  it('splits fixed pages plus remainder', () => {
    expect(computePdfPageSlices(2500, 1000)).toEqual([1000, 1000, 500])
  })

  it('converts canvas sizing with pxPerMm', () => {
    expect(computePdfCanvasSlices(2000, 4100, 200, 120)).toEqual([1200, 1200, 1200, 500])
  })

  it('returns [] for invalid input', () => {
    expect(computePdfPageSlices(0, 1000)).toEqual([])
    expect(computePdfCanvasSlices(0, 0, 200, 120)).toEqual([])
  })
})
