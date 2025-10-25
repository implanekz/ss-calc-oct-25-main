# Archon Installation Guide for SS-Calc Project

## Overview

This guide will help you install and configure Archon as a central command center for your Social Security Calculator project. Archon will:
- Index all your project documentation and code
- Provide RAG (Retrieval-Augmented Generation) context to Cline
- Track features, tasks, and ideas
- Maintain project knowledge across sessions

## Prerequisites

- macOS (detected from your environment)
- Homebrew package manager
- OpenAI API key ✅ (you have this)
- Anthropic API key ✅ (you have this)
- Supabase project ✅ (existing project will be reused)

---

## Part 1: Install Docker Desktop

### Why Local vs Cloud?

**Recommendation: LOCAL** for your use case because:
- ✅ Faster response times (no network latency)
- ✅ Free (no cloud hosting costs)
- ✅ Full control and privacy
- ✅ Can work offline
- ✅ Your Mac Desktop has sufficient resources

### Install Docker Desktop

```bash
# Install Docker Desktop via Homebrew
brew install --cask docker

# Launch Docker Desktop
open -a Docker

# Wait for Docker to start (you'll see the whale icon in menu bar)
# First launch may take a few minutes
```

**Verify Docker is running:**
```bash
docker --version
docker-compose --version
```

You should see version numbers for both commands.

---

## Part 2: Clone and Set Up Archon

### 1. Clone Archon Repository

```bash
# Navigate to a location OUTSIDE your project
cd ~/Desktop

# Clone the stable branch
git clone -b stable https://github.com/coleam00/archon.git

# Navigate into Archon directory
cd archon
```

### 2. Create Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env
```

Now open the `.env` file and configure it with your credentials:

```bash
# Open in your default editor
open .env
```

### 3. Configure Environment Variables

Edit the `.env` file with the following configuration:

```env
# ============================================
# SUPABASE CONFIGURATION (Reusing Your Existing Project)
# ============================================
# Get these from your existing backend/.env file
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ============================================
# AI MODEL CONFIGURATION
# ============================================
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
DEFAULT_MODEL=gpt-4o  # or gpt-4o-mini for cost savings

# Anthropic Configuration  
ANTHROPIC_API_KEY=your_anthropic_api_key_here
# Uncomment to use Claude as default:
# DEFAULT_MODEL=claude-sonnet-4-20250514

# ============================================
# ARCHON SERVER CONFIGURATION
# ============================================
# Web UI Port
ARCHON_PORT=3737

# API Port
ARCHON_API_PORT=8000

# MCP Server Port
ARCHON_MCP_PORT=3000

# ============================================
# PROJECT CONFIGURATION
# ============================================
# Path to your SS-Calc project
PROJECT_PATH=/Users/kurtzahner/Desktop/ss-calc-oct-25-main

# Knowledge Base Settings
ENABLE_AUTO_INDEXING=true
INDEX_ON_STARTUP=true
CRAWL_DEPTH=10

# ============================================
# EMBEDDING CONFIGURATION
# ============================================
# For RAG / Vector Search
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# ============================================
# OPTIONAL: OLLAMA (Local Models)
# ============================================
# If you want to run local models (optional)
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3.2:latest
```

### 4. Get Your Supabase Credentials

Let's extract your existing Supabase credentials:

```bash
# From your project root
cd /Users/kurtzahner/Desktop/ss-calc-oct-25-main

# View backend credentials
cat backend/.env | grep SUPABASE

# View frontend credentials  
cat frontend/.env.local | grep SUPABASE
```

Copy these values into Archon's `.env` file.

---

## Part 3: Launch Archon

### 1. Start Archon Services

```bash
# Navigate to Archon directory
cd ~/Desktop/archon

# Start all services with Docker Compose
docker-compose up -d

# Check if services are running
docker-compose ps
```

You should see services running:
- `archon-web` (UI) on port 3737
- `archon-api` (Backend) on port 8000
- `archon-mcp` (MCP Server) on port 3000
- `supabase` (if using local Supabase - you can skip this)

### 2. Access Archon UI

Open your browser to:
```
http://localhost:3737
```

You should see the Archon interface with a dark, Tron-style UI.

### 3. Verify Services

```bash
# Check API health
curl http://localhost:8000/health

# Check MCP server
curl http://localhost:3000/health
```

---

## Part 4: Connect Your Project to Archon

### 1. Initial Project Setup in Archon UI

1. Open `http://localhost:3737`
2. Navigate to **Projects** → **New Project**
3. Enter project details:
   - **Name**: `SS Calculator Platform`
   - **Path**: `/Users/kurtzahner/Desktop/ss-calc-oct-25-main`
   - **Description**: `Social Security optimization platform with RISE & SHINE Method`
   - **Type**: `Full Stack` (React + Python)

4. Click **Create Project**

### 2. Index Project Knowledge Base

1. Navigate to **Knowledge Base** → **Add Sources**
2. Add the following sources:

**Source 1: Documentation**
- Type: Local Directory
- Path: `/Users/kurtzahner/Desktop/ss-calc-oct-25-main/docs`
- Recursive: Yes
- File Patterns: `*.md, *.txt`

**Source 2: Frontend Code**
- Type: Local Directory
- Path: `/Users/kurtzahner/Desktop/ss-calc-oct-25-main/frontend/src`
- Recursive: Yes
- File Patterns: `*.js, *.jsx, *.ts, *.tsx, *.css`

**Source 3: Backend Code**
- Type: Local Directory
- Path: `/Users/kurtzahner/Desktop/ss-calc-oct-25-main/backend`
- Recursive: Yes
- File Patterns: `*.py, *.sql`

**Source 4: Project Root Files**
- Type: Local Directory
- Path: `/Users/kurtzahner/Desktop/ss-calc-oct-25-main`
- Recursive: No
- Files: `README.md, TODO.md, .gitignore, package.json`

3. Click **Index All Sources**

**Initial indexing will take 5-15 minutes** depending on project size. You'll see:
- Files being processed
- Embeddings being created
- Vector database being populated

---

## Part 5: Configure Cline to Use Archon (MCP Integration)

### 1. Locate Cline's MCP Configuration

Cline's configuration is typically in VS Code settings. We need to add Archon as an MCP server.

### 2. Create MCP Configuration File

```bash
# Create Cline MCP config directory
mkdir -p ~/Library/Application\ Support/Code/User/globalStorage/cline.cline/

# Create MCP servers config
cat > ~/Library/Application\ Support/Code/User/globalStorage/cline.cline/mcp_servers.json << 'EOF'
{
  "mcpServers": {
    "archon": {
      "command": "node",
      "args": [
        "/Users/kurtzahner/Desktop/archon/mcp-server/index.js"
      ],
      "env": {
        "ARCHON_API_URL": "http://localhost:8000",
        "ARCHON_MCP_PORT": "3000",
        "ARCHON_API_KEY": "your-api-key-here",
        "PROJECT_PATH": "/Users/kurtzahner/Desktop/ss-calc-oct-25-main"
      },
      "description": "Archon AI Command Center - Project knowledge and task management"
    }
  }
}
EOF
```

### 3. Restart VS Code

Close and reopen VS Code to load the new MCP configuration.

### 4. Verify Cline Can See Archon

1. Open Cline in VS Code
2. Look for **MCP Tools** or **Connected Servers**
3. You should see "Archon" listed with available tools:
   - `search_knowledge_base`
   - `get_project_context`
   - `create_task`
   - `list_tasks`
   - `get_documentation`

### 5. Test the Integration

Ask Cline:
```
"Using Archon, search for documentation about the RISE and SHINE method"
```

Cline should query Archon's knowledge base and return relevant content from your docs.

---

## Part 6: Verify Everything Works

### Test Checklist

- [ ] Docker Desktop is running
- [ ] Archon UI accessible at `http://localhost:3737`
- [ ] API responding at `http://localhost:8000/health`
- [ ] MCP server responding at `http://localhost:3000/health`
- [ ] Project appears in Archon Projects tab
- [ ] Knowledge base shows indexed files
- [ ] Can search documentation in Archon UI
- [ ] Cline shows Archon in MCP servers list
- [ ] Cline can query Archon knowledge base

### Troubleshooting

**Docker won't start:**
```bash
# Check Docker Desktop is running
pgrep -f Docker

# If not running, open Docker app
open -a Docker
```

**Port conflicts:**
```bash
# Check if ports are in use
lsof -i :3737
lsof -i :8000
lsof -i :3000

# Change ports in .env if needed
```

**Indexing fails:**
```bash
# Check Docker logs
docker-compose logs archon-api

# Check file permissions
ls -la /Users/kurtzahner/Desktop/ss-calc-oct-25-main
```

**Cline can't connect:**
```bash
# Verify MCP config file exists
cat ~/Library/Application\ Support/Code/User/globalStorage/cline.cline/mcp_servers.json

# Check Archon MCP server is running
curl http://localhost:3000/health
```

---

## Part 7: Daily Workflow

### Starting Your Day

1. **Ensure Docker is running** (whale icon in menu bar)
2. **Start Archon** (if not already running):
   ```bash
   cd ~/Desktop/archon
   docker-compose up -d
   ```
3. **Open VS Code** - Cline will automatically connect to Archon

### Shutting Down

```bash
# Stop Archon services
cd ~/Desktop/archon
docker-compose down

# Or keep running (uses minimal resources when idle)
```

### Updating Archon

```bash
cd ~/Desktop/archon
git pull origin stable
docker-compose down
docker-compose build
docker-compose up -d
```

---

## Next Steps

1. **Explore Archon UI**: Familiarize yourself with Projects, Knowledge Base, and Tasks
2. **Create Your First Task**: Log a feature idea in Archon's task board
3. **Test with Cline**: Ask Cline questions that draw from project knowledge
4. **Review RAG Results**: Check quality of knowledge base searches
5. **Organize Tasks**: Structure your backlog in Archon's Kanban board

---

## Resource Usage

**Expected Resource Consumption:**
- **RAM**: ~2-4 GB (Docker containers)
- **Disk**: ~5-10 GB (Docker images + vector database)
- **CPU**: Low when idle, moderate during indexing

**To Monitor:**
```bash
# Check Docker resource usage
docker stats

# Check Archon-specific usage
docker stats archon-web archon-api archon-mcp
```

---

## Support and Documentation

- **Archon GitHub**: https://github.com/coleam00/archon
- **Archon Documentation**: https://archon.diy
- **MCP Documentation**: https://modelcontextprotocol.io
- **Cline MCP Guide**: https://docs.cline.bot/mcp

---

## Success Criteria

You'll know everything is working when:
1. ✅ Archon UI shows your project with indexed files
2. ✅ You can search your RISE & SHINE docs in Archon
3. ✅ Cline can answer questions using Archon's knowledge
4. ✅ You can create and track tasks in Archon
5. ✅ Your development workflow feels more organized

**Estimated Total Setup Time: 30-45 minutes**
(Most time spent on initial indexing)
