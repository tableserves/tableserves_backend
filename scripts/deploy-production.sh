#!/bin/bash

# TableServe Production Deployment Script
# This script prepares and deploys the TableServe backend to production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="tableserve-backend"
NODE_VERSION="18"
PM2_APP_NAME="tableserve-api"

echo -e "${BLUE}🚀 TableServe Production Deployment Script${NC}"
echo "=============================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root"
    exit 1
fi

# Check Node.js version
check_node_version() {
    print_info "Checking Node.js version..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_CURRENT=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_CURRENT" -lt "$NODE_VERSION" ]; then
        print_error "Node.js version $NODE_VERSION or higher is required. Current: $(node -v)"
        exit 1
    fi
    
    print_status "Node.js version check passed: $(node -v)"
}

# Check if PM2 is installed
check_pm2() {
    print_info "Checking PM2..."
    
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 is not installed. Installing PM2..."
        npm install -g pm2
        print_status "PM2 installed successfully"
    else
        print_status "PM2 is already installed: $(pm2 -v)"
    fi
}

# Validate environment file
validate_environment() {
    print_info "Validating production environment..."
    
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file not found"
        print_info "Please create .env.production with all required variables"
        exit 1
    fi
    
    # Check for required environment variables
    required_vars=(
        "NODE_ENV"
        "PORT"
        "MONGODB_URI"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "CLOUDINARY_CLOUD_NAME"
        "CLOUDINARY_API_KEY"
        "CLOUDINARY_API_SECRET"
        "SMTP_USER"
        "SMTP_PASS"
        "FRONTEND_URL"
        "RAZORPAY_KEY_ID"
        "RAZORPAY_KEY_SECRET"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" .env.production; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables in .env.production:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    print_status "Environment validation passed"
}

# Install dependencies
install_dependencies() {
    print_info "Installing production dependencies..."
    
    # Clean install
    rm -rf node_modules package-lock.json
    npm ci --only=production
    
    print_status "Dependencies installed successfully"
}

# Run tests
run_tests() {
    print_info "Running tests..."
    
    # Install dev dependencies for testing
    npm install
    
    # Run tests
    if npm test; then
        print_status "All tests passed"
    else
        print_error "Tests failed. Deployment aborted."
        exit 1
    fi
    
    # Clean up dev dependencies
    npm ci --only=production
}

# Build application (if needed)
build_application() {
    print_info "Building application..."
    
    # Run any build scripts if they exist
    if npm run build 2>/dev/null; then
        print_status "Application built successfully"
    else
        print_info "No build script found, skipping build step"
    fi
}

# Setup PM2 ecosystem
setup_pm2_ecosystem() {
    print_info "Setting up PM2 ecosystem..."
    
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: 'production-server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    env_file: '.env.production',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '512M',
    node_args: '--max-old-space-size=512',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    max_restarts: 5,
    min_uptime: '10s',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
EOF
    
    print_status "PM2 ecosystem configuration created"
}

# Deploy with PM2
deploy_with_pm2() {
    print_info "Deploying with PM2..."
    
    # Stop existing application if running
    if pm2 list | grep -q "$PM2_APP_NAME"; then
        print_info "Stopping existing application..."
        pm2 stop "$PM2_APP_NAME"
        pm2 delete "$PM2_APP_NAME"
    fi
    
    # Start application
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup
    
    print_status "Application deployed successfully with PM2"
}

# Health check
health_check() {
    print_info "Performing health check..."
    
    # Wait for application to start
    sleep 10
    
    # Check if application is responding
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        print_status "Health check passed - application is running"
    else
        print_error "Health check failed - application may not be running properly"
        print_info "Check PM2 logs: pm2 logs $PM2_APP_NAME"
        exit 1
    fi
}

# Setup log rotation
setup_log_rotation() {
    print_info "Setting up log rotation..."
    
    # Create logrotate configuration
    sudo tee /etc/logrotate.d/tableserve > /dev/null << EOF
/home/$(whoami)/tableserve/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
    
    print_status "Log rotation configured"
}

# Main deployment process
main() {
    print_info "Starting production deployment..."
    
    # Pre-deployment checks
    check_node_version
    check_pm2
    validate_environment
    
    # Deployment steps
    install_dependencies
    
    # Optional: Run tests (uncomment if you want to run tests during deployment)
    # run_tests
    
    build_application
    setup_pm2_ecosystem
    deploy_with_pm2
    health_check
    setup_log_rotation
    
    print_status "🎉 Production deployment completed successfully!"
    print_info "Application is running at: http://localhost:8080"
    print_info "Health check: http://localhost:8080/health"
    print_info "PM2 status: pm2 status"
    print_info "PM2 logs: pm2 logs $PM2_APP_NAME"
    print_info "PM2 monitoring: pm2 monit"
}

# Run main function
main "$@"
