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
import { ArrowLeft, BellOff, Flame, Heart, Users } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import {
  updateNotificationSettings,
  getNotificationSettings,
} from '../services/users';

const TOGGLE_ROWS = [
  {
    key: 'streak_reminders',
    label: 'Streak Reminders',
    description: 'Reminders to post your streak updates on time',
    Icon: Flame,
    iconColor: '#FF6B35',
    iconBg: 'rgba(255,107,53,0.15)',
  },
  {
    key: 'reactions',
    label: 'Reactions',
    description: 'When friends react to your posts',
    Icon: Heart,
    iconColor: '#FF4757',
    iconBg: 'rgba(255,71,87,0.15)',
  },
  {
    key: 'friend_requests',
    label: 'Friend Requests',
    description: 'When someone sends you a friend request',
    Icon: Users,
    iconColor: '#5B8DEF',
    iconBg: 'rgba(91,141,239,0.15)',
  },
];

export default function NotificationsSettings({ navigation }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    streak_reminders: false,
    reactions: false,
    friend_requests: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // key of the toggle currently saving
  const [systemPermission, setSystemPermission] = useState(null);

  useEffect(() => {
    loadSettings();
    checkSystemPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const { streak_reminders, reactions, friend_requests } = await getNotificationSettings();
      setSettings({ streak_reminders, reactions, friend_requests });
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

  const handleToggle = async (key, value) => {
    if (value && systemPermission !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Push notifications are disabled in your device settings. Would you like to enable them?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const prev = settings;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(key);

    try {
      const { error } = await updateNotificationSettings(newSettings);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      setSettings(prev); // revert
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setSaving(null);
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

        {/* Individual Toggles */}
        <Text style={styles.sectionTitle}>PUSH NOTIFICATIONS</Text>
        <View style={styles.settingCard}>
          {TOGGLE_ROWS.map(({ key, label, description, Icon, iconColor, iconBg }, index) => {
            const isLast = index === TOGGLE_ROWS.length - 1;
            const value = settings[key];
            const isSaving = saving === key;

            return (
              <View key={key}>
                <View style={styles.settingRow}>
                  <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
                    <Icon color={iconColor} size={16} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{label}</Text>
                    <Text style={styles.settingDescription}>{description}</Text>
                  </View>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" style={styles.switchLoader} />
                  ) : (
                    <Switch
                      value={value}
                      onValueChange={(v) => handleToggle(key, v)}
                      trackColor={{
                        false: 'rgba(255,255,255,0.1)',
                        true: 'rgba(255,107,53,0.5)',
                      }}
                      thumbColor={value ? '#FF6B35' : 'rgba(255,255,255,0.5)'}
                      disabled={saving !== null}
                    />
                  )}
                </View>
                {!isLast && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        <Text style={styles.footerNote}>
          Individual toggles let you choose exactly what you hear about. Streak reminders help you maintain your goals by posting on time.
        </Text>
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
    paddingTop: 28,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
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
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
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
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    lineHeight: 17,
  },
  switchLoader: {
    width: 51, // match Switch width so layout doesn't shift
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
  },
  footerNote: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 4,
  },
});
