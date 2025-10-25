# Using Archon with Multiple Projects

## Overview

**Archon is a standalone application** that can manage unlimited projects from a single installation. It's installed once in its own directory and then connects to as many projects as you need.

## Installation Structure

```
~/Desktop/
├── archon/                    ← ONE Archon installation
│   ├── docker-compose.yml
│   ├── .env
│   ├── mcp-server/
│   └── ... (Archon code)
│
├── ss-calc-oct-25-main/       ← Project 1 (SS Calculator)
│   ├── frontend/
│   ├── backend/
│   └── docs/
│
├── my-other-project/          ← Project 2 (Future project)
│   ├── src/
│   └── docs/
│
└── another-project/           ← Project 3 (Another future project)
    └── ...
```

**Key Point:** One Archon installation → Many projects

---

## How It Works

### Single Archon Instance
- Archon runs at `~/Desktop/archon/`
- It's a **central command center** for all your development work
- Always accessible at `http://localhost:3737`

### Multiple Projects
- Each project you work on gets added to Archon's **Projects** list
- Archon maintains separate knowledge bases for each project
- Each project's documentation, code, and tasks are indexed separately
- You can switch between projects in the Archon UI

---

## Adding Your First Project (SS Calculator)

**During Initial Setup:**
1. Install Archon once: `~/Desktop/archon/`
2. In Archon UI, create project: "SS Calculator Platform"
3. Point to: `/Users/kurtzahner/Desktop/ss-calc-oct-25-main`
4. Index all documentation and code

**This is stored in Archon's database**, not in your project folder.

---

## Adding Future Projects

### Example: Adding a New Project

Let's say you start a new project called "Personal Finance Dashboard":

#### Step 1: Create Project in Archon UI
1. Open `http://localhost:3737`
2. Navigate to **Projects** → **New Project**
3. Fill in:
   - Name: `Personal Finance Dashboard`
   - Path: `/Users/kurtzahner/Desktop/finance-dashboard`
   - Description: `Personal finance tracking app`
   - Type: `Full Stack`

#### Step 2: Index New Project
1. Go to **Knowledge Base** → **Add Sources**
2. Add project directories:
   - `/Users/kurtzahner/Desktop/finance-dashboard/docs`
   - `/Users/kurtzahner/Desktop/finance-dashboard/src`
3. Click **Index**

#### Step 3: Switch Between Projects
- In Archon UI, use the **Project Selector** dropdown
- Each project maintains its own:
  - Knowledge base
  - Task board
  - Documentation index
  - Code analysis

---

## Cline Integration with Multiple Projects

### How Cline Knows Which Project

When you're working in VS Code:
1. **Cline detects your active workspace**
2. It queries Archon with the project path
3. Archon returns context **specific to that project**
4. Context is automatically scoped to the current project

### MCP Configuration (Already Set Up)

The MCP configuration includes `PROJECT_PATH`:
```json
{
  "mcpServers": {
    "archon": {
      "env": {
        "PROJECT_PATH": "/Users/kurtzahner/Desktop/ss-calc-oct-25-main"
      }
    }
  }
}
```

**For multiple projects**, you have two options:

#### Option 1: Dynamic Project Detection (Recommended)
Update MCP config to use workspace path:
```json
{
  "mcpServers": {
    "archon": {
      "env": {
        "PROJECT_PATH": "${workspaceFolder}"
      }
    }
  }
}
```

Now Cline automatically uses whatever project you have open!

#### Option 2: Manual Project Switching
Keep the MCP config as-is and switch projects in Archon UI when you change VS Code workspaces.

---

## Managing Multiple Projects Workflow

### Daily Workflow
```bash
# 1. Start Archon (once at the beginning of your day)
cd ~/Desktop/archon
docker-compose up -d

# 2. Work on SS Calculator
code /Users/kurtzahner/Desktop/ss-calc-oct-25-main
# Cline queries Archon → Gets SS Calc context

# 3. Switch to another project
code /Users/kurtzahner/Desktop/my-other-project
# Cline queries Archon → Gets other project context

# 4. All projects tracked in one Archon UI
open http://localhost:3737
```

### Archon Manages:
- ✅ All project knowledge bases
- ✅ All task boards
- ✅ All documentation indices
- ✅ Cross-project search (if needed)
- ✅ Unified project dashboard

---

## Benefits of Centralized Archon

### Single Source of Truth
- One Archon instance for all development work
- Consistent AI context across all projects
- Unified task management

### Resource Efficiency
- Docker containers run once (not per-project)
- Shared vector database
- Shared embedding models

### Cross-Project Intelligence
- Can search across all projects (optional)
- Reuse patterns and solutions
- Track similar tasks across projects

---

## Storage Considerations

### Where Data Lives

**Archon's Data (Centralized):**
- `~/Desktop/archon/` - Application code
- Supabase - Knowledge base vectors, tasks, metadata
- Docker volumes - Temporary processing

**Your Projects (Untouched):**
- `/Users/kurtzahner/Desktop/ss-calc-oct-25-main/` - Your code
- `/Users/kurtzahner/Desktop/other-project/` - Other code
- **Archon never modifies your project files**

### Disk Space
- Archon installation: ~5-8 GB (one time)
- Per project index: ~50-200 MB (in Supabase)
- Total for 10 projects: Still only ~10 GB total

---

## Example: Your Future Setup

```
Archon Command Center
├── Project: SS Calculator Platform ✅ (Current)
│   ├── Knowledge Base: 1,245 documents
│   ├── Tasks: 23 items
│   └── Last Updated: Today
│
├── Project: Personal Finance App (Future)
│   ├── Knowledge Base: 456 documents
│   ├── Tasks: 12 items
│   └── Last Updated: Last week
│
├── Project: Mobile App Backend (Future)
│   ├── Knowledge Base: 789 documents
│   ├── Tasks: 8 items
│   └── Last Updated: Yesterday
│
└── Search Across All Projects
    └── "Find documentation about authentication"
        → Results from all 3 projects
```

---

## Sharing Archon Across Teams (Optional)

### Solo Developer (Your Current Setup)
- Archon runs locally on your Mac
- Private to your machine
- Perfect for personal projects

### Team Setup (Future Possibility)
- Deploy Archon to cloud server
- Multiple developers connect to same Archon
- Shared knowledge base and tasks
- Collaborative AI development

---

## Migration and Backup

### Your Projects Are Safe
- Archon indexes copies of your files
- Original files never touched
- Delete Archon → Your projects unchanged

### Backing Up Archon Data
```bash
# Export all project data
cd ~/Desktop/archon
docker-compose exec archon-api npm run export-all

# Backup Supabase data
# (Use Supabase dashboard backup tools)
```

### Moving Archon to New Machine
1. Install Archon on new machine
2. Point to same Supabase instance
3. All projects, tasks, and knowledge bases sync automatically

---

## FAQ: Multi-Project Usage

**Q: Do I need multiple Archon installations?**
No! One Archon instance manages unlimited projects.

**Q: Can Archon handle projects in different languages?**
Yes! Python, JavaScript, TypeScript, Java, Go, etc. All supported.

**Q: What if projects use different AI models?**
Archon can use different models per query. Configure in UI.

**Q: Can I have projects in different folders?**
Yes! Projects can be anywhere on your filesystem.

**Q: Does each project need its own Supabase?**
No! One Supabase instance with separate tables per project.

**Q: How do I remove a project from Archon?**
In Archon UI: Projects → Select project → Delete. Your actual project files are untouched.

---

## Recommended Project Organization

```
~/Development/
├── archon/                    ← One Archon installation
│
├── client-projects/
│   ├── ss-calculator/
│   ├── other-client-work/
│   └── ...
│
├── personal-projects/
│   ├── blog/
│   ├── portfolio/
│   └── ...
│
└── experiments/
    ├── ai-tests/
    └── ...

All managed by one Archon at ~/Development/archon/
```

---

## Summary

✅ **One Archon installation** at `~/Desktop/archon/`
✅ **Unlimited projects** can be added
✅ **Each project** maintains separate knowledge base
✅ **Cline automatically** queries the right project
✅ **Archon never modifies** your source code
✅ **Centralized management** of all development work
✅ **Portable** - move to cloud or new machine easily

**Your SS Calculator project is just the first of many projects Archon will help you manage!**
