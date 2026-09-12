export function deviceIcon(deviceName: string): string {
  const name = deviceName.toLowerCase();
  if (name.includes("tv")) return "📺";
  if (name.includes("android") || name.includes("ios") || name.includes("iphone")) return "📱";
  return "🖥";
}
