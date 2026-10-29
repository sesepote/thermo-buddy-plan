import { DEFAULT_INPUT } from "./protocol";
import { expectedRows, mixVolume, type ManualAnswer, type MasterMixSettings } from "./practice";

/** Translate old calculated solutions once into the same manual answers used by students. */
export function editableMix(source?: MasterMixSettings): MasterMixSettings {
  const mix = structuredClone(source ?? {
    input: { ...DEFAULT_INPUT, additives: { ...DEFAULT_INPUT.additives, extraMg: 1.5 } },
    options: {}, volume: 25, samples: 1,
  });
  const rows = expectedRows(mix);
  return { ...mix, manual: { rows, totals: Object.fromEntries(rows.map(r => [r.key, mix.manual?.totals?.[r.key] ?? mixVolume(r, mix.samples)])) } };
}

export function teacherAnswer(mix: MasterMixSettings): ManualAnswer {
  const rows = expectedRows(mix);
  return {
    single: Object.fromEntries(rows.map(r => [r.key, r.per])),
    tubes: mix.samples,
    mix: Object.fromEntries(rows.map(r => [r.key, mix.manual?.totals?.[r.key] ?? mixVolume(r, mix.samples)])),
  };
}

export function applyTeacherAnswer(mix: MasterMixSettings, answer: ManualAnswer): MasterMixSettings {
  return { ...mix, samples: answer.tubes ?? mix.samples, manual: {
    rows: expectedRows(mix).map(r => ({ ...r, per: answer.single[r.key] ?? 0 })),
    totals: Object.fromEntries(expectedRows(mix).map(r => [r.key, r.key === "template" ? 0 : answer.mix[r.key] ?? 0])),
  } };
}