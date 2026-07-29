import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

/**
 * Password strength rules — all must pass for a strong password.
 */
const RULES = [
  { id: 'length',    label: 'At least 8 characters',         test: (pw) => pw.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A-Z)',     test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lowercase', label: 'One lowercase letter (a-z)',     test: (pw) => /[a-z]/.test(pw) },
  { id: 'number',    label: 'One number (0-9)',               test: (pw) => /\d/.test(pw) },
  { id: 'special',   label: 'One special character (!@#$...)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

/**
 * Evaluate password strength.
 * @returns {{ score: 0-5, label, color, passed: string[] }}
 */
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '', passed: [] };

  const passed = RULES.filter((r) => r.test(password)).map((r) => r.id);
  const score = passed.length;

  if (score <= 1) return { score, label: 'Very weak', color: 'bg-red-500', passed };
  if (score === 2) return { score, label: 'Weak', color: 'bg-orange-500', passed };
  if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-500', passed };
  if (score === 4) return { score, label: 'Strong', color: 'bg-green-400', passed };
  return { score, label: 'Very strong', color: 'bg-green-600', passed };
}

/** Returns true only if all rules pass. */
export function isStrongPassword(password) {
  return RULES.every((r) => r.test(password));
}

/**
 * Visual password strength indicator with checklist.
 * Shows a strength bar + individual rule status.
 */
export default function PasswordStrengthIndicator({ password }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (!password) return null;

  const labelColors = {
    'Very weak': 'text-red-600',
    'Weak': 'text-orange-600',
    'Fair': 'text-yellow-600',
    'Strong': 'text-green-500',
    'Very strong': 'text-green-700',
  };

  return (
    <div className="mt-2 space-y-2.5">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-300 ${
                i < strength.score ? strength.color : 'bg-transparent'
              }`}
            />
          ))}
        </div>
        <span className={`text-[11px] font-semibold whitespace-nowrap ${labelColors[strength.label] || 'text-text-secondary'}`}>
          {strength.label}
        </span>
      </div>

      {/* Rule checklist */}
      <ul className="grid grid-cols-1 gap-1">
        {RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.id} className="flex items-center gap-1.5 text-[12px]">
              {ok ? (
                <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-text-secondary/50 shrink-0" />
              )}
              <span className={ok ? 'text-green-700' : 'text-text-secondary'}>
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
