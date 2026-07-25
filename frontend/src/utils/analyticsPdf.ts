import jsPDF from "jspdf"
import { DEVTRACK_LOGO_PNG, DEVTRACK_LOGO_ASPECT } from "./devtrackLogo"

type RGB = [number, number, number]

export interface AnalyticsPdfData {
  analytics: any
  deadlineAnalytics: any
  devProductivity: Array<{ name: string; efforts: number; tasks: number }>
  devBugs: Array<{ name: string; raised: number; solved: number }>
  categories: Array<{ name: string; value: number }>
  filters: { range: string; scope: string; sprint: string }
  generatedBy?: string
}

const BRAND_DARK: RGB = [30, 41, 59]
const INDIGO: RGB = [79, 70, 229]
const ZEBRA: RGB = [244, 246, 251]
const BORDER: RGB = [203, 213, 225]
const GRID: RGB = [226, 232, 240]
const BODY: RGB = [51, 65, 85]
const SUBTEXT: RGB = [100, 116, 139]
const CARD_BG: RGB = [248, 250, 252]
const WHITE: RGB = [255, 255, 255]
const GOOD_BG: RGB = [209, 250, 229]
const GOOD_FG: RGB = [6, 95, 70]
const WARN_BG: RGB = [254, 243, 199]
const WARN_FG: RGB = [146, 64, 14]
const BAD_BG: RGB = [254, 226, 226]
const BAD_FG: RGB = [153, 27, 27]
const NEUTRAL_BG: RGB = [241, 245, 249]
const NEUTRAL_FG: RGB = [71, 85, 105]
const HEADER_SUB: RGB = [165, 180, 252]
const HEADER_META: RGB = [148, 163, 184]
const LOGO_CARD_BG: RGB = [243, 248, 243]

const RANGE_LABELS: Record<string, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  all: "All Time",
}

type Tone = "good" | "warn" | "bad" | "neutral"

function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function fmt(v: any, digits = 0): string {
  const n = num(v)
  if (n === null) return "\u2014"
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function pct(v: any): string {
  const n = num(v)
  if (n === null) return "\u2014"
  const digits = Number.isInteger(n) ? 0 : 1
  return `${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`
}

function slaTone(v: any): Tone {
  const n = num(v)
  if (n === null) return "neutral"
  return n >= 80 ? "good" : n >= 60 ? "warn" : "bad"
}

function slaStatusLabel(v: any): string {
  const n = num(v)
  if (n === null) return "N/A"
  return n >= 80 ? "Optimal" : n >= 60 ? "Acceptable" : "At Risk"
}

function statusTone(s: string): Tone {
  if (s === "Optimal") return "good"
  if (s === "Acceptable") return "warn"
  if (s === "At Risk") return "bad"
  return "neutral"
}

function rateTone(r: number): Tone {
  return r >= 80 ? "good" : r >= 50 ? "warn" : "bad"
}

function delayTone(v: any): Tone {
  const n = num(v)
  if (n === null) return "neutral"
  return n <= 0 ? "good" : n <= 3 ? "warn" : "bad"
}

function toneColors(tone: Tone): { bg: RGB; fg: RGB } {
  if (tone === "good") return { bg: GOOD_BG, fg: GOOD_FG }
  if (tone === "warn") return { bg: WARN_BG, fg: WARN_FG }
  if (tone === "bad") return { bg: BAD_BG, fg: BAD_FG }
  return { bg: NEUTRAL_BG, fg: NEUTRAL_FG }
}

interface Column {
  header: string
  key: string
  width: number
  align?: "left" | "right" | "center"
  strong?: boolean
  badge?: (raw: any, row: any) => Tone | null
}

export function generateAnalyticsSummaryPdf(data: AnalyticsPdfData): string {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
  const PAGE_W = doc.internal.pageSize.getWidth()
  const PAGE_H = doc.internal.pageSize.getHeight()
  const MARGIN = 40
  const CONTENT_W = PAGE_W - MARGIN * 2
  const FOOTER_H = 34
  let y = MARGIN

  const setFill = (c: number[]) => doc.setFillColor(c[0], c[1], c[2])
  const setText = (c: number[]) => doc.setTextColor(c[0], c[1], c[2])
  const setDraw = (c: number[]) => doc.setDrawColor(c[0], c[1], c[2])

  const ensure = (h: number) => {
    if (y + h > PAGE_H - FOOTER_H) {
      doc.addPage()
      y = MARGIN
    }
  }

  const now = new Date()
  const genStr = now.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  })

  // Header band
  setFill(BRAND_DARK)
  doc.rect(0, 0, PAGE_W, 92, "F")
  setFill(INDIGO)
  doc.rect(0, 92, PAGE_W, 3, "F")

  // Brand logo: the official DevTrack lockup, placed on a light brand card so
  // the dark wordmark stays legible against the dark header band.
  const logoH = 26
  const logoW = logoH * DEVTRACK_LOGO_ASPECT
  const cardPadX = 10
  const cardPadY = 7
  const cardX = MARGIN
  const cardY = 24
  const cardW = logoW + cardPadX * 2
  const cardH = logoH + cardPadY * 2
  setFill(LOGO_CARD_BG)
  doc.roundedRect(cardX, cardY, cardW, cardH, 6, 6, "F")
  doc.addImage(DEVTRACK_LOGO_PNG, "PNG", cardX + cardPadX, cardY + cardPadY, logoW, logoH)

  setText(HEADER_SUB)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("Executive Analytics Report", MARGIN, cardY + cardH + 14)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  setText(HEADER_META)
  const scopeLabel = data.filters.scope === "my" ? "My Scope" : "All Teams"
  const rangeLabel = RANGE_LABELS[data.filters.range] || data.filters.range
  const sprintLabel =
    data.filters.sprint === "all" ? "All Sprints" :
    data.filters.sprint === "active" ? "Active Sprint" :
    `Sprint ${data.filters.sprint}`
  doc.text(`Generated  ${genStr}`, PAGE_W - MARGIN, 40, { align: "right" })
  doc.text(`${rangeLabel}  \u2022  ${scopeLabel}  \u2022  ${sprintLabel}`, PAGE_W - MARGIN, 56, { align: "right" })
  if (data.generatedBy) {
    doc.text(`Prepared by ${data.generatedBy}`, PAGE_W - MARGIN, 72, { align: "right" })
  }
  y = 92 + 3 + 24

  const sectionTitle = (label: string) => {
    ensure(32)
    setText(INDIGO)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text(label.toUpperCase(), MARGIN, y + 9)
    setDraw(BORDER)
    doc.setLineWidth(0.7)
    doc.line(MARGIN, y + 15, MARGIN + CONTENT_W, y + 15)
    y += 28
  }

  const kpiGrid = (items: Array<{ label: string; value: string; tone?: Tone }>) => {
    const cols = 3
    const gap = 10
    const cardW = (CONTENT_W - gap * (cols - 1)) / cols
    const cardH = 48
    items.forEach((item, i) => {
      const col = i % cols
      if (col === 0) ensure(cardH + gap)
      const x = MARGIN + col * (cardW + gap)
      setFill(CARD_BG)
      setDraw(BORDER)
      doc.setLineWidth(0.7)
      doc.roundedRect(x, y, cardW, cardH, 5, 5, "FD")
      const tone = item.tone || "neutral"
      const accent = tone === "good" ? GOOD_FG : tone === "warn" ? WARN_FG : tone === "bad" ? BAD_FG : INDIGO
      setFill(accent)
      doc.rect(x, y + 8, 3, cardH - 16, "F")
      setText(SUBTEXT)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(7)
      doc.text(item.label.toUpperCase(), x + 12, y + 17, { maxWidth: cardW - 20 })
      setText(BRAND_DARK)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text(item.value, x + 12, y + 38)
      if (col === cols - 1 || i === items.length - 1) {
        y += cardH + gap
      }
    })
  }

  const table = (cols: Column[], rows: any[], emptyMsg = "No data available.") => {
    const headerH = 22
    const rowH = 20
    const drawHead = () => {
      setFill(INDIGO)
      doc.rect(MARGIN, y, CONTENT_W, headerH, "F")
      setText(WHITE)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      let x = MARGIN
      cols.forEach((c) => {
        const align = c.align || "left"
        const tx = align === "right" ? x + c.width - 8 : align === "center" ? x + c.width / 2 : x + 8
        doc.text(c.header.toUpperCase(), tx, y + headerH / 2, { align, baseline: "middle" })
        x += c.width
      })
      y += headerH
    }
    ensure(headerH + rowH)
    drawHead()
    if (!rows || rows.length === 0) {
      setFill(WHITE)
      setDraw(BORDER)
      doc.setLineWidth(0.5)
      doc.rect(MARGIN, y, CONTENT_W, rowH, "S")
      setText(SUBTEXT)
      doc.setFont("helvetica", "italic")
      doc.setFontSize(8.5)
      doc.text(emptyMsg, MARGIN + CONTENT_W / 2, y + rowH / 2, { align: "center", baseline: "middle" })
      y += rowH + 6
      return
    }
    rows.forEach((row, ri) => {
      if (y + rowH > PAGE_H - FOOTER_H) {
        doc.addPage()
        y = MARGIN
        drawHead()
      }
      if (ri % 2 === 1) {
        setFill(ZEBRA)
        doc.rect(MARGIN, y, CONTENT_W, rowH, "F")
      }
      setDraw(GRID)
      doc.setLineWidth(0.4)
      doc.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH)
      let x = MARGIN
      cols.forEach((c) => {
        const raw = row[c.key]
        const val = raw === null || raw === undefined || raw === "" ? "\u2014" : String(raw)
        const align = c.align || "left"
        const tone = c.badge ? c.badge(raw, row) : null
        if (tone) {
          const colors = toneColors(tone)
          doc.setFont("helvetica", "bold")
          doc.setFontSize(8)
          const tw = doc.getTextWidth(val)
          const bw = Math.min(tw + 12, c.width - 10)
          const bx = align === "right" ? x + c.width - 6 - bw : align === "center" ? x + (c.width - bw) / 2 : x + 6
          setFill(colors.bg)
          doc.roundedRect(bx, y + rowH / 2 - 7, bw, 14, 3, 3, "F")
          setText(colors.fg)
          doc.text(val, bx + bw / 2, y + rowH / 2, { align: "center", baseline: "middle" })
        } else {
          setText(c.strong ? BRAND_DARK : BODY)
          doc.setFont("helvetica", c.strong ? "bold" : "normal")
          doc.setFontSize(8.5)
          const tx = align === "right" ? x + c.width - 8 : align === "center" ? x + c.width / 2 : x + 8
          doc.text(val, tx, y + rowH / 2, { align, baseline: "middle", maxWidth: c.width - 12 })
        }
        x += c.width
      })
      y += rowH
    })
    y += 8
  }

  const a = data.analytics || {}
  const dl = data.deadlineAnalytics || {}

  // Executive Summary
  sectionTitle("Executive Summary")
  kpiGrid([
    { label: "Total CRs", value: fmt(a.totalCRs) },
    { label: "Total Bugs", value: fmt(a.totalBugs) },
    { label: "Quality Risks Flagged", value: fmt(a.qualityRiskCrCount), tone: (num(a.qualityRiskCrCount) || 0) > 0 ? "warn" : "good" },
    { label: "Bug Acceptance", value: pct(a.bugAcceptanceRate) },
    { label: "Bug Rejection", value: pct(a.bugRejectionRate) },
    { label: "Bug Challenge", value: pct(a.bugChallengeRate) },
    { label: "Avg Bug Resolution (hrs)", value: fmt(a.averageBugResolutionHours, 1) },
    { label: "Avg Testing Duration (hrs)", value: fmt(a.averageTestingDurationHours, 1) },
    { label: "Sprint Completion", value: pct(a.sprintTaskCompletionRate), tone: slaTone(a.sprintTaskCompletionRate) },
  ])

  // SLA Benchmarks
  sectionTitle("SLA Performance Benchmarks")
  table(
    [
      { header: "Benchmark", key: "metric", width: CONTENT_W * 0.6, strong: true },
      { header: "Compliance", key: "value", width: CONTENT_W * 0.2, align: "right" },
      { header: "Status", key: "status", width: CONTENT_W * 0.2, align: "center", badge: (raw) => statusTone(String(raw)) },
    ],
    [
      { metric: "Testing SLA (48h) Compliance", value: pct(a.testingSlaComplianceRate), status: slaStatusLabel(a.testingSlaComplianceRate) },
      { metric: "Approval SLA (24h) Compliance", value: pct(a.approvalSlaComplianceRate), status: slaStatusLabel(a.approvalSlaComplianceRate) },
      { metric: "Sprint Task Completion", value: pct(a.sprintTaskCompletionRate), status: slaStatusLabel(a.sprintTaskCompletionRate) },
    ]
  )

  // Developer Productivity
  sectionTitle("Developer Productivity")
  table(
    [
      { header: "Developer", key: "name", width: CONTENT_W * 0.5, strong: true },
      { header: "Efforts (days)", key: "efforts", width: CONTENT_W * 0.25, align: "right" },
      { header: "Completed Tasks", key: "tasks", width: CONTENT_W * 0.25, align: "right" },
    ],
    (data.devProductivity || []).map((d) => ({ name: d.name, efforts: fmt(d.efforts, 1), tasks: fmt(d.tasks) })),
    "No developer efforts logged yet."
  )

  // Defect Resolution
  sectionTitle("Defect Resolution Metrics")
  table(
    [
      { header: "Developer", key: "name", width: CONTENT_W * 0.4, strong: true },
      { header: "Raised", key: "raised", width: CONTENT_W * 0.16, align: "right" },
      { header: "Resolved", key: "solved", width: CONTENT_W * 0.16, align: "right" },
      { header: "Resolution Rate", key: "rate", width: CONTENT_W * 0.28, align: "center", badge: (_raw, row) => rateTone(row._rate) },
    ],
    (data.devBugs || []).map((d) => {
      const r = d.raised > 0 ? (d.solved / d.raised) * 100 : 0
      return { name: d.name, raised: fmt(d.raised), solved: fmt(d.solved), rate: pct(r), _rate: r }
    }),
    "No bug tickets logged."
  )

  // CR Category Allocation
  const totalCat = (data.categories || []).reduce((s, c) => s + (c.value || 0), 0) || 1
  sectionTitle("CR Category Allocation")
  table(
    [
      { header: "Category", key: "name", width: CONTENT_W * 0.5, strong: true },
      { header: "Tasks", key: "value", width: CONTENT_W * 0.25, align: "right" },
      { header: "Share", key: "share", width: CONTENT_W * 0.25, align: "right" },
    ],
    (data.categories || []).map((c) => ({ name: c.name, value: fmt(c.value), share: pct((c.value / totalCat) * 100) })),
    "No tasks available to categorize."
  )

  // Deployment Deadline & SLA Analytics
  sectionTitle("Deployment Deadline & SLA Analytics")
  kpiGrid([
    { label: "Avg SIT Delay (days)", value: fmt(dl.averageSitDelay, 1), tone: delayTone(dl.averageSitDelay) },
    { label: "Avg UAT Delay (days)", value: fmt(dl.averageUatDelay, 1), tone: delayTone(dl.averageUatDelay) },
    { label: "Longest SIT Delay (days)", value: fmt(dl.longestSitDelay), tone: "warn" },
    { label: "Longest UAT Delay (days)", value: fmt(dl.longestUatDelay), tone: "warn" },
  ])

  sectionTitle("Project Delay Ranking (Top 5)")
  table(
    [
      { header: "Project", key: "project", width: CONTENT_W * 0.7, strong: true },
      { header: "Avg Delay (days)", key: "avgDelay", width: CONTENT_W * 0.3, align: "right" },
    ],
    (dl.projectDelayRanking || []).slice(0, 5).map((p: any) => ({ project: p.project, avgDelay: fmt(p.avgDelay, 1) })),
    "No project delay data available."
  )

  sectionTitle("Developer Delay Ranking (Top 5)")
  table(
    [
      { header: "Developer", key: "developer", width: CONTENT_W * 0.7, strong: true },
      { header: "Avg Delay (days)", key: "avgDelay", width: CONTENT_W * 0.3, align: "right" },
    ],
    (dl.developerDelayRanking || []).slice(0, 5).map((d: any) => ({ developer: d.developer, avgDelay: fmt(d.avgDelay, 1) })),
    "No developer delay data available."
  )

  // Footer + page numbers
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    setDraw(BORDER)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, PAGE_H - FOOTER_H + 8, PAGE_W - MARGIN, PAGE_H - FOOTER_H + 8)
    setText(SUBTEXT)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.text("DevTrack \u2022 Confidential \u2014 Internal Analytics", MARGIN, PAGE_H - FOOTER_H + 22)
    doc.text(`Page ${p} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - FOOTER_H + 22, { align: "right" })
  }

  return doc.output("datauristring")
}
