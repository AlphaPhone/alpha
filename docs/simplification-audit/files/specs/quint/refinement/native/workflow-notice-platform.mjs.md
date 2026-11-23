# specs/quint/refinement/native/workflow-notice-platform.mjs
- Lines: 213 | Kind: refinement fixture; **slices upstream and product text** (T10) | Verdict: PORT (product part now; upstream part D14 follow-up)
- Covers: synthetic `AlphaNotificationsPlugin` = upstream bridge methods + Alpha config overrides, plus notification manager/PendingIntent/Intent/Context stubs. Callers/importers: `workflow-notice-delivery.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-14,27-31 | T10 (upstream) | Cuts upstream `NotificationsHostPlugin.java` from `' @PluginMethod public void postWorkflow('` to `' private static String identity('`, plus regex one-liners `^ protected interface NoticeWork [^\n]+` and `^ protected [^\n]+ (noticeWork|requireNoticeForeground|poster|delivery|coordinator)\([^\n]+`. | Upstream follow-up: move workflow posting (`postWorkflow`, `workflowReceipt`) into a Capacitor-free class (e.g. `WorkflowNoticeEntry`) that the host plugin delegates to; compile it whole. | M |
| 2 | 15,43 | T10 (product) | Regex one-liners `^ @Override protected [^\n]+ (noticeStorage|deliveryConfig|routesConfig|routes|posterConfig)\([^\n]+` over `AlphaNotificationsPlugin.java` — requires each override to stay on one line (breaks if Java is reformatted where touched, D9). | Product: move the five overrides' bodies into a plain `AlphaNoticeConfig` (package-private factory methods); the plugin overrides delegate. Harness compiles `AlphaNoticeConfig.java` whole. | M |
| 3 | 46-211 | C5 | Generic stubs duplicated across platforms. | Shared support stubs. | M |
| 4 | 104-106 | – | `SystemClock.elapsedRealtime` advances 2 s per call to satisfy the active-list wait without sleeping: good (no T8 sleep). | Keep. | – |

## Proposed end state
Stubs + one synthetic host shell calling the compiled `AlphaNoticeConfig` and (after upstream) `WorkflowNoticeEntry`;
no regex member extraction.
