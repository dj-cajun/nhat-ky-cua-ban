import type { HintData } from '@/types';
import { HEIGHT_RANGES } from '@/config/hint-options';
import { vi } from '@/i18n/vi';

interface HintFormProps {
  value: HintData;
  onChange: (next: HintData) => void;
}

export function HintForm({ value, onChange }: HintFormProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-slate-500">{vi.onboarding.hintEncrypted}</p>

      <fieldset>
        <legend className="mb-2 block text-xs font-bold">{vi.onboarding.gender}</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['female', vi.onboarding.female],
              ['male', vi.onboarding.male],
              ['other', vi.onboarding.other],
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
        <span className="mb-2 block font-bold">{vi.onboarding.height}</span>
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
        <legend className="mb-2 block text-xs font-bold">{vi.onboarding.mbti}</legend>
        <div className="flex gap-4">
          {(
            [
              ['E', vi.onboarding.extrovert],
              ['I', vi.onboarding.introvert],
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
        <span className="mb-2 block font-bold">{vi.onboarding.commute}</span>
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
          <option value="motorbike">{vi.onboarding.motorbike}</option>
          <option value="bicycle">{vi.onboarding.bicycle}</option>
          <option value="walk">{vi.onboarding.walk}</option>
          <option value="bus">{vi.onboarding.bus}</option>
        </select>
      </label>
    </div>
  );
}
