# Neural-Coding.com Component Specifications

## Overview

This document provides detailed specifications for all UI components, page layouts, interactive tools, and accessibility requirements for neural-coding.com.

---

## Design System

### Color Palette

```css
:root {
  /* Primary Colors */
  --color-primary-50: #ecfeff;
  --color-primary-100: #cffafe;
  --color-primary-200: #a5f3fc;
  --color-primary-300: #67e8f9;
  --color-primary-400: #22d3ee;
  --color-primary-500: #06b6d4;  /* Primary cyan */
  --color-primary-600: #0891b2;
  --color-primary-700: #0e7490;
  --color-primary-800: #155e75;
  --color-primary-900: #164e63;

  /* Neutral Colors (Dark theme) */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  --color-gray-950: #030712;  /* Background */

  /* Accent Colors */
  --color-success: #10b981;  /* Green */
  --color-warning: #f59e0b;  /* Amber */
  --color-error: #ef4444;    /* Red */
  --color-info: #3b82f6;     /* Blue */

  /* Status Colors */
  --color-alpha: #eab308;    /* Yellow */
  --color-beta: #3b82f6;     /* Blue */
  --color-stable: #10b981;   /* Green */
}
```

### Typography

```css
:root {
  /* Font Families */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
  --text-5xl: 3rem;      /* 48px */

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### Spacing Scale

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
}
```

### Border Radius

```css
:root {
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.375rem;  /* 6px */
  --radius-lg: 0.5rem;    /* 8px */
  --radius-xl: 0.75rem;   /* 12px */
  --radius-2xl: 1rem;     /* 16px */
  --radius-full: 9999px;
}
```

### Shadows

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  --shadow-glow: 0 0 20px rgb(6 182 212 / 0.3);  /* Cyan glow */
}
```

---

## Page Layouts

### Homepage Layout

```
+------------------------------------------------------------------+
|                           HEADER                                  |
|  [Logo]                    [Playground] [Learn] [API] [GitHub]   |
+------------------------------------------------------------------+
|                                                                   |
|                         HERO SECTION                              |
|     +-------------------------------------------------------+    |
|     |                                                       |    |
|     |     Neural-Coding                                     |    |
|     |     Computational Neuroscience for Developers         |    |
|     |                                                       |    |
|     |     [Explore Tools]  [Read Articles]                  |    |
|     |                                                       |    |
|     |     (Animated neuron network background)              |    |
|     +-------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|                       TOOLS SECTION                               |
|     +-------------+  +-------------+  +-------------+            |
|     | LIF         |  | Synaptic    |  | Code        |            |
|     | Explorer    |  | Weights     |  | Transpiler  |            |
|     | [alpha]     |  | [alpha]     |  | [alpha]     |            |
|     +-------------+  +-------------+  +-------------+            |
|                                                                   |
|     +-------------+                                               |
|     | NWB         |                                               |
|     | Formatter   |                                               |
|     | [alpha]     |                                               |
|     +-------------+                                               |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|                     LATEST ARTICLES                               |
|     +------------------+  +------------------+                    |
|     | [Cover Image]    |  | [Cover Image]    |                   |
|     | Article Title    |  | Article Title    |                   |
|     | One-liner...     |  | One-liner...     |                   |
|     | [tag] [tag]      |  | [tag] [tag]      |                   |
|     +------------------+  +------------------+                    |
|                                                                   |
|                    [View All Articles ->]                         |
|                                                                   |
+------------------------------------------------------------------+
|                           FOOTER                                  |
|  Neural-Coding (c) 2026    [GitHub] [Twitter]    [RSS]           |
+------------------------------------------------------------------+
```

### Article Page Layout

```
+------------------------------------------------------------------+
|                           HEADER                                  |
+------------------------------------------------------------------+
|                                                                   |
|  Breadcrumb: Home > Learn > {Category} > {Title}                 |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                      COVER IMAGE                           |  |
|  |                      (16:9 ratio)                          |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  # Article Title                                                  |
|                                                                   |
|  {One-liner summary}                                              |
|                                                                   |
|  Published: {date}  |  Updated: {date}  |  {read time} min       |
|                                                                   |
|  [tag] [tag] [tag]                                                |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------------+  +-----------------------------+     |
|  |                        |  |                             |     |
|  |    ARTICLE CONTENT     |  |    TABLE OF CONTENTS        |     |
|  |                        |  |    (sticky sidebar)         |     |
|  |    ## Section 1        |  |                             |     |
|  |    ...                 |  |    - Section 1              |     |
|  |                        |  |    - Section 2              |     |
|  |    ## Section 2        |  |    - Section 3              |     |
|  |    ...                 |  |                             |     |
|  |                        |  |    ---                      |     |
|  |    ```python           |  |    Related Tools:           |     |
|  |    # code              |  |    [LIF Explorer]           |     |
|  |    ```                 |  |                             |     |
|  |                        |  +-----------------------------+     |
|  |    ## Section 3        |                                      |
|  |    ...                 |                                      |
|  |                        |                                      |
|  +------------------------+                                      |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|                     RELATED ARTICLES                              |
|     +------------------+  +------------------+                    |
|     | [Cover]          |  | [Cover]          |                   |
|     | Related Title 1  |  | Related Title 2  |                   |
|     +------------------+  +------------------+                    |
|                                                                   |
+------------------------------------------------------------------+
|                           FOOTER                                  |
+------------------------------------------------------------------+
```

### Playground Page Layout

```
+------------------------------------------------------------------+
|                           HEADER                                  |
+------------------------------------------------------------------+
|                                                                   |
|  # Interactive Tools                                              |
|                                                                   |
|  Explore computational neuroscience concepts through              |
|  interactive simulations and visualizations.                      |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------+  +-------------+  +-------------+  +----------+ |
|  |             |  |             |  |             |  |          | |
|  |   [icon]    |  |   [icon]    |  |   [icon]    |  |  [icon]  | |
|  |             |  |             |  |             |  |          | |
|  | LIF         |  | Synaptic    |  | Neural Code |  | Neuro    | |
|  | Explorer    |  | Weight      |  | Transpiler  |  | Data     | |
|  |             |  | Visualizer  |  |             |  | Formatter| |
|  | Interactive |  | Hebbian     |  | Python to   |  | CSV to   | |
|  | LIF neuron  |  | learning    |  | Brian2/     |  | NWB      | |
|  | simulator   |  | weights     |  | Norse       |  | format   | |
|  |             |  |             |  |             |  |          | |
|  | [alpha]     |  | [alpha]     |  | [alpha]     |  | [alpha]  | |
|  |             |  |             |  |             |  |          | |
|  | [Launch ->] |  | [Launch ->] |  | [Launch ->] |  | [Launch] | |
|  +-------------+  +-------------+  +-------------+  +----------+ |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  ## How to Use                                                    |
|                                                                   |
|  1. Select a tool above to open it in a new tab                  |
|  2. Adjust parameters using the interactive controls             |
|  3. View real-time visualizations of the results                 |
|  4. Export your configurations or results as needed              |
|                                                                   |
+------------------------------------------------------------------+
|                           FOOTER                                  |
+------------------------------------------------------------------+
```

---

## LIF-Explorer Detailed Specification

### Interface Layout

```
+------------------------------------------------------------------+
|  LIF-Explorer (Leaky Integrate-and-Fire)                    [?]  |
|  Interactive LIF neuron model: integrate -> threshold -> reset   |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------+  +------------------------------------+   |
|  |    PARAMETERS     |  |           OUTPUT                   |   |
|  |                   |  |                                    |   |
|  | tau (ms)          |  |  +------------------------------+  |   |
|  | [====|====] 20.0  |  |  |                              |  |   |
|  |                   |  |  |    MEMBRANE POTENTIAL        |  |   |
|  | dt (ms)           |  |  |         (V vs t)             |  |   |
|  | [=|=======] 0.1   |  |  |                              |  |   |
|  |                   |  |  |  V |    /\    /\    /\       |  |   |
|  | T (ms)            |  |  |    |   /  \  /  \  /  \      |  |   |
|  | [====|====] 400   |  |  |  --|--/----\/----\/----\--   |  |   |
|  |                   |  |  |    | /                  \    |  |   |
|  | V_rest            |  |  |    |/                    \   |  |   |
|  | [====|====] 0.0   |  |  |    +---------------------->  |  |   |
|  |                   |  |  |              time (ms)       |  |   |
|  | V_reset           |  |  +------------------------------+  |   |
|  | [====|====] 0.0   |  |                                    |   |
|  |                   |  |  Spike count: 12                   |   |
|  | V_th              |  |                                    |   |
|  | [====|====] 1.0   |  |  +------------------------------+  |   |
|  |                   |  |  |                              |  |   |
|  | I (DC)            |  |  |       SPIKE RASTER           |  |   |
|  | [====|====] 1.2   |  |  |                              |  |   |
|  |                   |  |  |  | | |  | | |  | | |  | |    |  |   |
|  | Noise (sigma)     |  |  |  +------------------------>  |  |   |
|  | [=|=======] 0.08  |  |  |              time (ms)       |  |   |
|  |                   |  |  +------------------------------+  |   |
|  | [Run Simulation]  |  |                                    |   |
|  |                   |  |  [Export JSON] [Export Brian2]     |   |
|  +-------------------+  +------------------------------------+   |
|                                                                   |
+------------------------------------------------------------------+
```

### Parameter Specifications

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| tau | float | 1.0 - 100.0 ms | 20.0 | Membrane time constant |
| dt | float | 0.05 - 2.0 ms | 0.1 | Simulation timestep |
| T | float | 50.0 - 2000.0 ms | 400.0 | Total simulation time |
| V_rest | float | -1.0 - 1.0 | 0.0 | Resting membrane potential |
| V_reset | float | -1.0 - 1.0 | 0.0 | Reset potential after spike |
| V_th | float | -1.0 - 2.0 | 1.0 | Spike threshold |
| I_dc | float | -1.0 - 3.0 | 1.2 | DC input current |
| noise | float | 0.0 - 1.0 | 0.08 | Gaussian noise sigma |

### LIF Model Equations

```
Membrane dynamics:
  dV/dt = (1/tau) * (-(V - V_rest) + I_dc) + sigma * sqrt(dt) * N(0,1)

Spike condition:
  if V >= V_th:
    emit spike
    V = V_reset
```

### Export Formats

#### JSON Export

```json
{
  "model": "LIF",
  "version": "1.0",
  "parameters": {
    "tau_ms": 20.0,
    "dt_ms": 0.1,
    "T_ms": 400.0,
    "V_rest": 0.0,
    "V_reset": 0.0,
    "V_th": 1.0,
    "I_dc": 1.2,
    "noise_sigma": 0.08
  },
  "results": {
    "spike_count": 12,
    "spike_times_ms": [33.2, 66.4, 99.6, ...],
    "mean_isi_ms": 33.2,
    "firing_rate_hz": 30.1
  }
}
```

#### Brian2 Export

```python
from brian2 import *

# Parameters from LIF-Explorer
tau = 20.0*ms
V_rest = 0.0
V_reset = 0.0
V_th = 1.0
I_dc = 1.2
noise_sigma = 0.08

# Neuron model
eqs = '''
dV/dt = (-(V - V_rest) + I_dc) / tau + noise_sigma*xi*tau**-0.5 : 1
'''

G = NeuronGroup(1, eqs, threshold='V > V_th', reset='V = V_reset', method='euler')
G.V = V_rest

# Monitor
spikemon = SpikeMonitor(G)
statemon = StateMonitor(G, 'V', record=True)

# Run
run(400*ms)

# Plot
plot(statemon.t/ms, statemon.V[0])
xlabel('Time (ms)')
ylabel('V')
show()
```

---

## Neuron Animation Specification

### Canvas Animation Parameters

```typescript
interface NeuronAnimationConfig {
  // Node configuration
  nodeCount: number;           // Default: 50
  nodeRadius: number;          // Default: 3px
  nodeColor: string;           // Default: '#06b6d4' (cyan-500)

  // Connection configuration
  connectionDistance: number;  // Default: 150px
  connectionColor: string;     // Default: 'rgba(6, 182, 212, {opacity})'
  connectionWidth: number;     // Default: 1px

  // Movement configuration
  velocityRange: number;       // Default: 0.5 (pixels per frame)
  bounceOnEdge: boolean;       // Default: true

  // Visual effects
  fadeWithDistance: boolean;   // Default: true
  glowEffect: boolean;         // Default: false
}
```

### Animation Implementation

```typescript
// File: apps/web/src/components/NeuronAnimation.ts

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

class NeuronAnimation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nodes: Node[] = [];
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement, config: Partial<NeuronAnimationConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = { ...defaultConfig, ...config };
    this.initNodes();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private initNodes(): void {
    for (let i = 0; i < this.config.nodeCount; i++) {
      this.nodes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * this.config.velocityRange,
        vy: (Math.random() - 0.5) * this.config.velocityRange
      });
    }
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private update(): void {
    for (const node of this.nodes) {
      node.x += node.vx;
      node.y += node.vy;

      if (this.config.bounceOnEdge) {
        if (node.x < 0 || node.x > this.canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > this.canvas.height) node.vy *= -1;
      }
    }
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw connections
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[i].x - this.nodes[j].x;
        const dy = this.nodes[i].y - this.nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.config.connectionDistance) {
          const opacity = this.config.fadeWithDistance
            ? 1 - dist / this.config.connectionDistance
            : 1;

          this.ctx.beginPath();
          this.ctx.moveTo(this.nodes[i].x, this.nodes[i].y);
          this.ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
          this.ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
          this.ctx.lineWidth = this.config.connectionWidth;
          this.ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const node of this.nodes) {
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, this.config.nodeRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = this.config.nodeColor;
      this.ctx.fill();
    }
  }

  public start(): void {
    const animate = () => {
      this.update();
      this.draw();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
```

---

## Responsive Design

### Breakpoints

```css
/* Tailwind default breakpoints */
--breakpoint-sm: 640px;   /* Small devices */
--breakpoint-md: 768px;   /* Medium devices */
--breakpoint-lg: 1024px;  /* Large devices */
--breakpoint-xl: 1280px;  /* Extra large devices */
--breakpoint-2xl: 1536px; /* 2X large devices */
```

### Layout Adaptations

| Component | Mobile (<640px) | Tablet (640-1024px) | Desktop (>1024px) |
|-----------|-----------------|---------------------|-------------------|
| Header | Hamburger menu | Full nav | Full nav |
| Hero | Stack vertical | Stack vertical | Side by side |
| Tool cards | 1 column | 2 columns | 4 columns |
| Article cards | 1 column | 2 columns | 3 columns |
| Article content | Full width | Full width | Content + sidebar |
| LIF Explorer | Stack vertical | Stack vertical | Side by side |

### Mobile-First CSS

```css
/* Base (mobile) */
.tool-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* Tablet */
@media (min-width: 640px) {
  .tool-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .tool-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## Accessibility (WCAG 2.1 AA)

### Color Contrast Requirements

| Element | Foreground | Background | Contrast Ratio | Requirement |
|---------|------------|------------|----------------|-------------|
| Body text | #f3f4f6 | #030712 | 18.1:1 | 4.5:1 (AA) |
| Headings | #ffffff | #030712 | 21:1 | 4.5:1 (AA) |
| Links | #06b6d4 | #030712 | 8.2:1 | 4.5:1 (AA) |
| Muted text | #9ca3af | #030712 | 7.1:1 | 4.5:1 (AA) |
| Buttons | #030712 | #06b6d4 | 8.2:1 | 4.5:1 (AA) |

### Keyboard Navigation

```typescript
// All interactive elements must be keyboard accessible

// Focus styles
.focus-visible:focus {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

// Skip link
<a href="#main-content" class="sr-only focus:not-sr-only">
  Skip to main content
</a>

// Tab order
// 1. Skip link
// 2. Logo (home link)
// 3. Navigation items
// 4. Main content
// 5. Footer links
```

### ARIA Labels

```html
<!-- Navigation -->
<nav aria-label="Main navigation">
  <ul role="menubar">
    <li role="none">
      <a role="menuitem" href="/playground">Playground</a>
    </li>
  </ul>
</nav>

<!-- Tool cards -->
<article aria-labelledby="tool-lif-title">
  <h3 id="tool-lif-title">LIF Explorer</h3>
  <p>Interactive LIF neuron simulator</p>
  <span class="badge" aria-label="Status: alpha">alpha</span>
  <a href="..." aria-label="Launch LIF Explorer in new tab">Launch</a>
</article>

<!-- Article list -->
<section aria-labelledby="articles-heading">
  <h2 id="articles-heading">Latest Articles</h2>
  <ul role="list">
    <li role="listitem">...</li>
  </ul>
</section>

<!-- Code blocks -->
<pre role="region" aria-label="Python code example" tabindex="0">
  <code>...</code>
</pre>
```

### Screen Reader Considerations

```html
<!-- Announce dynamic content -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  Simulation complete. 12 spikes detected.
</div>

<!-- Describe charts -->
<figure>
  <canvas id="membrane-chart" aria-label="Membrane potential over time chart"></canvas>
  <figcaption>
    Membrane potential showing 12 spikes over 400ms simulation.
    Peak voltage: 1.0, reset voltage: 0.0.
  </figcaption>
</figure>

<!-- Form labels -->
<label for="tau-slider">
  Membrane time constant (tau)
  <span class="sr-only">in milliseconds, range 1 to 100</span>
</label>
<input
  type="range"
  id="tau-slider"
  min="1"
  max="100"
  value="20"
  aria-valuemin="1"
  aria-valuemax="100"
  aria-valuenow="20"
  aria-valuetext="20 milliseconds"
/>
```

### Motion Preferences

```css
/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .neuron-animation {
    display: none;
  }

  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Focus Management

```typescript
// Focus management for modals and dynamic content

function openModal(modalId: string) {
  const modal = document.getElementById(modalId);
  const firstFocusable = modal?.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  modal?.setAttribute('aria-hidden', 'false');
  firstFocusable?.focus();

  // Trap focus within modal
  modal?.addEventListener('keydown', trapFocus);
}

function trapFocus(e: KeyboardEvent) {
  if (e.key !== 'Tab') return;

  const focusableElements = modal.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (e.shiftKey && document.activeElement === firstElement) {
    e.preventDefault();
    lastElement.focus();
  } else if (!e.shiftKey && document.activeElement === lastElement) {
    e.preventDefault();
    firstElement.focus();
  }
}
```

---

## Component Checklist

### Before Launch

- [ ] All colors meet WCAG AA contrast requirements
- [ ] All interactive elements are keyboard accessible
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Skip link is present and functional
- [ ] Focus indicators are visible
- [ ] Reduced motion is respected
- [ ] Screen reader testing completed
- [ ] Mobile responsive testing completed
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari)
