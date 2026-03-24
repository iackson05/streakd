import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import Purchases from 'react-native-purchases';
import { useAuth } from './AuthContext';
import { initializePurchases, checkIsSubscribed, resetPurchases, isSubscribedFromCustomerInfo } from '../services/subscription';
import { apiPut } from '../services/api';

const SubscriptionContext = createContext({});

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const listenerRef = useRef(null);

  useEffect(() => {
    if (user) {
      setupAndCheck();
    } else {
      // User signed out — clean up listener and reset state
      if (listenerRef.current) {
        listenerRef.current.remove();
        listenerRef.current = null;
      }
      resetPurchases();
      setIsSubscribed(false);
      setSubscriptionLoading(false);
    }

    return () => {
      if (listenerRef.current) {
        listenerRef.current.remove();
        listenerRef.current = null;
      }
    };
  }, [user]);

  const syncToBackend = async (subscribed) => {
    try {
      await apiPut('/users/subscription-status', { is_subscribed: subscribed });
    } catch (error) {
      console.error('Failed to sync subscription status to backend:', error);
    }
  };

  const setupAndCheck = async () => {
    setSubscriptionLoading(true);
    try {
      await initializePurchases(user.id);

      // Listen for real-time updates (catches expiry, renewals, and cancellations
      // while the app is open — no relaunch required).
      listenerRef.current = Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        const subscribed = isSubscribedFromCustomerInfo(customerInfo);
        setIsSubscribed(subscribed);
        syncToBackend(subscribed);
      });

      const subscribed = await checkIsSubscribed();
      setIsSubscribed(subscribed);
      await syncToBackend(subscribed);
    } catch (error) {
      console.error('Subscription setup error:', error);
      setIsSubscribed(false);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Call this after a successful purchase or restore
  const refreshSubscription = useCallback(async () => {
    try {
      const subscribed = await checkIsSubscribed();
      setIsSubscribed(subscribed);
      await apiPut('/users/subscription-status', { is_subscribed: subscribed });
      return subscribed;
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      return false;
    }
  }, []);

  return (
    <SubscriptionContext.Provider value={{ isSubscribed, subscriptionLoading, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};
