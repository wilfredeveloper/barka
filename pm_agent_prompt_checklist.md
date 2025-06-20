# ✅ AI Project Manager Agent - Prompt Testing Checklist (MVP)

This checklist helps validate that your AI PM agent MVP can coordinate tasks, team members, and clients to successfully deliver projects.

For each point, **use the prompts provided** to test your agent's reasoning, tool use, and output quality. Manually assess:
- If the task is **clearly understood**
- If the agent gives a **sensible response**
- If the response **triggers or uses the correct MCP tool**

---

## 🔍 1. Project Understanding & Breakdown
**Goal:** Can the agent gather information and create a clear plan?

### Prompts to Try:
- "Start a new project called 'Website Redesign' for Acme Corp. Deadline in 3 weeks."
- "Break this project into phases."
- "List the deliverables for the backend API."
- "What info do you still need from me to begin planning?"
- "Summarize the project plan so far."

### Evaluation:
- [ ] Does the agent ask for missing info (e.g., start date, budget)?
- [ ] Does it generate a logical structure or breakdown?
- [ ] Does it create the project via tool call?

---

## 📋 2. Task Planning & Assignment
**Goal:** Can the agent create tasks and assign them to the right team members?

### Prompts to Try:
- "Create 5 tasks for the UI design phase."
- "Assign the login page task to Jane."
- "Who on the team is best suited for the database schema task?"
- "Reassign the task 'Integrate Stripe' to Peter."
- "List all tasks for the project 'Mobile App MVP'."

### Evaluation:
- [ ] Does it create tasks with appropriate fields?
- [ ] Does it suggest assignments based on skills?
- [ ] Does it confirm assignments clearly?

---

## 👥 3. Team Coordination & Awareness
**Goal:** Can the agent track team skills and availability?

### Prompts to Try:
- "Who is available this week?"
- "List all team members who can work with React Native."
- "How many tasks is John currently handling?"
- "Suggest a designer for the new client onboarding project."

### Evaluation:
- [ ] Does it pull from skill/availability data?
- [ ] Are the suggestions contextual (based on workload)?

---

## 📆 4. Timeline & Milestone Tracking
**Goal:** Can the agent manage deadlines and schedules?

### Prompts to Try:
- "Create a milestone for 'Beta Launch' on July 10."
- "What tasks are overdue?"
- "Is the project on track?"
- "Which tasks are due this week?"
- "Suggest how to adjust the schedule to meet the launch date."

### Evaluation:
- [ ] Does it calculate due dates against today?
- [ ] Can it detect timeline risks?
- [ ] Does it propose rescheduling tasks or reassignments?

---

## 📊 5. Progress Reporting & Risk Alerts
**Goal:** Can the agent identify and report project health?

### Prompts to Try:
- "Give me a progress report for the 'Client Portal' project."
- "Which team member is falling behind?"
- "How many tasks are still not started?"
- "What’s blocking the QA phase?"
- "Summarize project risks or delays."

### Evaluation:
- [ ] Does it use analytics tool calls?
- [ ] Does it surface blockers or lagging areas?
- [ ] Can it estimate completion percentage?

---

## 📬 6. Client & Stakeholder Communication
**Goal:** Can the agent generate and manage communication?

### Prompts to Try:
- "Draft a status update for the client."
- "Has the client reviewed the design files?"
- "Send a follow-up to the client about the requirements document."
- "Prepare a weekly summary report for stakeholders."
- "What feedback have we received from the client?"

### Evaluation:
- [ ] Does it write clear, client-friendly messages?
- [ ] Does it track feedback data (if stored)?
- [ ] Does it recognize gaps in client response?

---

## 🔎 7. Search, Find, and Navigate
**Goal:** Can the agent retrieve and present relevant info fast?

### Prompts to Try:
- "Find all tasks related to 'authentication'."
- "Search for team members with 'Django' skills."
- "List all active projects for Acme Corp."
- "Show all tasks assigned to Jane this sprint."
- "Get the last 5 comments on Project X."

### Evaluation:
- [ ] Are search results relevant and correctly scoped?
- [ ] Does the agent clarify or ask if needed?

---

## ✅ Usage Tips
- Run these prompts incrementally during dev.
- Mark success/failure & edge case results.
- Use varied phrasings (not just exact words).
- Include partial data inputs to test auto-completion.

---

**Last Updated:** 2025-06-17

