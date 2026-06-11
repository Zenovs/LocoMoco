// Logische Icon-Schlüssel -> Emoji, pro Theme überschreibbar.
export type IconKey =
  | "productivity"
  | "nonBillable"
  | "overBudget"
  | "sleeping"
  | "coach"
  | "hoursCheck"
  | "compare"
  | "target"
  | "loading"
  | "sparkleA"
  | "sparkleB"
  | "sparkleC";

const DEFAULT: Record<IconKey, string> = {
  productivity: "💖",
  nonBillable: "🩷",
  overBudget: "🚨",
  sleeping: "😴",
  coach: "🧚‍♀️",
  hoursCheck: "⏱️",
  compare: "⚖️",
  target: "🎯",
  loading: "🍳",
  sparkleA: "✨",
  sparkleB: "💖",
  sparkleC: "🩷",
};

const THEME_ICONS: Record<string, Partial<Record<IconKey, string>>> = {
  pro: {
    productivity: "📈", nonBillable: "🧾", overBudget: "⚠️", sleeping: "💤",
    coach: "🧭", loading: "⏳", sparkleA: "•", sparkleB: "•", sparkleC: "•",
  },
  ocean: {
    productivity: "🐬", nonBillable: "🐠", overBudget: "🌊", sleeping: "🐚",
    coach: "🧜‍♀️", loading: "🌊", sparkleA: "💧", sparkleB: "🫧", sparkleC: "🐚",
  },
  lego: {
    productivity: "🟥", nonBillable: "🟦", overBudget: "🚧", sleeping: "🧱",
    coach: "🤖", hoursCheck: "🟨", loading: "🧱", sparkleA: "🟡", sparkleB: "🔵", sparkleC: "🟢",
  },
  starwars: {
    productivity: "⭐", nonBillable: "🛸", overBudget: "💥", sleeping: "🌙",
    coach: "🤖", hoursCheck: "⏳", compare: "⚔️", loading: "🌌",
    sparkleA: "✨", sparkleB: "⭐", sparkleC: "🌟",
  },
  unihockey: {
    productivity: "🏑", nonBillable: "🥅", overBudget: "🚩", coach: "📣",
    target: "🥅", loading: "🏑", sparkleA: "🏑", sparkleB: "🟠", sparkleC: "⚪",
  },
  darknerd: {
    productivity: "📊", nonBillable: "🪲", overBudget: "🔥", sleeping: "💤",
    coach: "🤖", hoursCheck: "⌨️", compare: "🆚", loading: "💻",
    sparkleA: "👾", sparkleB: "💻", sparkleC: "🟩",
  },
  ferien: {
    productivity: "☀️", nonBillable: "🍹", overBudget: "🌋", sleeping: "🌴",
    coach: "🏄", target: "🏝️", loading: "🏖️", sparkleA: "☀️", sparkleB: "🌴", sparkleC: "🐚",
  },
};

export function getIcon(theme: string, key: IconKey): string {
  return THEME_ICONS[theme]?.[key] ?? DEFAULT[key];
}
