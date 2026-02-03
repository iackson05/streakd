import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { ArrowLeft, Bell, BellOff } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import {
  updateNotificationSettings,
  getNotificationSettings,
} from '../services/users';

export default function NotificationsSettings({ navigation }) {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemPermission, setSystemPermission] = useState(null);

  useEffect(() => {
    loadSettings();
    checkSystemPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const { enabled } = await getNotificationSettings(user.id);
      setNotificationsEnabled(enabled);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSystemPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setSystemPermission(status);
  };

  const handleToggle = async (value) => {
    // Check system permissions first
    if (value && systemPermission !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Push notifications are disabled in your device settings. Would you like to enable them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return;
    }

    setSaving(true);
    setNotificationsEnabled(value);

    try {
      const { error } = await updateNotificationSettings(user.id, value);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      setNotificationsEnabled(!value); // Revert on error
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  const openSystemSettings = () => {
    Linking.openSettings();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color="rgba(255,255,255,0.7)" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* System Permission Warning */}
        {systemPermission !== 'granted' && (
          <TouchableOpacity
            style={styles.warningCard}
            onPress={openSystemSettings}
          >
            <View style={styles.warningIcon}>
              <BellOff color="#ff6b6b" size={20} />
            </View>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Notifications Disabled</Text>
              <Text style={styles.warningText}>
                Tap to open settings and enable notifications for Streakd
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Push Notifications Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PUSH NOTIFICATIONS</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Bell color="rgba(255,255,255,0.6)" size={16} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Enable Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive reminders to post and friend updates
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggle}
                trackColor={{
                  false: 'rgba(255,255,255,0.1)',
                  true: 'rgba(255,255,255,0.4)',
                }}
                thumbColor={notificationsEnabled ? '#fff' : 'rgba(255,255,255,0.5)'}
                disabled={saving}
              />
            </View>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Notifications</Text>
          <Text style={styles.infoText}>
            When enabled, you'll receive reminders based on your goal schedules to help you stay on track. You'll also get notified when friends send you requests or react to your posts.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '500',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 24,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,107,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  warningText: {
    color: 'rgba(255,107,107,0.8)',
    fontSize: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  infoText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    lineHeight: 20,
  },
});
