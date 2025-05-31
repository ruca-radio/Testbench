#!/bin/bash
# MCP Server Monitoring Setup Script
# This script sets up the monitoring stack for MCP servers
# Usage: ./setup-mcp-monitoring.sh [--docker] [--prometheus-port=9090] [--grafana-port=3000]

set -e

# Default configuration
USE_DOCKER=false
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
MONITORING_DIR="./monitoring"
CONFIG_DIR="$MONITORING_DIR/config"
DATA_DIR="$MONITORING_DIR/data"

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --docker)
      USE_DOCKER=true
      shift
      ;;
    --prometheus-port=*)
      PROMETHEUS_PORT="${arg#*=}"
      shift
      ;;
    --grafana-port=*)
      GRAFANA_PORT="${arg#*=}"
      shift
      ;;
    *)
      # Unknown option
      echo "Unknown option: $arg"
      echo "Usage: ./setup-mcp-monitoring.sh [--docker] [--prometheus-port=9090] [--grafana-port=3000]"
      exit 1
      ;;
  esac
done

# Create directories
echo "Creating monitoring directories..."
mkdir -p "$CONFIG_DIR/prometheus"
mkdir -p "$CONFIG_DIR/grafana/dashboards"
mkdir -p "$CONFIG_DIR/grafana/provisioning/dashboards"
mkdir -p "$CONFIG_DIR/grafana/provisioning/datasources"
mkdir -p "$DATA_DIR/prometheus"
mkdir -p "$DATA_DIR/grafana"

# Copy configuration files
echo "Copying configuration files..."
cp utils/prometheus-mcp-config.yml "$CONFIG_DIR/prometheus/prometheus.yml"
cp utils/mcp-alerts.yml "$CONFIG_DIR/prometheus/mcp-alerts.yml"
cp utils/grafana-mcp-dashboard.json "$CONFIG_DIR/grafana/dashboards/mcp-dashboard.json"

# Create Grafana dashboard provisioning
cat > "$CONFIG_DIR/grafana/provisioning/dashboards/mcp-dashboards.yml" << EOF
apiVersion: 1

providers:
  - name: 'MCP Dashboards'
    orgId: 1
    folder: 'MCP'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/dashboards
      foldersFromFilesStructure: false
EOF

# Create Grafana datasource provisioning
cat > "$CONFIG_DIR/grafana/provisioning/datasources/prometheus.yml" << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    orgId: 1
    url: http://prometheus:9090
    isDefault: true
    version: 1
    editable: true
EOF

if [ "$USE_DOCKER" = true ]; then
  # Create docker-compose.yml
  echo "Creating Docker Compose configuration..."
  cat > "$MONITORING_DIR/docker-compose.yml" << EOF
version: '3'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: mcp-prometheus
    ports:
      - "$PROMETHEUS_PORT:9090"
    volumes:
      - $CONFIG_DIR/prometheus:/etc/prometheus
      - $DATA_DIR/prometheus:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: mcp-grafana
    ports:
      - "$GRAFANA_PORT:3000"
    volumes:
      - $CONFIG_DIR/grafana/provisioning:/etc/grafana/provisioning
      - $CONFIG_DIR/grafana/dashboards:/etc/grafana/dashboards
      - $DATA_DIR/grafana:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-simple-json-datasource
    depends_on:
      - prometheus
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: mcp-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped

  blackbox-exporter:
    image: prom/blackbox-exporter:latest
    container_name: mcp-blackbox-exporter
    ports:
      - "9115:9115"
    volumes:
      - $CONFIG_DIR/blackbox:/config
    command:
      - '--config.file=/config/blackbox.yml'
    restart: unless-stopped
EOF

  # Create blackbox exporter config
  mkdir -p "$CONFIG_DIR/blackbox"
  cat > "$CONFIG_DIR/blackbox/blackbox.yml" << EOF
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [200]
      method: GET
      preferred_ip_protocol: "ip4"
      follow_redirects: true
EOF

  # Start the monitoring stack
  echo "Starting monitoring stack with Docker Compose..."
  cd "$MONITORING_DIR"
  docker-compose up -d

  echo "Monitoring stack started successfully!"
  echo "Prometheus is available at http://localhost:$PROMETHEUS_PORT"
  echo "Grafana is available at http://localhost:$GRAFANA_PORT"
  echo "Default Grafana credentials: admin/admin"
else
  # Instructions for manual setup
  echo "Docker setup not selected. Please follow these manual setup instructions:"
  echo ""
  echo "1. Install Prometheus:"
  echo "   - Download from: https://prometheus.io/download/"
  echo "   - Copy $CONFIG_DIR/prometheus/prometheus.yml to your Prometheus config directory"
  echo "   - Copy $CONFIG_DIR/prometheus/mcp-alerts.yml to your Prometheus config directory"
  echo "   - Start Prometheus with: prometheus --config.file=prometheus.yml"
  echo ""
  echo "2. Install Grafana:"
  echo "   - Download from: https://grafana.com/grafana/download"
  echo "   - Copy $CONFIG_DIR/grafana/provisioning to your Grafana config directory"
  echo "   - Copy $CONFIG_DIR/grafana/dashboards to your Grafana dashboards directory"
  echo "   - Start Grafana"
  echo ""
  echo "3. Install Node Exporter (for system metrics):"
  echo "   - Download from: https://prometheus.io/download/#node_exporter"
  echo "   - Start Node Exporter"
  echo ""
  echo "4. Install Blackbox Exporter (for endpoint probing):"
  echo "   - Download from: https://prometheus.io/download/#blackbox_exporter"
  echo "   - Create a configuration file based on $CONFIG_DIR/blackbox/blackbox.yml"
  echo "   - Start Blackbox Exporter with: blackbox_exporter --config.file=blackbox.yml"
  echo ""
  echo "Configuration files have been created in $CONFIG_DIR"
fi

# Create a simple README file
cat > "$MONITORING_DIR/README.md" << EOF
# MCP Server Monitoring

This directory contains the monitoring setup for MCP servers.

## Directory Structure

- \`config/\`: Configuration files for Prometheus and Grafana
- \`data/\`: Data directories for Prometheus and Grafana

## Components

- **Prometheus**: Time series database for storing metrics
- **Grafana**: Visualization and dashboarding
- **Node Exporter**: System metrics collector
- **Blackbox Exporter**: Endpoint prober for checking MCP server availability

## Usage

### With Docker

If you used the \`--docker\` option, the monitoring stack is running in Docker containers.

- Prometheus: http://localhost:$PROMETHEUS_PORT
- Grafana: http://localhost:$GRAFANA_PORT (default credentials: admin/admin)

To stop the monitoring stack:

\`\`\`
cd $MONITORING_DIR
docker-compose down
\`\`\`

To restart the monitoring stack:

\`\`\`
cd $MONITORING_DIR
docker-compose up -d
\`\`\`

### Manual Setup

If you didn't use the \`--docker\` option, follow the instructions in the setup script output to manually set up the monitoring stack.

## MCP Server Health Check

A Node.js script is provided to check the health of MCP servers:

\`\`\`
node utils/mcp-health-check.js [--server=server-name] [--verbose] [--json] [--threshold=500]
\`\`\`

Options:
- \`--server\`: Check only the specified server (default: all servers)
- \`--verbose\`: Show detailed information about each check
- \`--json\`: Output results in JSON format
- \`--threshold\`: Response time threshold in ms (default: 500)

## Customization

- Prometheus configuration: \`config/prometheus/prometheus.yml\`
- Prometheus alerts: \`config/prometheus/mcp-alerts.yml\`
- Grafana dashboards: \`config/grafana/dashboards/\`
EOF

echo "Setup complete! See $MONITORING_DIR/README.md for usage instructions."