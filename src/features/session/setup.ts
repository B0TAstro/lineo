import { DEFAULT_FORM, type SetupForm } from '@/sports/tennis';

/** The setup travels to the match screen as a route parameter. */
export const encodeForm = (form: SetupForm) => JSON.stringify(form);

/**
 * A setup that came from somewhere else (a route, a host): what it leaves out takes its default.
 * A host on an older build sends no court, say.
 */
export const completeForm = (form: Partial<SetupForm>): SetupForm => ({ ...DEFAULT_FORM, ...form });

export function decodeForm(raw: string | undefined): SetupForm {
  if (raw == null) return DEFAULT_FORM;
  try {
    return completeForm(JSON.parse(raw) as Partial<SetupForm>);
  } catch {
    return DEFAULT_FORM;
  }
}
