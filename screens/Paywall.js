import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeftIcon, CheckIcon, InfinityIcon, ArchiveIcon, BellIcon } from 'phosphor-react-native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getStreakdPlusOffering, purchaseStreakdPlus, restorePurchases } from '../services/subscription';

const FEATURES = [
  {
    icon: InfinityIcon,
    title: 'Unlimited Goals',
    description: 'Create as many active goals as you want — no cap, ever.',
  },
  {
    icon: ArchiveIcon,
    title: 'Goal Archival',
    description: 'Complete a goal and keep all your posts and memories forever. Free accounts delete everything.',
  },
  {
    icon: CheckIcon,
    title: 'Show Off Your Journey',
    description: "Your archived goals live on your profile so friends can see how far you've come.",
  },
  {
    icon: BellIcon,
    title: 'Early Access to New Features',
    description: 'streakd+ subscribers get first access to everything we ship next.',
  },
];

export default function Paywall({ navigation }) {
  const { refreshSubscription } = useSubscription();
  const [offering, setOffering] = useState(null);
  const [loadingOffering, setLoadingOffering] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadOffering();
  }, []);

  const loadOffering = async () => {
    setLoadingOffering(true);
    try {
      const result = await getStreakdPlusOffering();
      setOffering(result);
    } catch (error) {
      console.error('Error loading offering:', error);
    } finally {
      setLoadingOffering(false);
    }
  };

  const monthlyPackage = offering?.availablePackages?.find(
    (p) => p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly'
  ) ?? offering?.availablePackages?.[0] ?? null;

  const priceString = monthlyPackage?.product?.priceString ?? null;

  const handleSubscribe = async () => {
    if (!monthlyPackage) {
      Alert.alert('Unavailable', 'Subscription packages could not be loaded. Please try again later.');
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchaseStreakdPlus(monthlyPackage);
      if (result.success) {
        await refreshSubscription();
        Alert.alert(
          'Welcome to streakd+! 🎉',
          'Your subscription is now active. Enjoy unlimited goals and goal archival.',
          [{ text: 'Let\'s Go!', onPress: () => navigation.goBack() }]
        );
      } else if (!result.userCancelled) {
        Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        await refreshSubscription();
        Alert.alert(
          'Subscription Restored',
          'Your streakd+ subscription has been restored.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active streakd+ subscription to restore.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeftIcon color="rgba(255,255,255,0.7)" size={20} />
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>streakd+</Text>
          </View>
          <Text style={styles.heroTitle}>Level up your{'\n'}accountability</Text>
          <Text style={styles.heroSubtitle}>
            Unlock unlimited goals, goal archival, and more — for less than a coffee a month.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <feature.icon color="#fff" size={18} weight="bold" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Comparison table */}
        <View style={styles.comparisonCard}>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel} />
            <Text style={styles.comparisonHeaderFree}>Free</Text>
            <Text style={styles.comparisonHeaderPlus}>streakd+</Text>
          </View>
          <View style={styles.divider} />
          <ComparisonRow label="Active Goals" free="2 max" plus="Unlimited" />
          <ComparisonRow label="Goal Archival" free="✗" plus="✓" plusHighlight />
          <ComparisonRow label="Post History" free="Lost on delete" plus="Preserved forever" plusHighlight />
          <ComparisonRow label="Streak Tracking" free="✓" plus="✓" />
          <ComparisonRow label="Friend Feed" free="✓" plus="✓" />
        </View>

        {/* Pricing + CTA */}
        <View style={styles.pricingSection}>
          {loadingOffering ? (
            <ActivityIndicator color="#fff" style={{ marginBottom: 16 }} />
          ) : priceString ? (
            <Text style={styles.price}>
              {priceString}
              <Text style={styles.pricePeriod}> / month</Text>
            </Text>
          ) : (
            <Text style={styles.price}>
              Monthly Subscription
            </Text>
          )}

          <TouchableOpacity
            style={[styles.subscribeButton, (purchasing || loadingOffering) && styles.subscribeButtonDisabled]}
            onPress={handleSubscribe}
            disabled={purchasing || loadingOffering}
          >
            {purchasing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.subscribeButtonText}>Subscribe to streakd+</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.legalText}>
            Subscription auto-renews monthly. Cancel anytime in your App Store account settings.
            Payment will be charged to your Apple ID account at confirmation of purchase.
            {' '}
          </Text>
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('LegalText', { type: 'terms' })}>
              <Text style={styles.legalLinkText}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>|</Text>
            <TouchableOpacity onPress={() => navigation.navigate('LegalText', { type: 'privacy' })}>
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ComparisonRow({ label, free, plus, plusHighlight }) {
  return (
    <View style={styles.comparisonRow}>
      <Text style={styles.comparisonLabel}>{label}</Text>
      <Text style={styles.comparisonFreeValue}>{free}</Text>
      <Text style={[styles.comparisonPlusValue, plusHighlight && styles.comparisonPlusHighlight]}>
        {plus}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  badgeContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 20,
  },
  badgeText: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    paddingHorizontal: 24,
    gap: 20,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 19,
  },
  comparisonCard: {
    marginHorizontal: 24,
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    marginBottom: 32,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  comparisonLabel: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  comparisonHeaderFree: {
    width: 90,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  comparisonHeaderPlus: {
    width: 90,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  comparisonFreeValue: {
    width: 90,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
  },
  comparisonPlusValue: {
    width: 90,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
  },
  comparisonPlusHighlight: {
    color: '#fff',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 4,
  },
  pricingSection: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  price: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  pricePeriod: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '400',
  },
  subscribeButton: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: 10,
    marginBottom: 16,
  },
  restoreText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  legalText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  legalLinkText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
  },
});
