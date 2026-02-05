# Neural Coding Infrastructure

Production-ready Docker infrastructure with Nginx Proxy Manager and Streamlit services.

## Architecture

```
Internet → Cloudflare → NPM (ports 80/443) → nginx (port 8000) → Streamlit Apps
                         ↓
                    Admin Panel (localhost:81)
```

**Services:**
- **Nginx Proxy Manager (NPM)**: SSL termination, domain routing, Let's Encrypt
- **Nginx**: Reverse proxy for Streamlit apps with WebSocket support
- **MariaDB**: Database for NPM configuration
- **Streamlit Apps**: LIF Explorer, Weight Visualizer, Code Transpiler, Data Formatter

## Quick Start

### 1. Initial Setup

```bash
cd infra
chmod +x setup.sh
./setup.sh
```

This script will:
- Generate secure random passwords in `.env`
- Create Docker volumes
- Build and start all services
- Display service URLs and next steps

### 2. Configure NPM Admin

1. Access NPM admin panel via SSH tunnel:
   ```bash
   ssh -L 81:localhost:81 user@your-server
   ```

2. Open http://localhost:81 in your browser

3. Default login:
   - Email: `admin@example.com`
   - Password: `changeme`

4. **IMPORTANT**: Change password immediately after first login

### 3. Create Proxy Host in NPM

Configure domain routing:

**Recommended Setup:**
- Domain: `tools.neural-coding.com`
- Forward Hostname: `nginx`
- Forward Port: `80`
- Enable WebSocket Support
- Enable SSL (Let's Encrypt)

This routes all traffic through the optimized nginx reverse proxy.

**Alternative (not recommended):**
Direct routing to individual apps increases maintenance overhead:
- `lif.tools.neural-coding.com` → `lif:8501`
- `weights.tools.neural-coding.com` → `weights:8502`
- etc.

### 4. Configure Cloudflare DNS

1. Add A record: `tools.neural-coding.com` → Your server IP
2. Start with DNS-only (gray cloud) for testing
3. Enable proxy (orange cloud) after verification
4. Configure SSL/TLS mode: Full (strict)

## Service URLs

**Production:**
- Main Hub: https://tools.neural-coding.com/
- LIF Explorer: https://tools.neural-coding.com/lif/
- Weight Visualizer: https://tools.neural-coding.com/weights/
- Code Transpiler: https://tools.neural-coding.com/transpiler/
- Data Formatter: https://tools.neural-coding.com/nwb/

**Local Development:**
- Streamlit Hub: http://localhost:8000/
- NPM Admin: http://localhost:81 (via SSH tunnel)

## Security Features

### Implemented

- **Secure Passwords**: Auto-generated 32-character random passwords
- **Port Restriction**: Admin panel (port 81) bound to localhost only
- **Health Checks**: All services monitored with automatic restart
- **Resource Limits**: CPU and memory constraints prevent resource exhaustion
- **Rate Limiting**: Protection against abuse (10 req/s per IP for Streamlit)
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, CSP, etc.
- **Logging**: Structured logs with rotation (10MB max, 3 files)
- **Network Isolation**: Separate networks for NPM and Streamlit services
- **WebSocket Support**: Full support for Streamlit's real-time features

### Best Practices

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Use SSH tunnels** for remote admin access instead of exposing port 81
3. **Enable Cloudflare WAF** for additional DDoS protection
4. **Regular backups** of NPM data and SSL certificates
5. **Monitor logs** for suspicious activity
6. **Update images** regularly for security patches

## Management Commands

### Service Control

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart specific service
docker compose restart nginx

# View logs
docker compose logs -f nginx
docker compose logs -f lif

# Check service health
docker compose ps
```

### Updates

```bash
# Pull latest images
docker compose pull

# Rebuild and restart
docker compose up -d --build

# Update specific service
docker compose up -d --build lif
```

### Monitoring

```bash
# Real-time resource usage
docker stats

# Service health status
docker compose ps

# Check specific service logs
docker compose logs --tail=100 -f npm

# Nginx access logs
docker compose exec nginx tail -f /var/log/nginx/access.log
```

## Troubleshooting

### NPM Admin Panel Not Accessible

**Problem**: Cannot access http://localhost:81

**Solution**:
```bash
# Check if port 81 is bound to localhost
docker compose ps npm

# Create SSH tunnel from local machine
ssh -L 81:localhost:81 user@your-server

# Access via http://localhost:81 on your local machine
```

### Streamlit App Not Loading

**Problem**: 502 Bad Gateway or connection timeout

**Solution**:
```bash
# Check service health
docker compose ps

# View service logs
docker compose logs lif

# Restart unhealthy service
docker compose restart lif

# Check if health endpoint responds
docker compose exec lif wget -O- http://localhost:8501/_stcore/health
```

### WebSocket Connection Failed

**Problem**: Streamlit shows "Connection lost" or "Reconnecting"

**Solution**:
1. Verify WebSocket support enabled in NPM proxy host settings
2. Check nginx configuration has proper WebSocket headers
3. If using Cloudflare, ensure WebSocket is enabled (Enterprise/Business plan)
4. For testing, temporarily disable Cloudflare proxy (gray cloud)

### Database Connection Issues

**Problem**: NPM cannot connect to database

**Solution**:
```bash
# Check database health
docker compose ps npm_db

# View database logs
docker compose logs npm_db

# Restart database
docker compose restart npm_db

# Wait for health check to pass (40s start period)
docker compose ps npm_db
```

### High Memory Usage

**Problem**: Services consuming too much memory

**Solution**:
```bash
# Check current usage
docker stats

# Adjust resource limits in docker-compose.yml
# Example: Change memory limit from 512M to 256M

# Restart with new limits
docker compose up -d
```

## Backup & Restore

### Backup

```bash
# Backup NPM data (includes SSL certificates)
docker run --rm -v npm_data:/data -v $(pwd):/backup alpine tar czf /backup/npm_data_backup.tar.gz -C /data .
docker run --rm -v npm_letsencrypt:/data -v $(pwd):/backup alpine tar czf /backup/npm_ssl_backup.tar.gz -C /data .

# Backup database
docker compose exec npm_db mysqldump -u npm -p npm > npm_db_backup.sql

# Backup .env file (store securely)
cp .env .env.backup
```

### Restore

```bash
# Restore NPM data
docker run --rm -v npm_data:/data -v $(pwd):/backup alpine tar xzf /backup/npm_data_backup.tar.gz -C /data
docker run --rm -v npm_letsencrypt:/data -v $(pwd):/backup alpine tar xzf /backup/npm_ssl_backup.tar.gz -C /data

# Restore database
docker compose exec -T npm_db mysql -u npm -p npm < npm_db_backup.sql

# Restart services
docker compose restart
```

## Performance Tuning

### Nginx Optimization

Current configuration includes:
- Worker processes: auto (matches CPU cores)
- Worker connections: 1024
- Keepalive connections: 32 per upstream
- Gzip compression: enabled for text/json/js
- Buffering: disabled for Streamlit (real-time updates)

### Resource Allocation

Default limits per service:
- **NPM**: 512MB RAM, 1.0 CPU
- **MariaDB**: 512MB RAM, 0.5 CPU
- **Nginx**: 256MB RAM, 0.5 CPU
- **Streamlit Apps**: 512MB RAM, 1.0 CPU each

Adjust in `docker-compose.yml` based on your server capacity.

## File Structure

```
infra/
├── docker-compose.yml      # Service definitions with security hardening
├── .env                    # Environment variables (DO NOT COMMIT)
├── .env.example           # Template for environment variables
├── setup.sh               # Automated setup script
├── README.md              # This file
└── nginx/
    └── nginx.conf         # Nginx configuration with WebSocket support

services/streamlit/
└── healthcheck.py         # Health check script for Streamlit apps
```

## Environment Variables

See `.env.example` for all available variables:

- `NPM_DB_ROOT_PASSWORD`: MariaDB root password (auto-generated)
- `NPM_DB_PASSWORD`: NPM database user password (auto-generated)
- `STREAMLIT_SERVER_PORT`: Default Streamlit port (8501)
- `STREAMLIT_SERVER_HEADLESS`: Run without browser (true)

## Additional Resources

- [Nginx Proxy Manager Documentation](https://nginxproxymanager.com/guide/)
- [Streamlit Deployment Guide](https://docs.streamlit.io/knowledge-base/deploy)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)

## Support

For issues or questions:
1. Check service logs: `docker compose logs [service]`
2. Verify health status: `docker compose ps`
3. Review this troubleshooting guide
4. Check Streamlit/NPM documentation
