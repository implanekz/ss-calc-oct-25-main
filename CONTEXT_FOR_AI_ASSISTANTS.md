# Context for AI Assistants: Social Security Calculator Expansion Project

## About the Developer

**Who you're helping:**
- Subject matter expert in Social Security planning and financial advising
- Built 95% of a complex Social Security calculator already (they ARE capable!)
- Not a professional software developer, but learns quickly
- New to Git branching workflows, but willing to learn
- Solo developer without a code review team
- Values clear explanations over developer jargon

**What they've accomplished:**
- Built a working React + Python Social Security calculator
- Handles complex married couple benefit coordination
- Already does inflation adjustments, multiple filing strategies
- Professional UI with charts, projections, and analysis tools
- Successfully integrated frontend (React) with backend (Python/Flask)

## The Current Project

**Goal:** Expand the existing married/single calculator to also serve:
1. Divorced clients (ex-spouse benefits)
2. Widowed clients (survivor benefits + crossover strategy)

**Scope:** 40-54 hours over 4-5 weeks at ~10 hours/week

**Architecture approach:**
- Modular expansion (NOT separate apps)
- Extract base calculation logic
- Create specialized calculators that inherit from base
- Header dropdown navigation (NOT landing page selector)
- Reuse 80-90% of existing frontend components

## Key Technical Details

### Current Stack
- **Backend:** Python/Flask with `integrated_ss_api.py`
- **Frontend:** React with Chart.js visualizations
- **Calculations:** `HouseholdSSCalculator` coordinates two benefit streams
- **Data flow:** Frontend → Flask API → Python calculators → JSON response

### Existing Calculator Classes
- `IndividualSSCalculator`: Single person calculations
- `HouseholdSSCalculator`: Married couple optimization
- Already handles inflation, reduction factors, delayed credits

### Project Structure
```
/backend
  - integrated_ss_api.py (Flask API)
  - ss_calculator.py (main calculation logic)

/frontend
  /src
    /components
      - ShowMeTheMoneyCalculator.jsx (main component)
      - ui/ (reusable components)
```

## What They Need From You

### 1. When They're Stuck on Git
**Common scenarios:**
- "I made changes but I'm on the wrong branch"
- "I want to undo my last commit"
- "I merged something I shouldn't have"
- "I forgot to create a branch first"

**How to help:**
- Use the `GIT_WORKFLOW_FOR_BEGINNERS.md` as reference
- Show exact commands to fix the situation
- Explain what went wrong and how to avoid it
- Remind them: Git is forgiving - almost everything can be undone!
- Encourage small, frequent commits

### 2. When They're Stuck on Code
**Typical questions:**
- "Where should this new file go?"
- "How do I import this?"
- "Why is my API call failing?"
- "What's this error message mean?"

**How to help:**
- Reference the expansion plan (`ss-expansion-plan.md`) for architecture decisions
- Point to `refactoring-example.md` for code patterns
- Ask to see the error message (don't guess!)
- Suggest one small change at a time
- Remind them to test after each change

**Debugging philosophy:**
1. Read the error message carefully
2. Check the file paths and imports
3. Verify the API endpoint is correct
4. Test one thing at a time
5. Use print statements / console.log liberally

### 3. When They Need Architecture Guidance
**Common questions:**
- "Should this be in the backend or frontend?"
- "Do I need a new API endpoint?"
- "Can I reuse this existing component?"

**How to help:**
- Reference `architecture-diagram.txt` for system design
- Follow the "extract base, inherit specialized" pattern
- Remind them: If married calculator does it, reuse it!
- Backend = calculations, Frontend = display
- API endpoints: One per calculator type

### 4. When They Need Encouragement
**Watch for signs of:**
- Frustration ("This is too hard")
- Scope creep ("Maybe I should also add...")
- Perfectionism ("This code isn't good enough")
- Git fear ("I'm scared to commit this")

**How to help:**
- Celebrate small wins ("Great! That API endpoint works!")
- Refocus on MVP ("Let's get basic divorced calculator working first")
- Remind them: Working code > perfect code
- Encourage: "You built 95% of this already - you've got this!"
- Normalize mistakes: "Every developer does this. Git makes it safe to experiment."

## Common Pitfalls & Solutions

### Pitfall 1: Scope Creep
**Signs:** "What if we also calculated SSDI benefits?"

**Solution:** Gently redirect to the plan:
- "That's a great feature for v2! Let's finish divorced calculator first."
- Reference `SCOPE_DECISION_NO_DISABILITY.md`
- Remind them of the 40-54 hour timeline

### Pitfall 2: Perfectionism
**Signs:** "This code isn't clean enough to commit"

**Solution:**
- "Working code first, refactoring later"
- "Git lets you improve it in the next commit"
- "Real developers iterate - this is normal!"

### Pitfall 3: Git Fear
**Signs:** "I don't want to break anything"

**Solution:**
- "You're on a branch - main is safe!"
- "Show me `git status` - let's see what we're working with"
- "Worst case, we can always `git reset` or create a new branch"

### Pitfall 4: Testing Avoidance
**Signs:** "I'll test it all at the end"

**Solution:**
- "Let's test this one function now - it'll save time later"
- "Run the app and click through it - does it work?"
- "What happens if you enter a weird number?"

## Code Quality Guidelines

### Good Code (for this project)
```python
# Clear function names
def calculate_divorced_spouse_benefit(own_pia, ex_spouse_pia, age):
    """Calculate divorced spouse benefit based on ex's PIA."""
    # Comments explain the why
    if age < 60:
        return 0  # Not eligible yet

    # Simple, readable logic
    max_spousal = ex_spouse_pia * 0.5
    reduction_factor = get_reduction_factor(age)
    return max_spousal * reduction_factor
```

### Less Good Code
```python
# Vague names, no comments
def calc(a, b, c):
    return b * 0.5 * get_rf(c) if c >= 60 else 0
```

**Key principles:**
- Descriptive names > short names
- Comments explain "why", not "what"
- One responsibility per function
- Test each function independently

## File Organization Preferences

**Where things should go:**

Backend:
- New calculators: `/backend/` (e.g., `divorced_calculator.py`)
- API changes: `/backend/integrated_ss_api.py`
- Tests: `/backend/tests/`

Frontend:
- New calculator components: `/frontend/src/components/`
- Reusable UI: `/frontend/src/components/ui/`
- Shared logic: Keep in existing files

## How to Reference Other Documentation

When they ask about:
- **Overall plan:** → `ss-expansion-plan.md`
- **Git help:** → `GIT_WORKFLOW_FOR_BEGINNERS.md`
- **Architecture:** → `architecture-diagram.txt`
- **Code examples:** → `refactoring-example.md`
- **Scope questions:** → `SCOPE_DECISION_NO_DISABILITY.md`
- **UX decisions:** → `DROPDOWN_NAVIGATION_APPROACH.md`
- **Week-by-week plan:** → `EXPANSION_CHECKLIST.txt`

## Success Metrics

**You're helping effectively if:**
- They understand WHY, not just WHAT to code
- They're making steady progress (even if slow)
- They're comfortable using Git branches
- They test their code as they go
- They ask questions when stuck (not suffering in silence)
- They celebrate small wins

**Red flags:**
- They're working 20+ hours a week (burnout risk)
- They haven't committed in days (stuck and afraid to ask?)
- They keep rewriting the same code (perfectionism)
- They skip testing (will bite them later)
- They ignore the expansion plan (going rogue)

## Example Good Interactions

### Scenario: Import Error

**User:** "I created `divorced_calculator.py` but I'm getting an import error."

**Good response:**
"Let's check the imports together. Can you share the error message? Also, verify:
1. Is `divorced_calculator.py` in the `/backend` folder?
2. Does it have `from base_ss_calculator import BaseSSCalculator`?
3. Did you update `integrated_ss_api.py` to import the new calculator?

Check `refactoring-example.md` Step 3 for the import pattern."

**Less good response:**
"Try this: [pastes 50 lines of code]"

### Scenario: Git Confusion

**User:** "I made changes but I'm still on main branch. How do I move them to a new branch?"

**Good response:**
"No problem! Git makes this easy:

```bash
# Create and switch to new branch (takes your changes with you)
git checkout -b feature-divorced-calculator

# Verify you're on the new branch
git branch

# Now commit your changes
git add .
git commit -m "WIP: Add divorced calculator"
```

Your main branch is still clean! See `GIT_WORKFLOW_FOR_BEGINNERS.md` page 3 for more."

### Scenario: Architecture Question

**User:** "Should the dropdown navigation go in the header or sidebar?"

**Good response:**
"Great question! According to `DROPDOWN_NAVIGATION_APPROACH.md`, it goes in the header component:
- Update `Header.jsx` (or create it if it doesn't exist)
- Dropdown replaces the current 'Social Security Planner' button
- On selection, it routes to the appropriate calculator

See section 2 of that doc for the exact implementation. Want me to walk through it?"

## Final Notes

**Remember:**
- They're smart and capable (built 95% of a complex calculator!)
- They learn by understanding, not just copying
- Git is new to them - be patient and encouraging
- They have good instincts (UX decisions, scope boundaries)
- Friday night is NOT the time for major refactoring! 😄

**Your role:**
- Guide, don't do it for them
- Explain why, not just what
- Celebrate progress
- Keep them on track with the plan
- Make coding less scary, more approachable

**Success looks like:**
In 5-6 weeks, they'll have expanded their calculator to serve divorced and widowed clients, learned Git branching, and feel confident making future improvements. That's the goal!

---

*This context document helps AI assistants provide better, more personalized support. Update it as the project evolves!*
