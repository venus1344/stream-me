# Landing & Login Pages Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Design and build the landing page (product intro, features, pricing) and login page (authentication form) in Pencil for the OME Player SaaS product.

**Architecture:**
- Landing page: Top-to-bottom vertical scroll with hero, use cases, features, stats, pricing, testimonials placeholder, footer CTA, footer.
- Login page: Centered form with email/phone input that auto-detects input type and shows password or OTP flow.
- Both pages use shared design system variables (colors, fonts, spacing).

**Tech Stack:** Pencil MCP (batch_design tool), Space Grotesk font, dark theme colors from OME design system.

## Global Constraints

- **Page width:** 1600px for desktop (responsive, adjusts on mobile/tablet)
- **Font:** Space Grotesk (all headings and body text)
- **Background color:** #050505 (page bg), #101114 (cards/surfaces), #15171C (alt surfaces)
- **Border color:** #292D35
- **Text colors:** #F7F7F7 (primary), #9BA3AF (muted)
- **Accent colors:** Red #E50914, Green #2EE66B, Blue #4DA3FF, Amber #F5B84B
- **Rounded corners:** 12px (inputs), 16-20px (cards), 20px (containers)
- **Spacing:** 40-60px between sections, 8px-24px internal padding in cards

---

## Landing Page Implementation

### Task 1: Clear Landing Page & Create Hero Section

**Files:**
- Modify: `designs/landing.pen` (replace existing content)

**Interfaces:**
- Produces: Hero frame (1600x600) with headline, subheading, CTA button, background glows

- [ ] **Step 1: Open landing.pen and view current structure**

Open the Pencil editor at `/Users/danielbwere/Projects/tools/ome/designs/landing.pen` and note the existing "Home Player - Netflix Dark" frame. We'll replace this entire content with the new landing page.

- [ ] **Step 2: Delete existing content and create hero frame**

Call `batch_design` with:
```javascript
Delete("DYiBt"); // Delete the old "Home Player - Netflix Dark" frame

const heroFrame = Insert(document, {
  type: "frame",
  name: "Landing Page",
  x: 0,
  y: 0,
  width: 1600,
  layout: "vertical",
  gap: 60,
  padding: 0,
  fill: "$bg",
  clip: true,
  placeholder: true
});

const heroSection = Insert(heroFrame, {
  type: "frame",
  name: "Hero Section",
  width: "fill_container",
  height: 600,
  layout: "vertical",
  gap: 24,
  padding: [80, 120],
  justifyContent: "center",
  alignItems: "start",
  fill: "$bg"
});

Insert(heroSection, {
  type: "text",
  name: "Hero Headline",
  content: "Stream to Multiple Platforms at 1/3 the Cost",
  fontFamily: "$font",
  fontSize: 56,
  fontWeight: "900",
  letterSpacing: -2,
  fill: "$text",
  textGrowth: "fixed-width",
  width: 900
});

Insert(heroSection, {
  type: "text",
  name: "Hero Subheading",
  content: "One OBS setup. YouTube, Facebook, Instagram, anywhere. Powered by OME.",
  fontFamily: "$font",
  fontSize: 18,
  fontWeight: "normal",
  fill: "$muted",
  textGrowth: "fixed-width",
  width: 700,
  lineHeight: 1.4
});

const heroButtonContainer = Insert(heroSection, {
  type: "frame",
  name: "Hero CTA Container",
  gap: 12,
  layout: "vertical",
  alignItems: "start",
  width: "fit_content"
});

Insert(heroButtonContainer, {
  type: "frame",
  name: "Start Trial Button",
  fill: "$red",
  cornerRadius: 12,
  padding: [16, 32],
  justifyContent: "center",
  alignItems: "center",
  children: [{
    type: "text",
    name: "Button Label",
    content: "Start Free Trial (2 hours)",
    fontFamily: "$font",
    fontSize: 15,
    fontWeight: "900",
    fill: "#FFFFFF"
  }]
});

Insert(heroButtonContainer, {
  type: "text",
  name: "No CC Required Text",
  content: "No credit card required",
  fontFamily: "$font",
  fontSize: 12,
  fill: "$muted"
});
```

- [ ] **Step 3: Add background gradient glows to hero**

Call `batch_design`:
```javascript
const redGlow = Insert("heroSection", {
  type: "ellipse",
  name: "Hero Red Glow",
  x: 800,
  y: -200,
  width: 600,
  height: 400,
  fill: {
    type: "gradient",
    gradientType: "radial",
    opacity: 0.25,
    colors: [
      {color: "#E50914", position: 0},
      {color: "#05050500", position: 1}
    ]
  }
});

const blueGlow = Insert("heroSection", {
  type: "ellipse",
  name: "Hero Blue Glow",
  x: -300,
  y: 200,
  width: 500,
  height: 400,
  fill: {
    type: "gradient",
    gradientType: "radial",
    opacity: 0.15,
    colors: [
      {color: "$blue", position: 0},
      {color: "#05050500", position: 1}
    ]
  }
});
```

- [ ] **Step 4: Commit progress**

```bash
cd /Users/danielbwere/Projects/tools/ome
git add designs/landing.pen
git commit -m "feat: landing - add hero section with headline and CTA"
```

---

### Task 2: Build Use Cases Section (3 Cards)

**Files:**
- Modify: `designs/landing.pen`

**Interfaces:**
- Consumes: Landing Page frame from Task 1
- Produces: Use Cases section with 3 cards (Individual Creators, Broadcasters, Events)

- [ ] **Step 1: Add Use Cases section frame**

Call `batch_design`:
```javascript
const useCasesSection = Insert("Landing Page", {
  type: "frame",
  name: "Use Cases Section",
  width: "fill_container",
  height: "fit_content",
  layout: "vertical",
  gap: 24,
  padding: [0, 120],
  fill: "$bg"
});

const useCasesTitle = Insert(useCasesSection, {
  type: "text",
  name: "Use Cases Title",
  content: "Built for Your Workflow",
  fontFamily: "$font",
  fontSize: 36,
  fontWeight: "900",
  fill: "$text"
});

const useCasesGrid = Insert(useCasesSection, {
  type: "frame",
  name: "Use Cases Grid",
  width: "fill_container",
  gap: 20,
  layout: "horizontal",
  children: []
});
```

- [ ] **Step 2: Add 3 use case cards**

Call `batch_design`:
```javascript
const useCases = [
  {
    title: "Individual Creators",
    icon: "📱",
    description: "One stream, multiple audiences. Reach your fans on YouTube and TikTok simultaneously without managing separate streams."
  },
  {
    title: "Broadcasters & Teams",
    icon: "📡",
    description: "Coordinate multi-platform broadcasts. Schedule streams, monitor health, and respond to viewers across all platforms in one dashboard."
  },
  {
    title: "Events & Live Content",
    icon: "📅",
    description: "Host conferences, workshops, or live events. Stream to YouTube, Facebook, Instagram simultaneously with fallback video if your connection drops."
  }
];

const colors = ["$red", "$green", "$blue"];

for (let i = 0; i < useCases.length; i++) {
  const card = Insert("Use Cases Grid", {
    type: "frame",
    name: `Use Case Card - ${useCases[i].title}`,
    width: "fill_container",
    fill: "$surface",
    stroke: "$border",
    strokeWidth: 1,
    cornerRadius: 18,
    padding: [24, 28],
    layout: "vertical",
    gap: 12
  });

  Insert(card, {
    type: "text",
    name: "Icon",
    content: useCases[i].icon,
    fontFamily: "$font",
    fontSize: 28,
    fill: colors[i]
  });

  Insert(card, {
    type: "text",
    name: "Card Title",
    content: useCases[i].title,
    fontFamily: "$font",
    fontSize: 20,
    fontWeight: "900",
    fill: "$text"
  });

  Insert(card, {
    type: "text",
    name: "Card Description",
    content: useCases[i].description,
    fontFamily: "$font",
    fontSize: 14,
    fill: "$muted",
    textGrowth: "fixed-width",
    width: "fill_container",
    lineHeight: 1.35
  });
}
```

- [ ] **Step 3: Commit progress**

```bash
cd /Users/danielbwere/Projects/tools/ome
git add designs/landing.pen
git commit -m "feat: landing - add use cases section with 3 cards"
```

---

### Task 3: Build Core Features Section (5 Cards)

**Files:**
- Modify: `designs/landing.pen`

**Interfaces:**
- Consumes: Landing Page frame from Task 1
- Produces: Features section with 5 feature cards

- [ ] **Step 1: Add Features section frame**

Call `batch_design`:
```javascript
const featuresSection = Insert("Landing Page", {
  type: "frame",
  name: "Features Section",
  width: "fill_container",
  height: "fit_content",
  layout: "vertical",
  gap: 24,
  padding: [0, 120],
  fill: "$bg"
});

Insert(featuresSection, {
  type: "text",
  name: "Features Title",
  content: "Powerful Features Built In",
  fontFamily: "$font",
  fontSize: 36,
  fontWeight: "900",
  fill: "$text"
});

const featuresGrid = Insert(featuresSection, {
  type: "frame",
  name: "Features Grid",
  width: "fill_container",
  layout: "vertical",
  gap: 20
});
```

- [ ] **Step 2: Add first row of 2 feature cards**

Call `batch_design`:
```javascript
const row1 = Insert("Features Grid", {
  type: "frame",
  name: "Features Row 1",
  width: "fill_container",
  gap: 20,
  layout: "horizontal"
});

const feature1 = Insert(row1, {
  type: "frame",
  name: "Feature - Multi-Destination",
  width: "fill_container",
  fill: "$surface",
  stroke: "$border",
  strokeWidth: 1,
  cornerRadius: 18,
  padding: [24, 28],
  layout: "vertical",
  gap: 12
});

Insert(feature1, {
  type: "text",
  name: "Feature Icon",
  content: "📡",
  fontFamily: "$font",
  fontSize: 24,
  fill: "$blue"
});

Insert(feature1, {
  type: "text",
  name: "Feature Title",
  content: "Stream to Multiple Platforms",
  fontFamily: "$font",
  fontSize: 18,
  fontWeight: "900",
  fill: "$text"
});

Insert(feature1, {
  type: "text",
  name: "Feature Description",
  content: "Send your stream to YouTube, Facebook, Instagram, and more simultaneously. One OBS setup, infinite reach.",
  fontFamily: "$font",
  fontSize: 14,
  fill: "$muted",
  textGrowth: "fixed-width",
  width: "fill_container",
  lineHeight: 1.35
});

const feature2 = Insert(row1, {
  type: "frame",
  name: "Feature - Low-Latency",
  width: "fill_container",
  fill: "$surface",
  stroke: "$border",
  strokeWidth: 1,
  cornerRadius: 18,
  padding: [24, 28],
  layout: "vertical",
  gap: 12
});

Insert(feature2, {
  type: "text",
  name: "Feature Icon",
  content: "⚡",
  fontFamily: "$font",
  fontSize: 24,
  fill: "$green"
});

Insert(feature2, {
  type: "text",
  name: "Feature Title",
  content: "Low-Latency Playback",
  fontFamily: "$font",
  fontSize: 18,
  fontWeight: "900",
  fill: "$text"
});

Insert(feature2, {
  type: "text",
  name: "Feature Description",
  content: "LL-HLS and WebRTC playback with minimal delay. Keep your audience engaged in real-time.",
  fontFamily: "$font",
  fontSize: 14,
  fill: "$muted",
  textGrowth: "fixed-width",
  width: "fill_container",
  lineHeight: 1.35
});
```

- [ ] **Step 3: Add second row of 2 feature cards**

Call `batch_design`:
```javascript
const row2 = Insert("Features Grid", {
  type: "frame",
  name: "Features Row 2",
  width: "fill_container",
  gap: 20,
  layout: "horizontal"
});

const feature3 = Insert(row2, {
  type: "frame",
  name: "Feature - Offline Sequencing",
  width: "fill_container",
  fill: "$surface",
  stroke: "$border",
  strokeWidth: 1,
  cornerRadius: 18,
  padding: [24, 28],
  layout: "vertical",
  gap: 12
});

Insert(feature3, {
  type: "text",
  name: "Feature Icon",
  content: "🔄",
  fontFamily: "$font",
  fontSize: 24,
  fill: "$amber"
});

Insert(feature3, {
  type: "text",
  name: "Feature Title",
  content: "Never Miss a Beat",
  fontFamily: "$font",
  fontSize: 18,
  fontWeight: "900",
  fill: "$text"
});

Insert(feature3, {
  type: "text",
  name: "Feature Description",
  content: "If your connection drops, pre-recorded videos automatically play. Your stream stays live.",
  fontFamily: "$font",
  fontSize: 14,
  fill: "$muted",
  textGrowth: "fixed-width",
  width: "fill_container",
  lineHeight: 1.35
});

const feature4 = Insert(row2, {
  type: "frame",
  name: "Feature - Scheduled Broadcasts",
  width: "fill_container",
  fill: "$surface",
  stroke: "$border",
  strokeWidth: 1,
  cornerRadius: 18,
  padding: [24, 28],
  layout: "vertical",
  gap: 12
});

Insert(feature4, {
  type: "text",
  name: "Feature Icon",
  content: "📅",
  fontFamily: "$font",
  fontSize: 24,
  fill: "$red"
});

Insert(feature4, {
  type: "text",
  name: "Feature Title",
  content: "Schedule & Queue Streams",
  fontFamily: "$font",
  fontSize: 18,
  fontWeight: "900",
  fill: "$text"
});

Insert(feature4, {
  type: "text",
  name: "Feature Description",
  content: "Plan your content in advance. Schedule broadcasts and queue multiple streams to go live at set times.",
  fontFamily: "$font",
  fontSize: 14,
  fill: "$muted",
  textGrowth: "fixed-width",
  width: "fill_container",
  lineHeight: 1.35
});
```

- [ ] **Step 4: Add 5th feature card (centered)**

Call `batch_design`:
```javascript
const row3 = Insert("Features Grid", {
  type: "frame",
  name: "Features Row 3",
  width: "fill_container",
  justifyContent: "center",
  gap: 20,
  layout: "horizontal"
});

const feature5 = Insert(row3, {
  type: "frame",
  name: "Feature - Single Stream",
  width: 600,
  fill: "$surface",
  stroke: "$border",
  strokeWidth: 1,
  cornerRadius: 18,
  padding: [24, 28],
  layout: "vertical",
  gap: 12
});

Insert(feature5, {
  type: "text",
  name: "Feature Icon",
  content: "🔌",
  fontFamily: "$font",
  fontSize: 24,
  fill: "$blue"
});

Insert(feature5, {
  type: "text",
  name: "Feature Title",
  content: "One Stream, Infinite Reach",
  fontFamily: "$font",
  fontSize: 18,
  fontWeight: "900",
  fill: "$text"
});

Insert(feature5, {
  type: "text",
  name: "Feature Description",
  content: "Send one RTMP stream to OME. No OBS plugins, no configuration per platform. We handle the distribution.",
  fontFamily: "$font",
  fontSize: 14,
  fill: "$muted",
  textGrowth: "fixed-width",
  width: "fill_container",
  lineHeight: 1.35
});
```

- [ ] **Step 5: Commit progress**

```bash
cd /Users/danielbwere/Projects/tools/ome
git add designs/landing.pen
git commit -m "feat: landing - add features section with 5 feature cards"
```

---

### Task 4: Build Stats Section (3 Cards)

**Files:**
- Modify: `designs/landing.pen`

**Interfaces:**
- Consumes: Landing Page frame from Task 1
- Produces: Stats section with 3 stat cards

- [ ] **Step 1: Add Stats section**

Call `batch_design`:
```javascript
const statsSection = Insert("Landing Page", {
  type: "frame",
  name: "Stats Section",
  width: "fill_container",
  height: "fit_content",
  layout: "horizontal",
  gap: 20,
  padding: [0, 120],
  fill: "$bg"
});

const stats = [
  {label: "Uptime Guaranteed", value: "99.9%", subtext: "Backed by enterprise infrastructure"},
  {label: "Successful Streams", value: "50K+", subtext: "Powering creators worldwide"},
  {label: "Active Users", value: "10K+", subtext: "Streaming right now"}
];

const statColors = ["$red", "$green", "$blue"];

for (let i = 0; i < stats.length; i++) {
  const statCard = Insert("Stats Section", {
    type: "frame",
    name: `Stat Card - ${stats[i].label}`,
    width: "fill_container",
    fill: "$surface",
    stroke: "$border",
    strokeWidth: 1,
    cornerRadius: 18,
    padding: [24, 28],
    layout: "vertical",
    gap: 8,
    justifyContent: "center",
    alignItems: "center"
  });

  Insert(statCard, {
    type: "text",
    name: "Stat Value",
    content: stats[i].value,
    fontFamily: "$font",
    fontSize: 44,
    fontWeight: "900",
    fill: statColors[i]
  });

  Insert(statCard, {
    type: "text",
    name: "Stat Label",
    content: stats[i].label,
    fontFamily: "$font",
    fontSize: 16,
    fontWeight: "900",
    fill: "$text"
  });

  Insert(statCard, {
    type: "text",
    name: "Stat Subtext",
    content: stats[i].subtext,
    fontFamily: "$font",
    fontSize: 12,
    fill: "$muted"
  });
}
```

- [ ] **Step 2: Commit progress**

```bash
cd /Users/danielbwere/Projects/tools/ome
git add designs/landing.pen
git commit -m "feat: landing - add stats section with 3 cards"
```

---

### Task 5: Build Pricing Section (3 Tier Cards)

**Files:**
- Modify: `designs/landing.pen`

**Interfaces:**
- Consumes: Landing Page frame from Task 1
- Produces: Pricing section with 3 pricing tier cards (Starter, Professional, Enterprise)

- [ ] **Step 1: Add Pricing section frame**

Call `batch_design`:
```javascript
const pricingSection = Insert("Landing Page", {
  type: "frame",
  name: "Pricing Section",
  width: "fill_container",
  height: "fit_content",
  layout: "vertical",
  gap: 24,
  padding: [0, 120],
  fill: "$bg"
});

Insert(pricingSection, {
  type: "text",
  name: "Pricing Title",
  content: "Simple, Transparent Pricing",
  fontFamily: "$font",
  fontSize: 36,
  fontWeight: "900",
  fill: "$text"
});

const pricingGrid = Insert(pricingSection, {
  type: "frame",
  name: "Pricing Grid",
  width: "fill_container",
  gap: 20,
  layout: "horizontal"
});
```

- [ ] **Step 2: Add Starter tier card**

Call `batch_design`:
```javascript
const starterCard = Insert("Pricing Grid", {
  type: "frame",
  name: "Pricing Card - Starter",
  width: "fill_container",
  fill: "$surface",
  stroke: "$border",
  strokeWidth: 1,
  cornerRadius: 20,
  padding: [32, 28],
  layout: "vertical",
  gap: 20
});

Insert(starterCard, {
  type: "frame",
  name: "Starter Badge",
  width: "fit_content",
  fill: "#2A1114",
  stroke: "#6F2028",
  strokeWidth: 1,
  cornerRadius: 8,
  padding: [6, 12],
  justifyContent: "center",
  alignItems: "center",
  children: [{
    type: "text",
    name: "Badge Text",
    content: "Free Trial",
    fontFamily: "$font",
    fontSize: 12,
    fontWeight: "900",
    fill: "#FFE4E6"
  }]
});

const priceContainer = Insert(starterCard, {
  type: "frame",
  name: "Price Display",
  width: "fit_content",
  layout: "horizontal",
  gap: 4,
  alignItems: "baseline"
});

Insert(priceContainer, {
  type: "text",
  name: "Price Amount",
  content: "$0",
  fontFamily: "$font",
  fontSize: 40,
  fontWeight: "900",
  fill: "$text"
});

Insert(priceContainer, {
  type: "text",
  name: "Price Period",
  content: "/month",
  fontFamily: "$font",
  fontSize: 14,
  fill: "$muted"
});

const starterFeatures = Insert(starterCard, {
  type: "frame",
  name: "Features List",
  width: "fill_container",
  layout: "vertical",
  gap: 12
});

Insert(starterFeatures, {
  type: "frame",
  name: "Feature Row",
  width: "fill_container",
  layout: "horizontal",
  gap: 8,
  alignItems: "center",
  children: [
    {type: "text", name: "Check", content: "✓", fontFamily: "$font", fontSize: 16, fill: "$blue"},
    {type: "text", name: "Text", content: "2 Platforms", fontFamily: "$font", fontSize: 14, fill: "$text", textGrowth: "fixed-width", width: "fill_container"}
  ]
});

Insert(starterFeatures, {
  type: "frame",
  name: "Feature Row",
  width: "fill_container",
  layout: "horizontal",
  gap: 8,
  alignItems: "center",
  children: [
    {type: "text", name: "Check", content: "✓", fontFamily: "$font", fontSize: 16, fill: "$green"},
    {type: "text", name: "Text", content: "60 minutes offline", fontFamily: "$font", fontSize: 14, fill: "$text", textGrowth: "fixed-width", width: "fill_container"}
  ]
});

Insert(starterFeatures, {
  type: "frame",
  name: "Feature Row",
  width: "fill_container",
  layout: "horizontal",
  gap: 8,
  alignItems: "center",
  children: [
    {type: "text", name: "Check", content: "✓", fontFamily: "$font", fontSize: 16, fill: "$amber"},
    {type: "text", name: "Text", content: "720p video quality", fontFamily: "$font", fontSize: 14, fill: "$text", textGrowth: "fixed-width", width: "fill_container"}
  ]
});

Insert(starterFeatures, {
  type: "frame",
  name: "Feature Row",
  width: "fill_container",
  layout: "horizontal",
  gap: 8,
  alignItems: "center",
  children: [
    {type: "text", name: "Check", content: "✓", fontFamily: "$font", fontSize: 16, fill: "$blue"},
    {type: "text", name: "Text", content: "Stream stats & monitoring", fontFamily: "$font", fontSize: 14, fill: "$text", textGrowth: "fixed-width", width: "fill_container"}
  ]
});

Insert(starterCard, {
  type: "frame",
  name: "CTA Button",
  width: "fill_container",
  fill: "$red",
  cornerRadius: 12,
  padding: [16, 18],
  justifyContent: "center",
  alignItems: "center",
  children: [{
    type: "text",
    name: "Button Text",
    content: "Start Free Trial",
    fontFamily: "$font",
    fontSize: 15,
    fontWeight: "900",
    fill: "#FFFFFF"
  }]
});

Insert(starterCard, {
  type: "text",
  name: "Trial Note",
  content: "2 hours streaming limit",
  fontFamily: "$font",
  fontSize: 12,
  fill: "$muted",
  textAlign: "center"
});
```

- [ ] **Step 3: Add Professional tier card**

Call `batch_design`:
```javascript
const proCard = Insert("Pricing Grid", {
  type: "frame",
  name: "Pricing Card - Professional",
  width: "fill_container",
  fill: "$surface",
  stroke: "$green",
  strokeWidth: 2,
  cornerRadius: 20,
  padding: [32, 28],
  layout: "vertical",
  gap: 20,
  effect: {
    type: "shadow",
    shadowType: "outer",
    color: "#2EE66B33",
    blur: 20,
    spread: 0
  }
});

Insert(proCard, {
  type: "frame",
  name: "Pro Badge",
  width: "fit_content",
  fill: "#0D2A16",
  stroke: "#2EE66B",
  strokeWidth: 1,
  cornerRadius: 8,
  padding: [6, 12],
  justifyContent: "center",
  alignItems: "center",
  children: [{
    type: "text",
    name: "Badge Text",
    content: "Recommended",
    fontFamily: "$font",
    fontSize: 12,
    fontWeight: "900",
    fill: "$green"
  }]
});

const proPriceContainer = Insert(proCard, {
  type: "frame",
  name: "Price Display",
  width: "fit_content",
  layout: "horizontal",
  gap: 4,
  alignItems: "baseline"
});

Insert(proPriceContainer, {
  type: "text",
  name: "Price Amount",
  content: "$29",
  fontFamily: "$font",
  fontSize: 40,
  fontWeight: "900",
  fill: "$text"
});

Insert(proPriceContainer, {
  type: "text",
  name: "Price Period",
  content: "/month",
  fontFamily: "$font",
  fontSize: 14,
  fill: "$muted"
});

const proFeatures = Insert(proCard, {
  type: "frame",
  name: "Features List",
  width: "fill_container",
  layout: "vertical",
  gap: 12
});

for (const feature of [
  "3 Platforms",
  "240 minutes offline",
  "1080p video quality",
  "Scheduled broadcasts",
  "Priority support"
]) {
  Insert(proFeatures, {
    type: "frame",
    name: "Feature Row",
    width: "fill_container",
    layout: "horizontal",
    gap: 8,
    alignItems: "center",
    children: [
      {type: "text", name: "Check", content: "✓", fontFamily: "$font", fontSize: 16, fill: "$green"},
      {type: "text", name: "Text", content: feature, fontFamily: "$font", fontSize: 14, fill: "$text", textGrowth: "fixed-width", width: "fill_container"}
    ]
  });
}

Insert(proCard, {
  type: "frame",
  name: "CTA Button",
  width: "fill_container",
  fill: "$red",
  cornerRadius: 12,
  padding: [16, 18],
  justifyContent: "center",
  alignItems: "center",
  children: [{
    type: "text",
    name: "Button Text",
    content: "Get Started",
    fontFamily: "$font",
    fontSize: 15,
    fontWeight: "900",
    fill: "#FFFFFF"
  }]
});
```

- [ ] **Step 4: Add Enterprise tier card**

Call `batch_design`:
```javascript
const entCard = Insert("Pricing Grid", {
  type: "frame",
  name: "Pricing Card - Enterprise",
  width: "fill_container",
  fill: "$surface",
  stroke: "$border",
  strokeWidth: 1,
  cornerRadius: 20,
  padding: [32, 28],
  layout: "vertical",
  gap: 20
});

Insert(entCard, {
  type: "frame",
  name: "Ent Badge",
  width: "fit_content",
  fill: "#1A1F2E",
  stroke: "#4DA3FF",
  strokeWidth: 1,
  cornerRadius: 8,
  padding: [6, 12],
  justifyContent: "center",
  alignItems: "center",
  children: [{
    type: "text",
    name: "Badge Text",
    content: "Unlimited",
    fontFamily: "$font",
    fontSize: 12,
    fontWeight: "900",
    fill: "$blue"
  }]
});

const entPriceContainer = Insert(entCard, {
  type: "frame",
  name: "Price Display",
  width: "fit_content",
  layout: "vertical",
  gap: 4,
  alignItems: "start"
});

Insert(entPriceContainer, {
  type: "text",
  name: "Price Amount",
  content: "Custom",
  fontFamily: "$font",
  fontSize: 40,
  fontWeight: "900",
  fill: "$text"
});

Insert(entPriceContainer, {
  type: "text",
  name: "Price Period",
  content: "Contact us for pricing",
  fontFamily: "$font",
  fontSize: 14,
  fill: "$muted"
});

const entFeatures = Insert(entCard, {
  type: "frame",
  name: "Features List",
  width: "fill_container",
  layout: "vertical",
  gap: 12
});

for (const feature of [
  "4+ Platforms",
  "Unlimited offline storage",
  "4K video quality",
  "Custom integrations",
  "Dedicated support"
]) {
  Insert(entFeatures, {
    type: "frame",
    name: "Feature Row",
    width: "fill_container",
    layout: "horizontal",
    gap: 8,
    alignItems: "center",
    children: [
      {type: "text", name: "Check", content: "✓", fontFamily: "$font", fontSize: 16, fill: "$blue"},
      {type: "text", name: "Text", content: feature, fontFamily: "$font", fontSize: 14, fill: "$text", textGrowth: "fixed-width", width: "fill_container"}
    ]
  });
}

Insert(entCard, {
  type: "frame",
  name: "CTA Button",
  width: "fill_container",
  fill: "#00000000",
  stroke: "$blue",
  strokeWidth: 1,
  cornerRadius: 12,
  padding: [16, 18],
  justifyContent: "center",
  alignItems: "center",
  children: [{
    type: "text",
    name: "Button Text",
    content: "Contact Sales",
    fontFamily: "$font",
    fontSize: 15,
    fontWeight: "900",
    fill: "$blue"
  }]
});
```

- [ ] **Step 5: Commit progress**

```bash
cd /Users/danielbwere/Projects/tools/ome
git add designs/landing.pen
git commit -m "feat: landing - add pricing section with 3 tier cards"
```

---

### Task 6: Build Testimonials & Footer CTA Sections

**Files:**
- Modify: `designs/landing.pen`

**Interfaces:**
- Consumes: Landing Page frame from Task 1
- Produces: Testimonials placeholder section and Footer CTA section

- [ ] **Step 1: Add Testimonials placeholder section**

Call `batch_design`:
```javascript
const testimonialsSection = Insert("Landing Page", {
  type: "frame",
  name: "Testimonials Section",
  width: "fill_container",
  height: "fit_content",
  layout: "vertical",
  gap: 24,
  padding: [60, 120],
  fill: "$surface",
  cornerRadius: 0
});

Insert(testimonialsSection, {
  type: "text",
  name: "Testimonials Title",
  content: "Loved by Creators",
  fontFamily: "$font",
  fontSize: 36,
  fontWeight: "900",
  fill: "$text"
});

const testimonialsGrid = Insert(testimonialsSection, {
  type: "frame",
  name: "Testimonials Grid",
  width: "fill_container",
  gap: 20,
  layout: "horizontal"
});

// Add 3 empty placeholder cards
for (let i = 0; i < 3; i++) {
  Insert(testimonialsGrid, {
    type: "frame",
    name: `Testimonial Card ${i+1}`,
    width: "fill_container",
    height: 240,
    fill: "$bg",
    stroke: "$border",
    strokeWidth: 1,
    cornerRadius: 18,
    padding: [24, 28],
    layout: "vertical",
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
    children: [{
      type: "text",
      name: "Placeholder",
      content: "Testimonial coming soon",
      fontFamily: "$font",
      fontSize: 14,
      fill: "$muted",
      textAlign: "center"
    }]
  });
}
```

- [ ] **Step 2: Add Footer CTA section**

Call `batch_design`:
```javascript
const footerCtaSection = Insert("Landing Page", {
  type: "frame",
  name: "Footer CTA Section",
  width: "fill_container",
  height: "fit_content",
  layout: "vertical",
  gap: 24,
  padding: [80, 120],
  fill: "$bg",
  justifyContent: "center",
  alignItems: "center"
});

Insert(footerCtaSection, {
  type: "text",
  name: "CTA Headline",
  content: "Ready to Stream Smarter?",
  fontFamily: "$font",
  fontSize: 40,
  fontWeight: "900",
  fill: "$text",
  textAlign: "center"
});

Insert(footerCtaSection, {
  type: "text",
  name: "CTA Subheading",
  content: "Join thousands of creators reducing complexity and costs.",
  fontFamily: "$font",
  fontSize: 16,
  fill: "$muted",
  textAlign: "center"
});

const ctaButtonContainer = Insert(footerCtaSection, {
  type: "frame",
  name: "CTA Button Container",
  gap: 16,
  layout: "horizontal",
  alignItems: "center"
});

Insert(ctaButtonContainer, {
  type: "frame",
  name: "Primary CTA Button",
  fill: "$red",
  cornerRadius: 12,
  padding: [16, 40],
  justifyContent: "center",
  alignItems: "center",
  children: [{
    type: "text",
    name: "Button Text",
    content: "Start Your Free Trial",
    fontFamily: "$font",
    fontSize: 15,
    fontWeight: "900",
    fill: "#FFFFFF"
  }]
});

Insert(ctaButtonContainer, {
  type: "text",
  name: "Secondary Link",
  content: "Schedule a demo",
  fontFamily: "$font",
  fontSize: 15,
  fill: "$blue"
});
```

- [ ] **Step 3: Add Footer**

Call `batch_design`:
```javascript
const footer = Insert("Landing Page", {
  type: "frame",
  name: "Footer",
  width: "fill_container",
  height: "fit_content",
  layout: "vertical",
  gap: 20,
  padding: [40, 120],
  fill: "$bg",
  borderTop: "1px solid $border"
});

const footerLinks = Insert(footer, {
  type: "frame",
  name: "Footer Links",
  width: "fill_container",
  gap: 20,
  layout: "horizontal",
  justifyContent: "start"
});

for (const link of ["Privacy Policy", "Terms of Service", "Contact"]) {
  Insert(footerLinks, {
    type: "text",
    name: link,
    content: link,
    fontFamily: "$font",
    fontSize: 13,
    fill: "$muted"
  });
}

Insert(footer, {
  type: "text",
  name: "Copyright",
  content: "© 2026 OME Player. All rights reserved.",
  fontFamily: "$font",
  fontSize: 12,
  fill: "$muted"
});
```

- [ ] **Step 4: Remove placeholder flag from main Landing Page frame**

Call `batch_design`:
```javascript
Update("Landing Page", {placeholder: false});
```

- [ ] **Step 5: Commit progress**

```bash
cd /Users/danielbwere/Projects/tools/ome
git add designs/landing.pen
git commit -m "feat: landing - add testimonials placeholder and footer sections"
```

---

## Login Page Implementation

### Task 7: Create Login Page Structure & Form Container

**Files:**
- Create/Modify: `designs/login.pen`

**Interfaces:**
- Produces: Centered login form with branding, email/phone input, conditional auth fields

- [ ] **Step 1: Create login page base frame**

Call `batch_design`:
```javascript
const loginPage = Insert(document, {
  type: "frame",
  name: "Login Page",
  x: 0,
  y: 0,
  width: 1440,
  height: 900,
  layout: "none",
  fill: "$bg",
  clip: true,
  placeholder: true
});

const loginContainer = Insert(loginPage, {
  type: "frame",
  name: "Login Container",
  x: 520,
  y: 150,
  width: 400,
  layout: "vertical",
  gap: 32,
  fill: "$surface",
  stroke: "$border",
  strokeWidth: 1,
  cornerRadius: 20,
  padding: [40, 32]
});

const branding = Insert(loginContainer, {
  type: "frame",
  name: "Branding",
  width: "fit_content",
  gap: 8,
  layout: "horizontal",
  alignItems: "center",
  justifyContent: "center"
});

Insert(branding, {
  type: "frame",
  name: "Logo Box",
  width: 32,
  height: 32,
  fill: "$red",
  cornerRadius: 8,
  layout: "none",
  children: [{
    type: "text",
    name: "Play Icon",
    content: "▶",
    fontFamily: "$font",
    fontSize: 14,
    fill: "#FFFFFF",
    x: 9,
    y: 7
  }]
});

Insert(branding, {
  type: "text",
  name: "Brand Text",
  content: "OME Player",
  fontFamily: "$font",
  fontSize: 18,
  fontWeight: "900",
  fill: "$text"
});

const formHeader = Insert(loginContainer, {
  type: "frame",
  name: "Form Header",
  width: "fill_container",
  layout: "vertical",
  gap: 8
});

Insert(formHeader, {
  type: "text",
  name: "Form Title",
  content: "Sign In",
  fontFamily: "$font",
  fontSize: 28,
  fontWeight: "900",
  fill: "$text"
});

Insert(formHeader, {
  type: "text",
  name: "Form Subtitle",
  content: "Access your streaming dashboard",
  fontFamily: "$font",
  fontSize: 14,
  fill: "$muted"
});
```

- [ ] **Step 2: Add email/phone input field**

Call `batch_design`:
```javascript
const emailPhoneContainer = Insert(loginContainer, {
  type: "frame",
  name: "Email Phone Field",
  width: "fill_container",
  layout: "vertical",
  gap: 8
});

Insert(emailPhoneContainer, {
  type: "text",
  name: "Field Label",
  content: "EMAIL OR PHONE",
  fontFamily: "$font",
  fontSize: 12,
  fontWeight: "900",
  fill: "$muted",
  letterSpacing: 0.5
});

Insert(emailPhoneContainer, {
  type: "frame",
  name: "Input Email Phone",
  width: "fill_container",
  fill: "#07080C",
  stroke: "$border",
  strokeWidth: 1,
  cornerRadius: 12,
  padding: [12, 14],
  layout: "none",
  children: [{
    type: "text",
    name: "Placeholder",
    content: "user@example.com or +1 (555) 000-0000",
    fontFamily: "JetBrains Mono",
    fontSize: 13,
    fill: "#6B7280",
    x: 14,
    y: 12
  }]
});
```

- [ ] **Step 3: Add conditional password field (email path)**

Call `batch_design`:
```javascript
const passwordContainer = Insert(loginContainer, {
  type: "frame",
  name: "Password Field",
  width: "fill_container",
  layout: "vertical",
  gap: 8
});

Insert(passwordContainer, {
  type: "text",
  name: "Field Label",
  content: "PASSWORD",
  fontFamily: "$font",
  fontSize: 12,
  fontWeight: "900",
  fill: "$muted",
  letterSpacing: 0.5
});

Insert(passwordContainer, {
  type: "frame",
  name: "Input Password",
  width: "fill_container",
  fill: "#07080C",
  stroke: "$border",
  strokeWidth: 1,
  cornerRadius: 12,
  padding: [12, 14],
  layout: "horizontal",
  justifyContent: "space_between",
  alignItems: "center",
  children: [
    {
      type: "text",
      name: "Placeholder",
      content: "••••••••",
      fontFamily: "JetBrains Mono",
      fontSize: 13,
      fill: "#6B7280"
    },
    {
      type: "text",
      name: "Toggle Eye",
      content: "👁",
      fontFamily: "$font",
      fontSize: 14,
      fill: "$muted"
    }
  ]
});
```

- [ ] **Step 4: Add sign-in button and forgot password link**

Call `batch_design`:
```javascript
Insert(loginContainer, {
  type: "frame",
  name: "Sign In Button",
  width: "fill_container",
  fill: "$red",
  cornerRadius: 12,
  padding: [16, 18],
  justifyContent: "center",
  alignItems: "center",
  children: [{
    type: "text",
    name: "Button Text",
    content: "Sign In",
    fontFamily: "$font",
    fontSize: 15,
    fontWeight: "900",
    fill: "#FFFFFF"
  }]
});

Insert(loginContainer, {
  type: "text",
  name: "Forgot Password Link",
  content: "Forgot password?",
  fontFamily: "$font",
  fontSize: 13,
  fill: "$blue",
  textAlign: "center"
});
```

- [ ] **Step 5: Add bottom signup/trial link**

Call `batch_design`:
```javascript
const bottomLinksContainer = Insert(loginContainer, {
  type: "frame",
  name: "Bottom Links",
  width: "fill_container",
  layout: "horizontal",
  gap: 4,
  justifyContent: "center",
  alignItems: "center"
});

Insert(bottomLinksContainer, {
  type: "text",
  name: "Signup Text",
  content: "Don't have an account?",
  fontFamily: "$font",
  fontSize: 13,
  fill: "$muted"
});

Insert(bottomLinksContainer, {
  type: "text",
  name: "Signup Link",
  content: "Start Free Trial",
  fontFamily: "$font",
  fontSize: 13,
  fontWeight: "900",
  fill: "$blue"
});
```

- [ ] **Step 6: Finalize and remove placeholder**

Call `batch_design`:
```javascript
Update("Login Page", {placeholder: false});
```

- [ ] **Step 7: Commit progress**

```bash
cd /Users/danielbwere/Projects/tools/ome
git add designs/login.pen
git commit -m "feat: login - create centered form with branding and password flow"
```

---

### Task 8: Add OTP Alternative Flow & Polish

**Files:**
- Modify: `designs/login.pen`

**Interfaces:**
- Consumes: Login Page from Task 7
- Produces: OTP input field (hidden by default, shown for phone numbers)

- [ ] **Step 1: Add OTP input field (hidden state)**

Call `batch_design`:
```javascript
const otpContainer = Insert("Login Container", {
  type: "frame",
  name: "OTP Field",
  width: "fill_container",
  layout: "vertical",
  gap: 8,
  enabled: false // Hidden by default
});

Insert(otpContainer, {
  type: "text",
  name: "Field Label",
  content: "ENTER 6-DIGIT CODE",
  fontFamily: "$font",
  fontSize: 12,
  fontWeight: "900",
  fill: "$muted",
  letterSpacing: 0.5
});

Insert(otpContainer, {
  type: "frame",
  name: "Input OTP",
  width: "fill_container",
  fill: "#07080C",
  stroke: "$border",
  strokeWidth: 1,
  cornerRadius: 12,
  padding: [12, 14],
  layout: "none",
  children: [{
    type: "text",
    name: "Placeholder",
    content: "000000",
    fontFamily: "JetBrains Mono",
    fontSize: 13,
    fill: "#6B7280",
    x: 14,
    y: 12
  }]
});

Insert(otpContainer, {
  type: "text",
  name: "Resend Timer",
  content: "Resend code in 60s",
  fontFamily: "$font",
  fontSize: 12,
  fill: "$muted",
  textAlign: "center"
});
```

- [ ] **Step 2: Add "Send OTP" button variant (hidden by default)**

Call `batch_design`:
```javascript
Insert("Login Container", {
  type: "frame",
  name: "Send OTP Button",
  width: "fill_container",
  fill: "$red",
  cornerRadius: 12,
  padding: [16, 18],
  justifyContent: "center",
  alignItems: "center",
  enabled: false, // Hidden by default, shown for phone input
  children: [{
    type: "text",
    name: "Button Text",
    content: "Send OTP",
    fontFamily: "$font",
    fontSize: 15,
    fontWeight: "900",
    fill: "#FFFFFF"
  }]
});
```

- [ ] **Step 3: Add visual notes/explanation**

Call `batch_design`:
```javascript
Insert("Login Container", {
  type: "text",
  name: "Auth Note",
  content: "Email users: password login\nPhone users: OTP via SMS",
  fontFamily: "$font",
  fontSize: 11,
  fill: "$muted",
  textAlign: "center",
  lineHeight: 1.4
});
```

- [ ] **Step 4: Commit final login page**

```bash
cd /Users/danielbwere/Projects/tools/ome
git add designs/login.pen
git commit -m "feat: login - add OTP flow variant and polish form"
```

---

## Verification & Handoff

- [ ] **Step 1: View both designs**

Open `/Users/danielbwere/Projects/tools/ome/designs/landing.pen` and `/Users/danielbwere/Projects/tools/ome/designs/login.pen` in Pencil to verify:
- Landing page has all sections (hero, use cases, features, stats, pricing, testimonials, footer CTA, footer)
- Login page has centered form with branding, email/phone input, conditional password/OTP fields, and buttons
- Both pages use consistent design system colors and typography
- Pricing cards are visually distinct
- Form inputs have proper styling

- [ ] **Step 2: Final commit**

```bash
cd /Users/danielbwere/Projects/tools/ome
git log --oneline -8
# Verify all commits are present
```

---

## Summary

**Landing Page Sections Built:**
✓ Hero (headline, subheading, CTA, background glows)
✓ Use Cases (3 cards: creators, broadcasters, events)
✓ Features (5 cards: multi-destination, low-latency, offline sequencing, scheduled broadcasts, single stream)
✓ Stats (3 cards: uptime, streams, active users)
✓ Pricing (3 tiers: Starter $0, Professional $29, Enterprise custom)
✓ Testimonials (placeholder, empty, ready for content)
✓ Footer CTA ("Ready to Stream Smarter?")
✓ Footer (links, copyright)

**Login Page Built:**
✓ Centered form container (400px wide, responsive)
✓ Branding (logo + "OME Player")
✓ Email/phone input with auto-detection
✓ Password flow (for email users)
✓ OTP flow (for phone users, hidden by default)
✓ Sign In / Send OTP buttons
✓ Forgot password link (email path)
✓ Sign up / free trial link
✓ Consistent styling with design system

Both designs are now ready for frontend implementation and can be referenced for HTML/CSS development.