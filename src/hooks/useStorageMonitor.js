/**
 * Storage Monitor Hook
 * Monitors localStorage usage and automatically performs cleanup when needed
 */

import { useEffect, useState } from 'react';
import StorageCleanup from '../utils/storageCleanup';

const useStorageMonitor = () => {
  const [storageUsage, setStorageUsage] = useState(null);
  const [cleanupStatus, setCleanupStatus] = useState(null);

  // Check storage usage
  const checkStorageUsage = () => {
    try {
      const usage = StorageCleanup.getStorageUsage();
      setStorageUsage(usage);
      
      // Auto-cleanup if usage is high (over 8MB)
      if (usage.totalSize > 8 * 1024 * 1024) {
        console.log('High storage usage detected, performing cleanup...');
        performCleanup();
      }
      
      return usage;
    } catch (error) {
      console.error('Error checking storage usage:', error);
      return null;
    }
  };

  // Perform cleanup
  const performCleanup = async () => {
    try {
      setCleanupStatus('cleaning');
      const result = StorageCleanup.performFullCleanup();
      setCleanupStatus('success');
      
      // Update storage usage after cleanup
      setTimeout(() => {
        checkStorageUsage();
        setCleanupStatus(null);
      }, 1000);
      
      return result;
    } catch (error) {
      console.error('Cleanup failed:', error);
      setCleanupStatus('error');
      setTimeout(() => setCleanupStatus(null), 3000);
      return null;
    }
  };

  // Emergency cleanup
  const performEmergencyCleanup = async () => {
    try {
      setCleanupStatus('emergency');
      const result = StorageCleanup.emergencyCleanup();
      setCleanupStatus('success');
      
      setTimeout(() => {
        checkStorageUsage();
        setCleanupStatus(null);
      }, 1000);
      
      return result;
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      setCleanupStatus('error');
      setTimeout(() => setCleanupStatus(null), 3000);
      return null;
    }
  };

  // Monitor storage on mount and set up periodic checks
  useEffect(() => {
    // Initial check
    checkStorageUsage();
    
    // Periodic check every 5 minutes
    const interval = setInterval(() => {
      checkStorageUsage();
    }, 5 * 60 * 1000);
    
    // Listen for storage events
    const handleStorageEvent = () => {
      setTimeout(checkStorageUsage, 100);
    };
    
    window.addEventListener('storage', handleStorageEvent);
    
    // Handle quota exceeded errors globally
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      try {
        originalSetItem.call(this, key, value);
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          console.warn('Quota exceeded, triggering emergency cleanup...');
          performEmergencyCleanup();
          
          // Try again after cleanup
          setTimeout(() => {
            try {
              originalSetItem.call(this, key, value);
            } catch (retryError) {
              console.error('Still unable to store after emergency cleanup:', retryError);
            }
          }, 1000);
        } else {
          throw error;
        }
      }
    };
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageEvent);
      localStorage.setItem = originalSetItem; // Restore original method
    };
  }, []);

  return {
    storageUsage,
    cleanupStatus,
    checkStorageUsage,
    performCleanup,
    performEmergencyCleanup,
    isHighUsage: storageUsage && storageUsage.totalSize > 8 * 1024 * 1024,
    isCriticalUsage: storageUsage && storageUsage.totalSize > 9 * 1024 * 1024
  };
};

export default useStorageMonitor;