import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

interface Slide {
  type: "diagram" | "code" | "text" | "title"
  content: string
  duration: number
  title?: string
}

interface VideoResult {
  success: boolean
  filePath?: string
  htmlPath?: string
  error?: string
}

export async function generateVideo(params: {
  slides: Slide[]
  title: string
  outputDir: string
}): Promise<VideoResult> {
  const { slides, title, outputDir } = params

  try {
    await mkdir(outputDir, { recursive: true })

    // Generate an HTML slideshow as the primary output
    const html = generateSlideshowHTML(slides, title)
    const htmlFilename = `slideshow-${Date.now()}.html`
    const htmlPath = join(outputDir, htmlFilename)
    await writeFile(htmlPath, html)

    return {
      success: true,
      htmlPath,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Video generation failed",
    }
  }
}

function generateSlideshowHTML(slides: Slide[], title: string): string {
  const slideHTML = slides.map((slide, i) => {
    const duration = slide.duration * 1000

    let content = ""
    switch (slide.type) {
      case "title":
        content = `
          <div class="slide-content title-slide">
            <h1>${escapeHTML(slide.title ?? title)}</h1>
            <p>${escapeHTML(slide.content)}</p>
          </div>`
        break
      case "code":
        content = `
          <div class="slide-content code-slide">
            ${slide.title ? `<h2>${escapeHTML(slide.title)}</h2>` : ""}
            <pre><code>${escapeHTML(slide.content)}</code></pre>
          </div>`
        break
      case "diagram":
        content = `
          <div class="slide-content diagram-slide">
            ${slide.title ? `<h2>${escapeHTML(slide.title)}</h2>` : ""}
            <div class="mermaid">${escapeHTML(slide.content)}</div>
          </div>`
        break
      case "text":
      default:
        content = `
          <div class="slide-content text-slide">
            ${slide.title ? `<h2>${escapeHTML(slide.title)}</h2>` : ""}
            <p>${escapeHTML(slide.content)}</p>
          </div>`
    }

    return `<div class="slide" id="slide-${i}" style="display:${i === 0 ? "flex" : "none"}" data-duration="${duration}">${content}</div>`
  }).join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #fafafa; }
    .slideshow { width: 100vw; height: 100vh; position: relative; }
    .slide { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 60px; }
    .slide-content { max-width: 800px; text-align: center; }
    h1 { font-size: 3rem; margin-bottom: 1rem; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h2 { font-size: 2rem; margin-bottom: 1rem; color: #e5e7eb; }
    p { font-size: 1.25rem; line-height: 1.8; color: #9ca3af; }
    pre { background: #1f2937; border-radius: 12px; padding: 24px; text-align: left; overflow-x: auto; font-size: 0.9rem; line-height: 1.6; }
    code { color: #e5e7eb; font-family: 'JetBrains Mono', 'Fira Code', monospace; }
    .mermaid { background: #111827; border-radius: 12px; padding: 24px; }
    .progress { position: fixed; bottom: 0; left: 0; height: 3px; background: #6366f1; transition: width linear; }
    .controls { position: fixed; bottom: 20px; right: 20px; display: flex; gap: 8px; }
    .controls button { background: #1f2937; border: 1px solid #374151; color: #9ca3af; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.875rem; }
    .controls button:hover { background: #374151; color: #fff; }
    .counter { position: fixed; top: 20px; right: 20px; color: #6b7280; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="slideshow">${slideHTML}</div>
  <div class="progress" id="progress"></div>
  <div class="counter" id="counter">1 / ${slides.length}</div>
  <div class="controls">
    <button onclick="prev()">Previous</button>
    <button onclick="togglePause()" id="pauseBtn">Pause</button>
    <button onclick="next()">Next</button>
  </div>
  <script>
    mermaid.initialize({ theme: 'dark', startOnLoad: true });
    let current = 0, paused = false, timer = null;
    const slides = document.querySelectorAll('.slide');
    const progress = document.getElementById('progress');
    const counter = document.getElementById('counter');

    function showSlide(n) {
      slides.forEach(s => s.style.display = 'none');
      slides[n].style.display = 'flex';
      counter.textContent = (n + 1) + ' / ' + slides.length;
      progress.style.width = ((n + 1) / slides.length * 100) + '%';
    }

    function next() {
      current = (current + 1) % slides.length;
      showSlide(current);
      scheduleNext();
    }

    function prev() {
      current = (current - 1 + slides.length) % slides.length;
      showSlide(current);
      scheduleNext();
    }

    function togglePause() {
      paused = !paused;
      document.getElementById('pauseBtn').textContent = paused ? 'Play' : 'Pause';
      if (!paused) scheduleNext();
    }

    function scheduleNext() {
      if (timer) clearTimeout(timer);
      if (!paused) {
        const duration = parseInt(slides[current].dataset.duration) || 5000;
        timer = setTimeout(next, duration);
      }
    }

    scheduleNext();
  </script>
</body>
</html>`
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
