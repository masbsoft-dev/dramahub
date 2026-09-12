/**
 * Device fingerprinting client-side (secao 2.1 da especificacao): combina
 * User-Agent + Canvas/WebGL rendering hash. So deve ser chamado no browser.
 */

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";
    canvas.width = 220;
    canvas.height = 30;
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("dramahub-fp", 2, 15);
    return canvas.toDataURL();
  } catch {
    return "canvas-error";
  }
}

function getWebglFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "no-webgl";
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "";
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "";
    return `${vendor}~${renderer}`;
  } catch {
    return "webgl-error";
  }
}

export async function getDeviceFingerprint(): Promise<string> {
  const raw = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    getCanvasFingerprint(),
    getWebglFingerprint(),
  ].join("::");
  return sha256Hex(raw);
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  const isTV = /SmartTV|Tizen|WebOS/i.test(ua);
  if (isTV) return "Smart TV";
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edg|OPR)\/([\d.]+)/);
  const browser = browserMatch ? browserMatch[1].replace("Edg", "Edge").replace("OPR", "Opera") : "Navegador";
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Mac OS/i.test(ua)
      ? "macOS"
      : /Android/i.test(ua)
        ? "Android"
        : /iPhone|iPad/i.test(ua)
          ? "iOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Desconhecido";
  return `${browser} · ${os}`;
}
