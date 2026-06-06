const cluster = require('cluster');
const os = require('os');
const { logger } = require('../utils/logger');

class ClusterManager {
  constructor(options = {}) {
    this.workers = new Map();
    this.options = {
      workers: options.workers || Math.min(os.cpus().length, 4), // Limit to 4 workers max
      respawnDelay: options.respawnDelay || 1000,
      maxRestarts: options.maxRestarts || 5,
      gracefulShutdownTimeout: options.gracefulShutdownTimeout || 30000,
      healthCheckInterval: options.healthCheckInterval || 30000,
      ...options
    };
    
    this.shutdownInitiated = false;
    this.stats = {
      startTime: Date.now(),
      restarts: 0,
      requests: 0,
      errors: 0
    };
  }

  start() {
    if (cluster.isMaster) {
      this.startMaster();
    } else {
      this.startWorker();
    }
  }

  startMaster() {
    logger.info(`Master process ${process.pid} starting with ${this.options.workers} workers`);
    
    // Set up master process
    process.title = 'tableserve-master';
    
    // Fork workers
    for (let i = 0; i < this.options.workers; i++) {
      this.forkWorker();
    }
    
    // Set up cluster event handlers
    this.setupClusterEventHandlers();
    
    // Set up graceful shutdown
    this.setupGracefulShutdown();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    logger.info(`Cluster started with ${this.options.workers} workers`);
  }

  forkWorker() {
    const worker = cluster.fork();
    const workerId = worker.id;
    
    this.workers.set(workerId, {
      worker,
      startTime: Date.now(),
      restarts: 0,
      requests: 0,
      memory: 0,
      cpu: 0,
      status: 'starting'
    });
    
    logger.info(`Worker ${workerId} (PID: ${worker.process.pid}) starting`);
    
    // Set up worker message handlers
    worker.on('message', (message) => {
      this.handleWorkerMessage(workerId, message);
    });
    
    return worker;
  }

  setupClusterEventHandlers() {
    cluster.on('online', (worker) => {
      const workerInfo = this.workers.get(worker.id);
      if (workerInfo) {
        workerInfo.status = 'online';
      }
      logger.info(`Worker ${worker.id} is online`);
    });

    cluster.on('listening', (worker, address) => {
      const workerInfo = this.workers.get(worker.id);
      if (workerInfo) {
        workerInfo.status = 'listening';
      }
      logger.info(`Worker ${worker.id} listening on ${address.address}:${address.port}`);
    });

    cluster.on('disconnect', (worker) => {
      logger.warn(`Worker ${worker.id} disconnected`);
    });

    cluster.on('exit', (worker, code, signal) => {
      const workerInfo = this.workers.get(worker.id);
      
      logger.warn(`Worker ${worker.id} died`, {
        code,
        signal,
        restarts: workerInfo?.restarts || 0
      });
      
      this.workers.delete(worker.id);
      
      if (!this.shutdownInitiated) {
        this.respawnWorker(worker.id, workerInfo);
      }
    });
  }

  respawnWorker(workerId, oldWorkerInfo = {}) {
    const restarts = (oldWorkerInfo.restarts || 0) + 1;
    
    if (restarts > this.options.maxRestarts) {
      logger.error(`Worker ${workerId} exceeded max restarts (${this.options.maxRestarts})`);
      return;
    }
    
    this.stats.restarts++;
    
    setTimeout(() => {
      if (!this.shutdownInitiated) {
        logger.info(`Respawning worker ${workerId} (restart #${restarts})`);
        const newWorker = this.forkWorker();
        const workerInfo = this.workers.get(newWorker.id);
        if (workerInfo) {
          workerInfo.restarts = restarts;
        }
      }
    }, this.options.respawnDelay);
  }

  handleWorkerMessage(workerId, message) {
    const workerInfo = this.workers.get(workerId);
    
    switch (message.type) {
      case 'stats':
        if (workerInfo) {
          workerInfo.requests = message.data.requests;
          workerInfo.memory = message.data.memory;
          workerInfo.cpu = message.data.cpu;
        }
        break;
        
      case 'health':
        if (workerInfo) {
          workerInfo.status = message.data.status;
          workerInfo.lastHealthCheck = Date.now();
        }
        break;
        
      case 'error':
        this.stats.errors++;
        logger.error(`Worker ${workerId} error`, message.data);
        break;
        
      case 'request':
        this.stats.requests++;
        break;
    }
  }

  startHealthMonitoring() {
    setInterval(() => {
      this.checkWorkerHealth();
      this.logClusterStats();
    }, this.options.healthCheckInterval);
  }

  checkWorkerHealth() {
    const now = Date.now();
    const unhealthyWorkers = [];
    
    for (const [workerId, workerInfo] of this.workers) {
      const { worker, lastHealthCheck, status } = workerInfo;
      
      // Check if worker is responsive
      if (lastHealthCheck && (now - lastHealthCheck) > this.options.healthCheckInterval * 2) {
        unhealthyWorkers.push(workerId);
        logger.warn(`Worker ${workerId} appears unresponsive`);
      }
      
      // Request health status
      if (worker && !worker.isDead()) {
        worker.send({ type: 'health-check' });
      }
    }
    
    // Restart unhealthy workers
    unhealthyWorkers.forEach(workerId => {
      const workerInfo = this.workers.get(workerId);
      if (workerInfo && workerInfo.worker) {
        logger.warn(`Restarting unresponsive worker ${workerId}`);
        workerInfo.worker.kill('SIGTERM');
      }
    });
  }

  logClusterStats() {
    const workers = Array.from(this.workers.values());
    const totalRequests = workers.reduce((sum, w) => sum + (w.requests || 0), 0);
    const avgMemory = workers.length > 0 
      ? workers.reduce((sum, w) => sum + (w.memory || 0), 0) / workers.length 
      : 0;
    
    logger.info('Cluster statistics', {
      workers: workers.length,
      totalRequests,
      avgMemoryMB: Math.round(avgMemory / 1024 / 1024),
      uptime: Math.round((Date.now() - this.stats.startTime) / 1000),
      restarts: this.stats.restarts,
      errors: this.stats.errors
    });
  }

  setupGracefulShutdown() {
    const shutdown = (signal) => {
      if (this.shutdownInitiated) return;
      
      this.shutdownInitiated = true;
      logger.info(`Master received ${signal}, initiating graceful shutdown`);
      
      const workers = Array.from(this.workers.values());
      const shutdownPromises = workers.map(({ worker }) => {
        return new Promise((resolve) => {
          if (worker.isDead()) {
            resolve();
            return;
          }
          
          // Send shutdown signal to worker
          worker.send({ type: 'shutdown' });
          
          // Force kill if not shutdown gracefully
          const timeout = setTimeout(() => {
            logger.warn(`Force killing worker ${worker.id}`);
            worker.kill('SIGKILL');
            resolve();
          }, this.options.gracefulShutdownTimeout);
          
          worker.on('disconnect', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      });
      
      Promise.all(shutdownPromises).then(() => {
        logger.info('All workers shutdown, exiting master');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  startWorker() {
    // Set worker process title
    process.title = `tableserve-worker-${cluster.worker.id}`;
    
    // Load and start the main server
    const { startServer } = require('../server');
    
    // Set up worker message handlers
    process.on('message', (message) => {
      this.handleMasterMessage(message);
    });
    
    // Set up worker stats reporting
    this.setupWorkerStatsReporting();
    
    // Set up worker error handling
    this.setupWorkerErrorHandling();
    
    // Start the server
    startServer().then((server) => {
      logger.info(`Worker ${cluster.worker.id} started successfully`);
      
      // Report worker is ready
      process.send({
        type: 'health',
        data: { status: 'ready', pid: process.pid }
      });
      
    }).catch((error) => {
      logger.error(`Worker ${cluster.worker.id} failed to start`, error);
      process.exit(1);
    });
  }

  handleMasterMessage(message) {
    switch (message.type) {
      case 'health-check':
        process.send({
          type: 'health',
          data: {
            status: 'healthy',
            memory: process.memoryUsage().rss,
            uptime: process.uptime()
          }
        });
        break;
        
      case 'shutdown':
        logger.info(`Worker ${cluster.worker.id} received shutdown signal`);
        this.gracefulWorkerShutdown();
        break;
    }
  }

  setupWorkerStatsReporting() {
    let requestCount = 0;
    
    // Monkey patch HTTP server to count requests
    const http = require('http');
    const originalListen = http.Server.prototype.listen;
    
    http.Server.prototype.listen = function(...args) {
      this.on('request', () => {
        requestCount++;
        
        // Report request to master
        if (process.send) {
          process.send({ type: 'request' });
        }
      });
      
      return originalListen.apply(this, args);
    };
    
    // Report stats periodically
    setInterval(() => {
      if (process.send) {
        process.send({
          type: 'stats',
          data: {
            requests: requestCount,
            memory: process.memoryUsage().rss,
            cpu: process.cpuUsage(),
            uptime: process.uptime()
          }
        });
      }
    }, 10000); // Every 10 seconds
  }

  setupWorkerErrorHandling() {
    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught exception in worker ${cluster.worker.id}`, error);
      
      if (process.send) {
        process.send({
          type: 'error',
          data: {
            type: 'uncaughtException',
            message: error.message,
            stack: error.stack
          }
        });
      }
      
      // Graceful shutdown after uncaught exception
      setTimeout(() => process.exit(1), 1000);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled rejection in worker ${cluster.worker.id}`, reason);
      
      if (process.send) {
        process.send({
          type: 'error',
          data: {
            type: 'unhandledRejection',
            reason: reason?.toString(),
            promise: promise?.toString()
          }
        });
      }
    });
  }

  gracefulWorkerShutdown() {
    // Implement graceful shutdown for worker
    // Close server, database connections, etc.
    setTimeout(() => {
      process.disconnect();
      process.exit(0);
    }, 5000);
  }

  getStats() {
    return {
      ...this.stats,
      workers: Array.from(this.workers.entries()).map(([id, info]) => ({
        id,
        pid: info.worker.process.pid,
        status: info.status,
        requests: info.requests || 0,
        memory: info.memory || 0,
        restarts: info.restarts || 0,
        uptime: Date.now() - info.startTime
      }))
    };
  }
}

module.exports = ClusterManager;