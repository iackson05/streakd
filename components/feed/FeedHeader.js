import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { UserPlus, Settings, LogOut, Menu } from 'lucide-react-native';

export default function FeedHeader({ user, onRefresh, navigation }) {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = () => {
    setMenuVisible(false);
    // TODO: Implement logout logic
    console.log('Logging out...');
  };

  const handleSettingsPress = () => {
    setMenuVisible(false);
    navigation.navigate('Settings');
  };

  return (
    <View style={styles.header}>
      <View style={styles.content}>
        {/* Logo */}
        <TouchableOpacity onPress={onRefresh} style={styles.logoButton}>
          <View style={styles.logoBg}>
            <View style={styles.logoDot} />
          </View>
          <Text style={styles.logoText}>streakd</Text>
        </TouchableOpacity>

        {/* Right Actions */}
        <View style={styles.actions}>
          {/* Add Friends Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('AddFriends')}
            style={styles.actionButton}
          >
            <UserPlus color="rgba(255,255,255,0.7)" size={16} />
          </TouchableOpacity>

          {/* Menu Dropdown */}
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.actionButton}
          >
            <Menu color="rgba(255,255,255,0.7)" size={16} />
          </TouchableOpacity>

          {/* Profile Image */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileButton}
          >
            <Image
              source={{ 
                uri: user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" 
              }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              onPress={handleSettingsPress}
              style={styles.menuItem}
            >
              <Settings color="rgba(255,255,255,0.8)" size={16} />
              <Text style={styles.menuText}>Settings</Text>
            </TouchableOpacity>

            <View style={styles.menuSeparator} />

            <TouchableOpacity
              onPress={handleLogout}
              style={styles.menuItem}
            >
              <LogOut color="rgba(255,255,255,0.8)" size={16} />
              <Text style={styles.menuText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  content: {
    maxWidth: 512,
    marginHorizontal: 'auto',
    paddingHorizontal: 16,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    position: 'relative',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingRight: 16,
  },
  menuContainer: {
    width: 192,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },
});