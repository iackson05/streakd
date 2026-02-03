import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import {
  ArrowLeft,
  User,
  Bell,
  Lock,
  Moon,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  LogOut,
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

export default function Settings({ navigation }) {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Type DELETE to confirm',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I Understand',
                  style: 'destructive',
                  onPress: async () => {
                    // Note: Full account deletion would require a server-side function
                    // For now, sign out and show a message
                    Alert.alert(
                      'Contact Support',
                      'To delete your account, please contact support@streakd.app'
                    );
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleSettingPress = (label) => {
    switch (label) {
      case 'Edit Profile':
        navigation.navigate('EditProfile');
        break;
      case 'Notifications':
        navigation.navigate('NotificationsSettings');
        break;
      case 'Privacy':
        Alert.alert(
          'Privacy',
          'Your data is stored securely and never shared with third parties without your consent.',
          [{ text: 'OK' }]
        );
        break;
      case 'Appearance':
        Alert.alert(
          'Appearance',
          'Dark mode is currently the only theme. More themes coming soon!',
          [{ text: 'OK' }]
        );
        break;
      case 'Help Center':
        Linking.openURL('https://streakd.app/help');
        break;
      case 'Send Feedback':
        Linking.openURL('mailto:feedback@streakd.app?subject=Streakd%20Feedback');
        break;
      default:
        console.log('Pressed:', label);
    }
  };

  const SETTINGS_SECTIONS = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Edit Profile', description: 'Update your info' },
        { icon: Bell, label: 'Notifications', description: 'Manage alerts' },
        { icon: Lock, label: 'Privacy', description: 'Control your data' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: Moon, label: 'Appearance', description: 'Dark mode settings' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', description: 'Get assistance' },
        { icon: MessageSquare, label: 'Send Feedback', description: 'Share your thoughts' },
      ],
    },
  ];

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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                const isLast = itemIndex === section.items.length - 1;

                return (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => handleSettingPress(item.label)}
                    style={[
                      styles.settingItem,
                      !isLast && styles.settingItemBorder,
                    ]}
                  >
                    <View style={styles.settingIcon}>
                      <Icon color="rgba(255,255,255,0.6)" size={16} />
                    </View>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      <Text style={styles.settingDescription}>
                        {item.description}
                      </Text>
                    </View>
                    <ChevronRight color="rgba(255,255,255,0.3)" size={16} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DANGER ZONE</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              onPress={handleDeleteAccount}
              style={styles.settingItem}
            >
              <View style={[styles.settingIcon, styles.dangerIcon]}>
                <Trash2 color="#ff6b6b" size={16} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, styles.dangerLabel]}>
                  Delete Account
                </Text>
                <Text style={styles.settingDescription}>
                  Permanently delete your account
                </Text>
              </View>
              <ChevronRight color="rgba(255,107,107,0.5)" size={16} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut color="rgba(255,255,255,0.6)" size={16} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>streakd v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
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
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 32,
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
  sectionCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
  dangerIcon: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderColor: 'rgba(255,107,107,0.2)',
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
  dangerLabel: {
    color: '#ff6b6b',
  },
  settingDescription: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  logoutText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  version: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    textAlign: 'center',
    paddingTop: 16,
  },
});
