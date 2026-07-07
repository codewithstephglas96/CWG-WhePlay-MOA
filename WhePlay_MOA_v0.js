// ========================================
// $MARKS OUTSTANDING$ • Play Whe Widget • v1.3 (Realtime)
// Aging Outstanding • Auto-collapse empty rows
// ========================================

const url =
  "https://script.google.com/macros/s/AKfycbwyr-M_ZzIscNgxJmR_UYHgZqmamn62Np4msDFaCjX9KgyUmyjuzuIYbawBmT0_mw4j/exec?action=calendar&game=P2WHE&weeks=12"

let widget = new ListWidget()
widget.backgroundColor = new Color("#000000")
widget.setPadding(10, 12, 10, 12)

// ----------------------------------------
// TITLE
// ----------------------------------------
let title = widget.addText("PLAY WHE • MARKS OUTSTANDING")
title.font = Font.boldSystemFont(18)
title.textColor = new Color("#00ff00")
title.centerAlignText()
widget.addSpacer(8)

// ----------------------------------------
// FETCH DATA
// ----------------------------------------
let raw, json

try {
  let req = new Request(url)
  req.timeoutInterval = 15
  raw = JSON.parse((await req.load()).toRawString())

  // API returns ARRAY → extract first object
  json = Array.isArray(raw) ? raw[0] : raw

} catch (e) {
  widget.addText("⚠️ API fetch failed")
  Script.setWidget(widget)
  Script.complete()
}

if (!json || json.success !== true || !Array.isArray(json.data?.weeks)) {
  widget.addText("⚠️ No calendar data")
  Script.setWidget(widget)
  Script.complete()
}

let allweeks = json.data.weeks
let currentWeek = allweeks.find(w => w.isCurrentWeek)
let completedWeeks = allweeks.filter(w => !w.isCurrentWeek)

// ------------------------------------------
// THIS WEEK NUMBERS + FREQUENCY
// ------------------------------------------
let thisWeekNumbers = new Set()
let thisWeekFreq = {}

if (currentWeek) {
  for (let d of currentWeek.days) {
    for (let t of ['MOR','MID','NON','EVE']) {
      let v = d.draws[t]
      if (v && v !== "PENDING" && v !== "-" && v !== "") {
        let n = parseInt(v)
        if (!isNaN(n)) {
          thisWeekNumbers.add(n)
          thisWeekFreq[n] = (thisWeekFreq[n] || 0) + 1
        }
      }
    }
  }
}

// ------------------------------------------
// HELPER
// ------------------------------------------
function numbersInWeek(week) {
  let set = new Set()
  for (let d of week.days) {
    for (let t of ['MOR','MID','NON','EVE']) {
      let v = d.draws[t]
      if (v && v !== "PENDING" && v !== "-" && v !== "") {
        let n = parseInt(v)
        if (!isNaN(n)) set.add(n)
      }
    }
  }
  return set
}

function ballColor(freq) {
  if (freq >= 4) return new Color("#E53935") // red
  if (freq === 3) return new Color("#FF9800") // orange
  if (freq === 2) return new Color("#4CAF50") // green
  return new Color("#0c17ed") // neutral (1x)
}

let weekNumbers = completedWeeks.map(numbersInWeek)

// ------------------------------------------
// AGING OUTSTANDING LOGIC (CORRECT)
// ------------------------------------------
let outstanding = {}
outstanding["THIS"] = []

for (let i = 1; i <= completedWeeks.length; i++) outstanding[i] = []

for (let num = 1; num <= 36; num++) {

  // THIS WEEK
  if (thisWeekNumbers.has(num)) {
    outstanding["THIS"].push(num)
    continue
  }

  // Find most recent completed week it appeared in
  for (let w = weekNumbers.length - 1; w >= 0; w--) {
    if (weekNumbers[w].has(num)) {
      let bucket = weekNumbers.length - w
      outstanding[bucket].push(num)
      break
    }
  }
}

// -----------------------------------------
// SORT & COLLAPSE EMPTY ROWS
// -----------------------------------------
let sortedKeys = Object.keys(outstanding)
  .filter(k => outstanding[k].length > 0) // 👈 collapse empty rows
  .sort((a, b) => {
    if (a === "THIS") return 1
    if (b === "THIS") return -1
    return b - a
  })

function fmt(nums) {
  return nums
    .sort((a,b) => a - b)
    .map(n => (n < 10 ? "0" + n : n))
    .join(" ")
}

// -----------------------------------------
// RENDER
// -----------------------------------------
let rowColors = [new Color("#1a1a1a"), new Color("#0f0f0f")]
let i = 0

for (let k of sortedKeys) {

  let label =
  k === "THIS" ? "This week" :
  k === "1" ? "Last week" :
  `${parseInt(k) + 1} weeks`

  let row = widget.addStack()
  row.layoutHorizontally()
  row.cornerRadius = 6
  row.backgroundColor = rowColors[i % 2]
  row.setPadding(6, 8, 6, 8)

  let l = row.addText(label)
  l.font = Font.boldSystemFont(14)
  l.textColor = new Color("#00ffff")

  row.addSpacer()

  if (k === "THIS") {
    let nums = outstanding[k].sort((a, b) => a - b)

    // Create a vertical stack for multiple rows of balls
    let ballsContainer = row.addStack()
    ballsContainer.layoutVertically()
    ballsContainer.spacing = 6

    let currentRow = null

    for (let i = 0; i < nums.length; i++) {
      if (i % 8 === 0) {
        // Start a new horizontal row every 7 balls
        currentRow = ballsContainer.addStack()
        currentRow.layoutHorizontally()
        currentRow.spacing = 6
        currentRow.centerAlignContent()
      }

      let n = nums[i]
      let ball = currentRow.addStack()
      ball.size = new Size(24, 24)
      ball.cornerRadius = 12
      ball.backgroundColor = ballColor(thisWeekFreq[n] || 1)
      ball.centerAlignContent()

      let txt = ball.addText(n.toString().padStart(2, "0"))
      txt.font = Font.boldSystemFont(12)
      txt.textColor = Color.white()
      txt.centerAlignText()
    }

  } else {

    let r = row.addText(fmt(outstanding[k]))
    r.font = Font.mediumSystemFont(14)
    r.textColor = Color.white()
    r.minimumScaleFactor = 0.9
  }

  widget.addSpacer(4)
  i++
}

// -----------------------------------------
// FOOTER
// -----------------------------------------
widget.addSpacer(6)
let footer = widget.addText(
  `⏰: ${new Date().toLocaleTimeString("en-TT", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit"
  })} • FSP SAGi Systems`
)
footer.font = Font.mediumSystemFont(8)
footer.textColor = new Color("#666")
footer.centerAlignText()

// ----------------------------------------
// AUTO-REFRESH (Silent, iOS-approved)
// ----------------------------------------
widget.refreshAfterDate = new Date(Date.now() + 4 * 60 * 1000) // every 4 minutes

Script.setWidget(widget)
Script.complete()