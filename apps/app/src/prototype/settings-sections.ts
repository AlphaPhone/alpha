/** Dependency-free: agent navigation reads this without loading Settings. */
/** Sections another surface may open directly (alpha:settings-page, agent navigation), with the category whose page
 * Back returns to. Developer, password and credential pages are never addressable this way. */
const SETTINGS_SECTIONS: Record<string, string | null> = {
  display: 'settings-general', sound: 'settings-general', notifications: 'settings-general', battery: 'settings-general', 'settings-general': 'settings-general',
  privacy: 'settings-privacy', 'settings-permissions': 'settings-privacy', 'settings-privacy': 'settings-privacy',
  'settings-account': 'settings-account',
  'settings-apps': 'settings-apps', calendar: 'settings-apps', 'app-settings-workflows': 'settings-apps', 'app-settings-inbox': 'settings-apps',
  about: null,
};
/** The view-state patch that opens a section, or null for anything outside the allowlist. */
export function settingsSectionPatch(section: unknown): { page: string; settingsCategory: string | null } | null {
  return typeof section === 'string' && Object.hasOwn(SETTINGS_SECTIONS, section) ? { page: section, settingsCategory: SETTINGS_SECTIONS[section] } : null;
}
