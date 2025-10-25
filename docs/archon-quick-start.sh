#!/bin/bash

# Archon Quick Start Installation Script for SS-Calc Project
# This script automates the initial setup of Archon

set -e  # Exit on error

echo "========================================="
echo "Archon Installation Script"
echo "SS-Calc Project Integration"
echo "========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Homebrew is installed
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command -v brew &> /dev/null; then
    echo -e "${RED}Homebrew is not installed. Please install it first:${NC}"
    echo "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi
echo -e "${GREEN}✓ Homebrew found${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker Desktop not found. Installing...${NC}"
    brew install --cask docker
    echo -e "${GREEN}✓ Docker Desktop installed${NC}"
    echo -e "${YELLOW}Please launch Docker Desktop and wait for it to start, then run this script again.${NC}"
    open -a Docker
    exit 0
else
    echo -e "${GREEN}✓ Docker found${NC}"
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Docker is installed but not running.${NC}"
    echo -e "${YELLOW}Starting Docker Desktop...${NC}"
    open -a Docker
    echo "Waiting for Docker to start (this may take a minute)..."
    sleep 30
    if ! docker info &> /dev/null; then
        echo -e "${RED}Docker failed to start. Please start Docker Desktop manually and try again.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Clone Archon if not already cloned
ARCHON_DIR="$HOME/Desktop/archon"
if [ -d "$ARCHON_DIR" ]; then
    echo -e "${YELLOW}Archon directory already exists at $ARCHON_DIR${NC}"
    read -p "Do you want to delete and re-clone? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$ARCHON_DIR"
    else
        cd "$ARCHON_DIR"
        git pull origin stable
        echo -e "${GREEN}✓ Archon updated${NC}"
    fi
fi

if [ ! -d "$ARCHON_DIR" ]; then
    echo -e "${YELLOW}Cloning Archon repository...${NC}"
    cd "$HOME/Desktop"
    git clone -b stable https://github.com/coleam00/archon.git
    echo -e "${GREEN}✓ Archon cloned${NC}"
fi

cd "$ARCHON_DIR"

# Check if .env exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}.env file already exists${NC}"
    read -p "Do you want to reconfigure? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Using existing .env file${NC}"
    else
        rm .env
    fi
fi

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env configuration...${NC}"
    
    # Copy example
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        echo -e "${RED}.env.example not found. Creating from scratch...${NC}"
        touch .env
    fi
    
    # Get Supabase credentials from existing project
    PROJECT_DIR="/Users/kurtzahner/Desktop/ss-calc-oct-25-main"
    
    echo ""
    echo -e "${YELLOW}Reading Supabase credentials from existing project...${NC}"
    
    if [ -f "$PROJECT_DIR/backend/.env" ]; then
        SUPABASE_URL=$(grep SUPABASE_URL "$PROJECT_DIR/backend/.env" | cut -d '=' -f2)
        SUPABASE_KEY=$(grep SUPABASE_ANON_KEY "$PROJECT_DIR/backend/.env" | cut -d '=' -f2)
        SUPABASE_SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY "$PROJECT_DIR/backend/.env" | cut -d '=' -f2)
        
        echo -e "${GREEN}✓ Found Supabase credentials${NC}"
        echo "URL: ${SUPABASE_URL:0:30}..."
    else
        echo -e "${RED}Could not find backend/.env file${NC}"
        read -p "Enter Supabase URL: " SUPABASE_URL
        read -p "Enter Supabase Anon Key: " SUPABASE_KEY
        read -p "Enter Supabase Service Role Key: " SUPABASE_SERVICE_KEY
    fi
    
    # Get API keys
    echo ""
    echo -e "${YELLOW}API Keys Configuration:${NC}"
    read -p "Enter OpenAI API Key: " OPENAI_KEY
    read -p "Enter Anthropic API Key: " ANTHROPIC_KEY
    
    # Write .env file
    cat > .env << EOF
# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_KEY=$SUPABASE_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY

# AI Model Configuration
OPENAI_API_KEY=$OPENAI_KEY
ANTHROPIC_API_KEY=$ANTHROPIC_KEY
DEFAULT_MODEL=gpt-4o

# Archon Server Configuration
ARCHON_PORT=3737
ARCHON_API_PORT=8000
ARCHON_MCP_PORT=3000

# Project Configuration
PROJECT_PATH=$PROJECT_DIR
ENABLE_AUTO_INDEXING=true
INDEX_ON_STARTUP=true
CRAWL_DEPTH=10

# Embedding Configuration
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
EOF
    
    echo -e "${GREEN}✓ .env file created${NC}"
fi

# Start Archon
echo ""
echo -e "${YELLOW}Starting Archon services...${NC}"
docker-compose up -d

# Wait for services to start
echo "Waiting for services to initialize (30 seconds)..."
sleep 30

# Check if services are running
echo ""
echo -e "${YELLOW}Checking service health...${NC}"

if curl -s http://localhost:3737 > /dev/null; then
    echo -e "${GREEN}✓ Archon UI running at http://localhost:3737${NC}"
else
    echo -e "${RED}✗ Archon UI not responding${NC}"
fi

if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✓ Archon API running at http://localhost:8000${NC}"
else
    echo -e "${RED}✗ Archon API not responding${NC}"
fi

if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ Archon MCP Server running at http://localhost:3000${NC}"
else
    echo -e "${RED}✗ Archon MCP Server not responding${NC}"
fi

# Configure Cline MCP
echo ""
echo -e "${YELLOW}Configuring Cline MCP integration...${NC}"

MCP_DIR="$HOME/Library/Application Support/Code/User/globalStorage/cline.cline"
mkdir -p "$MCP_DIR"

cat > "$MCP_DIR/mcp_servers.json" << 'EOF'
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
        "PROJECT_PATH": "/Users/kurtzahner/Desktop/ss-calc-oct-25-main"
      },
      "description": "Archon AI Command Center - Project knowledge and task management"
    }
  }
}
EOF

echo -e "${GREEN}✓ Cline MCP configuration created${NC}"

# Final instructions
echo ""
echo "========================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3737 in your browser"
echo "2. Create a new project: SS Calculator Platform"
echo "3. Add knowledge sources from: /Users/kurtzahner/Desktop/ss-calc-oct-25-main"
echo "4. Restart VS Code to load Cline MCP configuration"
echo "5. Test by asking Cline to search Archon knowledge base"
echo ""
echo "Full documentation: docs/ARCHON_INSTALLATION_GUIDE.md"
echo ""
echo "To stop Archon:"
echo "  cd ~/Desktop/archon && docker-compose down"
echo ""
echo "To start Archon later:"
echo "  cd ~/Desktop/archon && docker-compose up -d"
echo ""
