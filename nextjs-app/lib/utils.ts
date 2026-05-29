import { clsx, type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return mergeTailwindConflicts(clsx(inputs))
}

const CONFLICT_PREFIXES = [
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'h',
  'w',
  'min-h',
  'min-w',
  'max-h',
  'max-w',
  'size',
  'rounded',
  'bg',
  'shadow',
  'opacity',
  'z',
  'gap',
  'gap-x',
  'gap-y',
  'items',
  'justify',
  'overflow-x',
  'overflow-y',
  'overflow',
  'cursor',
] as const;

const SORTED_CONFLICT_PREFIXES = [...CONFLICT_PREFIXES]
  .sort((a, b) => b.length - a.length);

function mergeTailwindConflicts(className: string): string {
  if (!className) return '';
  const output: Array<string | null> = [];
  const seen = new Map<string, number>();

  for (const token of className.split(/\s+/).filter(Boolean)) {
    const group = conflictGroup(token);
    if (group) {
      const previous = seen.get(group);
      if (previous !== undefined) output[previous] = null;
      seen.set(group, output.length);
    }
    output.push(token);
  }

  return output.filter((token): token is string => token !== null).join(' ');
}

function conflictGroup(token: string): string | null {
  const important = token.startsWith('!') ? '!' : '';
  const bare = important ? token.slice(1) : token;
  const parts = bare.split(':');
  const utility = parts.pop();
  if (!utility) return null;
  const variants = parts.join(':');
  const normalizedUtility = utility.startsWith('-') ? utility.slice(1) : utility;

  for (const prefix of SORTED_CONFLICT_PREFIXES) {
    if (normalizedUtility === prefix || normalizedUtility.startsWith(`${prefix}-`)) {
      return `${important}${variants}:${prefix}`;
    }
  }

  return null;
}
