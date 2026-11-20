/// Settings navigation as the product build ships it (settings-adapter.ts): the four category
/// rows on the Settings root, the pages each category opens, Back through the category the owner
/// came from (settingsCategory, categoryNames, settingsParents, then the reference page Back), and
/// sections another surface may open directly (settingsSectionPatch, SETTINGS_SECTIONS). Developer,
/// character and password pages are never opened from outside Settings, retired reference pages are
/// never drawn (liveSettingsPage), and the password vault is unlocked only while a password page is shown.
module SettingsNavigation {
  type State = {
    // Settings' view state: the page ("" for none) and the category a page was opened from ("" for none).
    page: str, category: str,
    // Settings is the view on screen; Back from the root leaves it.
    open: bool,
    // The page the owner sees, as the adapter resolves it.
    shown: str,
    // The password vault holds unlocked entries (passwordManagerHoldsEntries).
    unlocked: bool,
    // How the last step arrived: "init", "row", "child", "section", "back", "refused", "unlock" or "restored".
    via: str
  }
  var s: State

  /// categoryNames: pages that draw a category index. "settings-help" is About's key; its row opens "about".
  pure val CATEGORY_KEYS = Set("settings-account", "settings-general", "settings-privacy", "settings-help", "settings-apps")
  /// The rows on the Settings root (Account opens the account sheet instead).
  pure val ROOT_ROWS = Set("settings-general", "settings-privacy", "settings-apps", "settings-help")
  /// settingsParents: Back from these pages opens the named page.
  pure val PARENTS = Map(
    "agent-activity" -> "about", "problems" -> "developer", "licenses" -> "about",
    "password-entry" -> "password-provider", "settings-permissions" -> "settings-privacy",
    "license-detail" -> "licenses", "phone-info" -> "settings-general")
  /// SETTINGS_SECTIONS: what another surface may open, with the category Back returns to ("" for none).
  pure val SECTIONS = Map(
    "display" -> "settings-general", "sound" -> "settings-general", "notifications" -> "settings-general",
    "settings-general" -> "settings-general",
    "privacy" -> "settings-privacy", "settings-permissions" -> "settings-privacy", "settings-privacy" -> "settings-privacy",
    "settings-account" -> "settings-account",
    "settings-apps" -> "settings-apps", "calendar" -> "settings-apps",
    "app-settings-workflows" -> "settings-apps", "app-settings-inbox" -> "settings-apps",
    "about" -> "")
  /// Requests another surface can send, including ones the allowlist must refuse.
  pure val SECTION_REQUESTS = SECTIONS.keys().union(Set(
    "developer", "character", "password-provider", "password-entry", "agent-recovery-details", "problems", "wifi", "battery", "accounts"))
  /// Pages a shown page links to in the product build.
  pure val CHILDREN = Map(
    "settings-general" -> Set("display", "notifications"),
    "settings-privacy" -> Set("settings-permissions"),
    "settings-permissions" -> Set("notifications"),
    "settings-apps" -> Set("calendar", "password-provider", "app-settings-inbox", "app-settings-workflows"),
    "about" -> Set("agent-activity", "licenses"),
    "licenses" -> Set("license-detail"),
    "password-provider" -> Set("password-entry"))
  pure val CHILD_PAGES = CHILDREN.keys().map(key => CHILDREN.get(key)).flatten()
  /// Pages a product build never draws (settingsPage) or never lets another surface address.
  pure val DEVELOPER_PAGES = Set("developer", "character")
  pure val PASSWORD_PAGES = Set("password-provider", "password-entry")
  /// RETIRED_SETTINGS_PAGES: reference pages no row or surface opens; the live render draws none of them.
  pure val RETIRED_PAGES = Set("wifi", "bluetooth", "mobile", "battery", "accounts")

  /// The adapter's resolution: a category key draws its index; no page draws the remembered category's
  /// index, or the root; a developer page in a product build, or a retired page, draws the root.
  pure def resolve(page: str, category: str): str =
    if (CATEGORY_KEYS.contains(page)) page
    else if (page == "") (if (CATEGORY_KEYS.contains(category)) category else "root")
    else if (DEVELOPER_PAGES.union(RETIRED_PAGES).contains(page)) "root"
    else page
  /// Any move off the password pages, or out of Settings, locks the vault (leavePasswordManager);
  /// Back from an entry to the list keeps it unlocked (leavePasswordEntry only clears the form).
  pure def moved(st: State, page: str, category: str, open: bool, via: str): State =
    { ...st, page: page, category: category, open: open, via: via, shown: if (open) resolve(page, category) else "closed",
      unlocked: st.unlocked and open and PASSWORD_PAGES.contains(page) }

  action init = s' = { page: "", category: "", open: true, shown: "root", unlocked: false, via: "init" }

  /// A root row: About opens "about" with no category; the others open their category index.
  action openCategory(key: str): bool = all {
    s.open, s.shown == "root", ROOT_ROWS.contains(key),
    s' = if (key == "settings-help") moved(s, "about", "", true, "row") else moved(s, key, key, true, "row")
  }
  /// A row on the shown page opens one of its pages; the category stays as it was.
  action openChild(child: str): bool = all {
    s.open, CHILDREN.keys().contains(s.shown), CHILDREN.get(s.shown).contains(child),
    s' = moved(s, child, s.category, true, "child")
  }
  /// alpha:settings-page: an allowlisted section opens Settings at that page and category; anything
  /// else changes nothing.
  action openSection(section: str): bool = all {
    SECTION_REQUESTS.contains(section),
    s' = if (SECTIONS.keys().contains(section)) moved(s, section, SECTIONS.get(section), true, "section")
      else { ...s, via: "refused" }
  }
  /// Back: a category index or a remembered category returns to the root; a nested page to its parent;
  /// any other page to its category's index (the reference Back clears only the page); the root leaves.
  action back = all {
    s.open,
    s' = if (CATEGORY_KEYS.contains(s.page) or (s.page == "" and s.category != "")) moved(s, "", "", true, "back")
      else if (PARENTS.keys().contains(s.page)) moved(s, PARENTS.get(s.page), s.category, true, "back")
      else if (s.page != "") moved(s, "", s.category, true, "back")
      else moved(s, "", "", false, "back")
  }
  /// Unlock on the password list: the vault shows its entries until Settings leaves the password pages.
  action unlock = all {
    s.open, s.shown == "password-provider", not(s.unlocked),
    s' = { ...s, unlocked: true, via: "unlock" }
  }
  /// A stale or direct selection (a development jump) of a developer or retired page: Settings opens
  /// with that page and no category, as the jump resets the view first.
  action restore(page: str): bool = all {
    DEVELOPER_PAGES.union(RETIRED_PAGES).contains(page),
    s' = moved(s, page, "", true, "restored")
  }
  action step = {
    nondet key = ROOT_ROWS.oneOf()
    nondet child = CHILD_PAGES.oneOf()
    nondet section = SECTION_REQUESTS.oneOf()
    nondet stale = DEVELOPER_PAGES.union(RETIRED_PAGES).oneOf()
    any { openCategory(key), openChild(child), openSection(section), back, unlock, restore(stale), s' = s }
  }

  /// A product build never draws a developer page, whatever the view state holds.
  val NoDeveloperPage = not(DEVELOPER_PAGES.contains(s.shown))
  /// No retired reference page is ever drawn, whatever the view state holds.
  val NoRetiredPage = not(RETIRED_PAGES.contains(s.shown))
  /// The vault is unlocked only while Settings shows a password page.
  val UnlockedOnlyOnPasswordPages = s.unlocked implies (s.open and PASSWORD_PAGES.contains(s.page) and s.shown == s.page)
  /// Another surface opens only allowlisted sections: never a developer, password or recovery page.
  val SectionsAllowlisted = s.via == "section" implies (SECTIONS.keys().contains(s.page)
    and not(DEVELOPER_PAGES.union(PASSWORD_PAGES).contains(s.page)))
  /// Password pages are reached only through Settings' own pages and Back (a refused request or an
  /// unlock leaves them where they are).
  val PasswordOnlyFromSettings = PASSWORD_PAGES.contains(s.page) implies s.via.in(Set("child", "back", "refused", "unlock"))
  /// A category index is drawn only with its own category remembered, so Back from its pages returns to it.
  val CategoryMatchesIndex = (s.page != "settings-help" and CATEGORY_KEYS.contains(s.page)) implies s.category == s.page
  val CategoryKnown = s.category == "" or CATEGORY_KEYS.contains(s.category)
  val ShownResolved = s.shown == (if (s.open) resolve(s.page, s.category) else "closed")
  val safety = NoDeveloperPage and NoRetiredPage and SectionsAllowlisted and PasswordOnlyFromSettings
    and CategoryMatchesIndex and CategoryKnown and ShownResolved and UnlockedOnlyOnPasswordPages

  val PasswordEntryWitness = s.shown == "password-entry"
  val UnlockedEntryWitness = s.shown == "password-entry" and s.unlocked
  val SectionRefusedWitness = s.via == "refused" and s.open

  /// General › Display, then Back to General, Back to the root, Back out of Settings.
  run categoryBackTest = init.then(openCategory("settings-general")).expect(s.shown == "settings-general")
    .then(openChild("display")).expect(s.shown == "display" and s.category == "settings-general")
    .then(back).expect(s.shown == "settings-general" and s.page == "")
    .then(back).expect(s.shown == "root" and s.category == "")
    .then(back).expect(not(s.open) and safety)
  /// About › Licenses › details: Back walks the nested parents to About, then the root.
  run aboutNestedBackTest = init.then(openCategory("settings-help")).expect(s.shown == "about" and s.category == "")
    .then(openChild("licenses")).then(openChild("license-detail")).expect(s.shown == "license-detail")
    .then(back).expect(s.shown == "licenses")
    .then(back).expect(s.shown == "about")
    .then(back).expect(s.shown == "root" and safety)
  /// Privacy › Permissions › Notifications: Back returns to the Privacy index, then the root.
  run privacyPermissionsBackTest = init.then(openCategory("settings-privacy")).then(openChild("settings-permissions"))
    .then(openChild("notifications")).expect(s.shown == "notifications" and s.category == "settings-privacy")
    .then(back).expect(s.shown == "settings-privacy")
    .then(back).expect(s.shown == "root" and safety)
  /// Apps › Passwords › entry: Back to the provider list, then the Apps index.
  run passwordBackTest = init.then(openCategory("settings-apps")).then(openChild("password-provider"))
    .then(openChild("password-entry")).expect(PasswordEntryWitness)
    .then(back).expect(s.shown == "password-provider")
    .then(back).expect(s.shown == "settings-apps" and safety)
  /// Another surface opens Display inside General; Back goes to the General index.
  run sectionOpensInCategoryTest = init.then(back).expect(not(s.open))
    .then(openSection("display")).expect(s.open and s.shown == "display" and s.category == "settings-general")
    .then(back).expect(s.shown == "settings-general" and safety)
  /// Developer, password and unknown requests change nothing.
  run sectionRefusedTest = init.then(openCategory("settings-apps"))
    .then(openSection("developer")).expect(SectionRefusedWitness and s.shown == "settings-apps")
    .then(openSection("password-entry")).expect(s.shown == "settings-apps")
    .then(openSection("wifi")).expect(s.shown == "settings-apps" and safety)
    .then(openSection("battery")).expect(s.shown == "settings-apps" and s.via == "refused")
  /// Unlock the list, open an entry and Back to the list: still unlocked. Back to Apps locks it, and
  /// the list opens locked again.
  run passwordLockTest = init.then(openCategory("settings-apps")).then(openChild("password-provider"))
    .expect(not(s.unlocked))
    .then(unlock).expect(s.unlocked)
    .then(openChild("password-entry")).expect(UnlockedEntryWitness)
    .then(back).expect(s.shown == "password-provider" and s.unlocked)
    .then(back).expect(s.shown == "settings-apps" and not(s.unlocked))
    .then(openChild("password-provider")).expect(s.shown == "password-provider" and not(s.unlocked) and safety)
  /// Another surface opening a section while the vault is unlocked locks it.
  run sectionLocksVaultTest = init.then(openCategory("settings-apps")).then(openChild("password-provider"))
    .then(unlock).then(openSection("display")).expect(s.shown == "display" and not(s.unlocked) and safety)
  /// A retired page selected directly draws Settings; Back clears it and the next Back leaves.
  run retiredPageTest = init.then(restore("wifi")).expect(s.page == "wifi" and s.shown == "root")
    .then(back).expect(s.page == "" and s.shown == "root")
    .then(back).expect(not(s.open))
    .then(restore("accounts")).expect(s.open and s.shown == "root" and safety)
}
