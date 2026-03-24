import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// TODO: Replace with your production Apple public key from RevenueCat dashboard
// (Project Settings > API Keys — starts with 'appl_')
const RC_PUBLIC_SDK_KEY = __DEV__
  ? 'test_EkghhGjfxyrfRexxAkNmvEynCXW'
  : 'test_EkghhGjfxyrfRexxAkNmvEynCXW'; // ← REPLACE this with your 'appl_...' production key

// Entitlement identifier — must match exactly what's set in RevenueCat dashboard
const STREAKD_PLUS_ENTITLEMENT = 'streakd+';
// Offering identifier — set to "default" in RevenueCat dashboard
const STREAKD_PLUS_OFFERING = 'default';

let initialized = false;

/**
 * Initialize RevenueCat with the current user's ID.
 * Call this once after the user logs in.
 */
export const initializePurchases = async (userId) => {
  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey: RC_PUBLIC_SDK_KEY, appUserID: userId });
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
  }
};

/**
 * Reset RevenueCat identity (call on sign out).
 */
export const resetPurchases = async () => {
  try {
    if (initialized) {
      await Purchases.logOut();
    }
  } catch (error) {
    // Ignore — user may not have been logged in
  }
};

/**
 * Returns true if the current user has an active streakd_plus entitlement.
 */
export const checkIsSubscribed = async () => {
  try {
    // Invalidate cache so we always get the current status from RevenueCat's servers,
    // not a locally cached value that may be stale after expiry.
    await Purchases.invalidateCustomerInfoCache();
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[STREAKD_PLUS_ENTITLEMENT] !== undefined;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};

/**
 * Extract subscription status from a CustomerInfo object without a network call.
 * Used internally by the update listener.
 */
export const isSubscribedFromCustomerInfo = (customerInfo) => {
  return customerInfo.entitlements.active[STREAKD_PLUS_ENTITLEMENT] !== undefined;
};

/**
 * Fetch the Streakd+ offering from RevenueCat.
 * Returns the offering object or null.
 */
export const getStreakdPlusOffering = async () => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.all[STREAKD_PLUS_OFFERING] ?? offerings.current ?? null;
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return null;
  }
};

/**
 * Purchase the monthly Streakd+ package.
 * Returns { success: true, customerInfo } or { success: false, error, userCancelled }.
 */
export const purchaseStreakdPlus = async (monthlyPackage) => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
    const isSubscribed = customerInfo.entitlements.active[STREAKD_PLUS_ENTITLEMENT] !== undefined;
    return { success: isSubscribed, customerInfo };
  } catch (error) {
    if (!error.userCancelled) {
      console.error('Purchase error:', error);
    }
    return { success: false, error, userCancelled: error.userCancelled };
  }
};

/**
 * Restore previous purchases (required for App Store guidelines).
 * Returns { success: true } if a subscription was restored.
 */
export const restorePurchases = async () => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isSubscribed = customerInfo.entitlements.active[STREAKD_PLUS_ENTITLEMENT] !== undefined;
    return { success: isSubscribed, customerInfo };
  } catch (error) {
    console.error('Restore error:', error);
    return { success: false, error };
  }
};
