# Workflows

Workflows is where the owner sees and steers what the agent does on its own: reviewed phone
workflows with bounded steps, the agent's saved prompts and scheduled items, reminders, routines and
goals, and the scheduled digests whose briefs the agent keeps on the phone. The agent runs on the
phone, so every schedule runs only while the phone and the agent are on; an occurrence that passed
while either was off is recorded as missed and never runs late (PRD AP-04, AP-07, AP-11, P-75).

Every change the owner asks for is reviewed first, kept on the phone until the agent's receipt
proves what happened, and never sent twice; every run is of the exact version reviewed; every
notice opens the exact run or result it names, and only for the account it belongs to. The agent's
`@elizaos/plugin-workflow`, its triggers and scheduled tasks own the definitions, the runs and the
receipts; these specs state what Alpha shows, sends and keeps.

- [Place](./place.md): where the owner is inside Workflows, what Back closes, and the run view's generation.
- [Vocabulary](./vocabulary.md): how runs, occurrences and rows read, committed receipts, and the routes Workflows sends.
- [Automations list](./automations.md): every source in one list, and the one change held per owner.
- [Prompts and scheduled items](./agentSchedules.md): saving, switching and running prompts; answering scheduled items.
- [Runs](./runs.md): the open workflow, its history, the exact run shown, and one reviewed run request.
- [Remove, restore and rename](./lifecycle.md): definition changes kept until their receipt.
- [Typed drafts](./authoring.md): describing, reviewing and saving a phone workflow once, and the draft the previous version kept.
- [Phone steps](./deviceSteps.md): approving a phone step exactly as reviewed.
- [Approval notices](./notices.md): one notice per waiting step, for the current owner only.
- [Scheduling](./scheduling.md): powered-on schedules, the missed window, typed triggers, wakeups and the staged worker.
- [Resident scheduling service](./resident.md): starting the agent again after a reboot so schedules keep running.
- [Scheduled digests](./digests.md): the digest panel, its reads, its kept change and the brief on Home.
- [Digest sources](./digestSources.md): Cloud read grants, the phone's consent and Google selections.
- [Digest inbox](./digestInbox.md): one result sync at a time per scope.
- [Hosted result notices](./hostedResults.md): result notices, taps, questions and background delivery.
- [Clock draft](./clockDraft.md): an alarm a workflow suggests, handed to Clock.
- [Request recovery](./recovery.md): backing up or resetting saved requests in the browser build.
- [Simulator](./simulator.md): simulated workflows in the browser build, with test mocks only.
- [Simulated triggers](./simulatedTriggers.md): the browser build's place and message trigger checks, their cursors and queue.
