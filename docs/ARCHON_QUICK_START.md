# Archon Quick Start

## TL;DR - Install Archon in 3 Steps

```bash
# 1. Run the automated installation script
cd /Users/kurtzahner/Desktop/ss-calc-oct-25-main
./docs/archon-quick-start.sh

# 2. Open Archon UI and set up your project
open http://localhost:3737

# 3. Restart VS Code to enable Cline-Archon integration
```

---

## What This Does

The quick-start script will:
1. ✅ Install Docker Desktop (if needed)
2. ✅ Clone Archon repository to `~/Desktop/archon`
3. ✅ Copy your existing Supabase credentials
4. ✅ Configure API keys (you'll be prompted)
5. ✅ Launch Archon services via Docker
6. ✅ Configure Cline MCP integration
7. ✅ Give you next steps

**Total time:** ~10-15 minutes (plus Docker download if needed)

---

## Prerequisites You Need Ready

Have these ready when you run the script:
- [ ] OpenAI API Key
- [ ] Anthropic API Key

That's it! Everything else is automated.

---

## After Installation

### 1. Set Up Your Project in Archon

1. Open http://localhost:3737
2. Click **Projects** → **New Project**
3. Fill in:
   - Name: `SS Calculator Platform`
   - Path: `/Users/kurtzahner/Desktop/ss-calc-oct-25-main`
   - Description: `Social Security optimization with RISE & SHINE Method`

### 2. Index Your Knowledge Base

1. Click **Knowledge Base** → **Add Sources**
2. Add these directories:
   - `docs/` (all your RISE & SHINE documentation)
   - `frontend/src/` (React code)
   - `backend/` (Python API)
3. Click **Index All**
4. Wait 5-10 minutes for initial indexing

### 3. Test Integration with Cline

1. Restart VS Code
2. Open Cline
3. Try: "Using Archon, summarize the RISE and SHINE method"
4. Cline should query Archon and return content from your docs

---

## Daily Usage

### Starting Archon
```bash
cd ~/Desktop/archon
docker-compose up -d
```

### Stopping Archon
```bash
cd ~/Desktop/archon
docker-compose down
```

### Accessing Archon UI
```
http://localhost:3737
```

---

## What You Get

**Archon UI Features:**
- 📊 Project Dashboard
- 📚 Knowledge Base (searchable RAG)
- ✅ Task Board (Kanban-style)
- 🔍 Code Search
- 📝 Documentation Browser

**Cline Integration:**
- Cline can query your entire project knowledge
- Share context across sessions
- Track features and tasks
- Maintain project memory

---

## Troubleshooting

### Docker won't start
```bash
# Check if Docker is running
docker info

# If not, launch Docker Desktop
open -a Docker
```

### Ports already in use
```bash
# Check what's using port 3737
lsof -i :3737

# Kill the process or change ARCHON_PORT in .env
```

### Cline can't see Archon
1. Check Archon is running: `curl http://localhost:3000/health`
2. Restart VS Code
3. Check MCP config: `cat ~/Library/Application\ Support/Code/User/globalStorage/cline.cline/mcp_servers.json`

### Knowledge base isn't indexing
```bash
# Check logs
cd ~/Desktop/archon
docker-compose logs archon-api

# Check file permissions
ls -la /Users/kurtzahner/Desktop/ss-calc-oct-25-main
```

---

## Full Documentation

For detailed explanations, troubleshooting, and advanced configuration:
- **Full Guide:** [ARCHON_INSTALLATION_GUIDE.md](./ARCHON_INSTALLATION_GUIDE.md)
- **Archon Docs:** https://archon.diy
- **GitHub:** https://github.com/coleam00/archon

---

## Your Workflow with Archon

### Before (Without Archon)
1. Have idea for feature
2. Search through files manually
3. Tell Cline about it
4. Cline has limited context
5. Repeat context each session

### After (With Archon)
1. Log idea in Archon task board
2. Archon automatically links relevant docs/code
3. Ask Cline to implement
4. Cline queries Archon for full project context
5. Context persists across sessions
6. All AI assistants share same knowledge

---

## Resource Usage

Archon uses:
- **RAM:** ~2-3 GB
- **Disk:** ~5-8 GB
- **CPU:** Minimal when idle

To check:
```bash
docker stats
```

---

## Next Steps After Installation

1. ✅ Explore the Archon UI
2. ✅ Index your documentation
3. ✅ Create your first task
4. ✅ Test Cline integration
5. ✅ Start using Archon for all new features

**Remember:** Archon is your project's memory. Log ideas, track tasks, and let Cline access the full context automatically.
