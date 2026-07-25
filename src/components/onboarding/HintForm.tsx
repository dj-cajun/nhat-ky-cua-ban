import type { HintData } from '@/types';
import { HEIGHT_RANGES } from '@/config/hint-options';
import { useMessages } from '@/i18n';

interface HintFormProps {
  value: HintData;
  onChange: (next: HintData) => void;
}

export function HintForm({ value, onChange }: HintFormProps) {
  const t = useMessages();
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-slate-500">{t.onboarding.hintEncrypted}</p>

      <fieldset>
        <legend className="mb-2 block text-xs font-bold">{t.onboarding.gender}</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['female', t.onboarding.female],
              ['male', t.onboarding.male],
              ['other', t.onboarding.other],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1 text-xs">
              <input
                type="radio"
                name="hint-gender"
                checked={value.gender === key}
                onChange={() => onChange({ ...value, gender: key })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-xs">
        <span className="mb-2 block font-bold">{t.onboarding.height}</span>
        <select
          value={value.heightRange}
          onChange={(e) => onChange({ ...value, heightRange: e.target.value })}
          className="diary-border w-full rounded px-3 py-2 text-sm"
        >
          {HEIGHT_RANGES.map((range) => (
            <option key={range} value={range}>
              {range.replace('-', '–')} cm
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="mb-2 block text-xs font-bold">{t.onboarding.mbti}</legend>
        <div className="flex gap-4">
          {(
            [
              ['E', t.onboarding.extrovert],
              ['I', t.onboarding.introvert],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1 text-xs">
              <input
                type="radio"
                name="hint-mbti"
                checked={value.mbtiPrefix === key}
                onChange={() => onChange({ ...value, mbtiPrefix: key })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-xs">
        <span className="mb-2 block font-bold">{t.onboarding.commute}</span>
        <select
          value={value.commute}
          onChange={(e) =>
            onChange({
              ...value,
              commute: e.target.value as HintData['commute'],
            })
          }
          className="diary-border w-full rounded px-3 py-2 text-sm"
        >
          <option value="motorbike">{t.onboarding.motorbike}</option>
          <option value="bicycle">{t.onboarding.bicycle}</option>
          <option value="walk">{t.onboarding.walk}</option>
          <option value="bus">{t.onboarding.bus}</option>
        </select>
      </label>
    </div>
  );
}
