## DevOps Guidelines

### Development Environment Setup

#### Environment Requirements
- Operating system version
- Runtime version (Node.js/Python/Java, etc.)
- Database version
- Other dependency tools

#### Installation Steps
1. Clone code repository
2. Install dependencies
3. Configure environment variables
4. Initialize database
5. Start services

#### Development Tool Configuration
- IDE/editor recommended settings
- Code formatting tools (Prettier/ESLint)
- Git hooks configuration
- Debug configuration

#### Environment Variables
- Use `.env` file for management
- Provide `.env.example` template
- Distinguish dev/test/production environments
- Don't commit sensitive info to repository

### CI/CD Configuration

#### Continuous Integration (CI)
- **Code Checks**
  - Lint checks
  - Type checks
  - Code format checks

- **Automated Testing**
  - Unit tests
  - Integration tests
  - E2E tests
  - Test coverage checks

- **Code Quality**
  - SonarQube analysis
  - Code complexity checks
  - Security vulnerability scanning

- **Build Process**
  - Dependency installation
  - Compile/package
  - Generate build artifacts
  - Build cache optimization

#### Continuous Deployment (CD)
- **Deployment Strategies**
  - Blue-green deployment
  - Canary release
  - Rolling updates
  - Rollback mechanism

- **Deployment Environments**
  - Development: auto-deploy
  - Testing: auto-deploy
  - Staging: manual approval
  - Production: manual approval + release window

- **Deployment Steps**
  - Build Docker image
  - Push to image registry
  - Update service configuration
  - Health checks
  - Notify stakeholders

#### Notification System
- Build failure notifications
- Deployment status notifications
- Test failure notifications
- Use Slack/DingTalk/WeChat Work, etc.

### Docker Configuration

#### Dockerfile
```dockerfile
# Use official base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy code
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js

# Start command
CMD ["node", "dist/index.js"]
```

#### docker-compose.yml
- Service definitions
- Dependencies
- Environment variables
- Volume mounts
- Network configuration
- Port mapping

#### Best Practices
- Use multi-stage builds to reduce image size
- Use cache layers properly
- Don't include sensitive info in images
- Use .dockerignore to exclude files
- Image tag management

### Monitoring and Logging

#### Application Monitoring
- Service health checks
- Performance metrics (CPU/memory/disk)
- Business metrics
- Error rates and response times

#### Log Management
- Unified log format (JSON)
- Log levels (DEBUG/INFO/WARN/ERROR)
- Log collection and aggregation
- Log query and analysis
- Log retention policy

#### Alerting System
- Threshold alerts
- Anomaly alerts
- Alert severity levels
- Alert aggregation

### Deployment Instructions

#### Build Commands
```bash
npm run build
npm run test
npm run docker:build
```

#### Deployment Steps
1. Backup existing data and config
2. Pull latest code
3. Install/update dependencies
4. Execute database migrations
5. Build application
6. Start services
7. Verify deployment
8. Monitor running status

#### Rollback Plan
- Keep previous version image/code
- Quick rollback commands
- Data rollback strategy
- Rollback verification

### Common Issues
- Environment variable configuration errors
- Port conflicts
- Database connection issues
- Permission issues
- Resource insufficiency

