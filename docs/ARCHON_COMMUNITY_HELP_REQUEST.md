# Archon Community Help Request

**Copy and paste the message below to Discord, GitHub Discussions, or wherever you're asking for help:**

---

## Subject: archon-server Container Failing - SUPABASE_SERVICE_KEY Configuration Issue

Hi Archon community! 👋

I'm trying to set up Archon locally using Docker Compose on macOS, but I'm running into a persistent issue with the `archon-server` container failing to start due to a `SUPABASE_SERVICE_KEY` configuration error.

### Environment
- **OS**: macOS
- **Docker**: Docker Desktop (latest version)
- **Archon**: Cloned from `stable` branch
- **Setup**: Local installation using docker-compose

### The Issue

When I run `docker-compose up -d`, all containers build successfully, but the `archon-server` container fails with:

```
archon-server  | raise ConfigurationError("SUPABASE_SERVICE_KEY environment variable is required")
archon-server  | src.server.config.config.ConfigurationError: SUPABASE_SERVICE_KEY environment variable is required
archon-server  | ERROR:     Application startup failed. Exiting.
 Container archon-server  Error
dependency failed to start: container archon-server is unhealthy
```

### What I've Tried

1. **Created `.env` file** in the `archon` directory with:
```env
SUPABASE_URL=https://[my-project].supabase.co
SUPABASE_KEY=[my-anon-key]
SUPABASE_SERVICE_KEY=[my-service-role-key]
```

2. **Verified the .env file** contains the correct key:
```bash
cat .env | grep SUPABASE_SERVICE_KEY
# Output shows the key is present
```

3. **Tried exporting the variable** before running docker-compose:
```bash
export SUPABASE_SERVICE_KEY=[my-service-role-key]
docker-compose down && docker-compose up -d
# Still fails with same error
```

4. **Checked docker-compose.yml** - it references `${SUPABASE_SERVICE_KEY}` correctly

### docker-compose Output

When I run `docker-compose up -d`, I see warnings:
```
WARN[0000] The "SUPABASE_SERVICE_KEY" variable is not set. Defaulting to a blank string.
```

Even though the variable IS set in my `.env` file.

### Questions

1. Is there a specific format or location required for the `.env` file?
2. Should I be using a different approach to pass environment variables to the containers?
3. Is there a known issue with docker-compose not reading the SUPABASE_SERVICE_KEY variable?
4. Are there any additional configuration files I need to create?

### What Works

- ✅ Docker Desktop is running
- ✅ All images build successfully
- ✅ The `.env` file exists and contains the correct variables
- ✅ `archon-frontend`, `archon-ui`, and `archon-mcp` containers build (but can't start due to dependency on archon-server)

### Logs

Full logs from `docker-compose logs archon-server`:
```
archon-server  | File "/app/src/server/config/config.py", line 150, in load_environment_config
archon-server  |     raise ConfigurationError("SUPABASE_SERVICE_KEY environment variable is required")
archon-server  | src.server.config.config.ConfigurationError: SUPABASE_SERVICE_KEY environment variable is required
```

### My Goal

I'm trying to set up Archon as a central knowledge base and task management system for my development projects. I have my Supabase credentials ready and Docker working, but can't get past this environment variable issue.

Any help would be greatly appreciated! Has anyone else encountered this issue?

Thanks in advance! 🙏

---

## Additional Context to Include (if asked):

**My .env file structure:**
```
# Supabase Configuration
SUPABASE_URL=https://jtpbkdzlwvtydpbjmjxc.supabase.co
SUPABASE_KEY=[anon-key-here]
SUPABASE_SERVICE_KEY=[service-role-key-here]

# AI Model Configuration
OPENAI_API_KEY=[your-key]
ANTHROPIC_API_KEY=[your-key]
DEFAULT_MODEL=gpt-4o

# Archon Server Configuration
ARCHON_PORT=3737
ARCHON_API_PORT=8000
ARCHON_MCP_PORT=3000

# Project Configuration
PROJECT_PATH=/Users/kurtzahner/Desktop/ss-calc-oct-25-main
ENABLE_AUTO_INDEXING=true
INDEX_ON_STARTUP=true
CRAWL_DEPTH=10

# Embedding Configuration
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

**Docker version:**
```bash
docker --version
docker-compose --version
```

**Repository:**
- Using the stable branch
- Cloned fresh today
