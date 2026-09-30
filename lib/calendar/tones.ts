import type { ToneId } from "./types";

export interface Tone {
  id: ToneId;
  label: string;
  bg: string;
  border: string;
  text: string;
  solid: string;
}

/** The default "sky" tone is sampled from the Outlook mobile calendar the dispatchers know. */
export const TONES: Record<ToneId, Tone> = {
  sky: { id: "sky", label: "Égkék", bg: "#CBEEFA", border: "#54B9ED", text: "#265B74", solid: "#2E9BD6" },
  blue: { id: "blue", label: "Kék", bg: "#D6E4FA", border: "#4F84D9", text: "#1F3F78", solid: "#3B6FC9" },
  teal: { id: "teal", label: "Türkiz", bg: "#CDF0EA", border: "#2FB6A0", text: "#0F5C50", solid: "#1E9C88" },
  green: { id: "green", label: "Zöld", bg: "#DCF0CC", border: "#6BB43F", text: "#2F5B14", solid: "#4E9A26" },
  lime: { id: "lime", label: "Lime", bg: "#EAF3C2", border: "#A6C823", text: "#4D5D0B", solid: "#8AAA10" },
  rose: { id: "rose", label: "Piros", bg: "#FBD9DC", border: "#E5606D", text: "#7A1E28", solid: "#D13F4F" },
  orange: { id: "orange", label: "Narancs", bg: "#FDE4CC", border: "#F59A3C", text: "#7A4108", solid: "#E1801B" },
  purple: { id: "purple", label: "Lila", bg: "#E6DCF7", border: "#8E6BD1", text: "#46287F", solid: "#7550BC" },
  indigo: { id: "indigo", label: "Indigó", bg: "#DADDF7", border: "#5B6BD6", text: "#2A3577", solid: "#4756C2" },
  gray: { id: "gray", label: "Szürke", bg: "#E9E9E9", border: "#A3A3A3", text: "#525252", solid: "#7A7A7A" },
};

export const PARTNER_TONES: Record<string, ToneId> = {
  catl: "blue",
  ecopro: "teal",
  eccoino: "sky",
  vitesco: "rose",
  schaeffler: "green",
  krones: "indigo",
  enterair: "purple",
  tama: "lime",
  ni: "orange",
};

/** Outlook's all-day style: white card with a soft green outline. */
export const ALL_DAY_TONE = { border: "#D3E5B4", text: "#465E21", bg: "#FFFFFF" };

export const TONE_IDS = Object.keys(TONES) as ToneId[];
