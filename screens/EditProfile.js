import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { ArrowLeft, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import {
  updateUsername,
  checkUsernameAvailable,
  uploadProfilePicture,
} from '../services/users';

export default function EditProfile({ navigation }) {
  const { user, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [profileImage, setProfileImage] = useState(profile?.profile_picture_url || null);
  const [newImageUri, setNewImageUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const hasChanges = username !== profile?.username || newImageUri !== null;

  const handleUsernameChange = async (text) => {
    setUsername(text);
    setUsernameError('');

    if (text.trim() === profile?.username) {
      return;
    }

    if (text.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(text.trim())) {
      setUsernameError('Only letters, numbers, and underscores allowed');
      return;
    }

    // Check availability with debounce
    setCheckingUsername(true);
    const { available, error } = await checkUsernameAvailable(text.trim(), user.id);
    setCheckingUsername(false);

    if (!available && !error) {
      setUsernameError('Username is already taken');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setNewImageUri(result.assets[0].uri);
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    if (usernameError) {
      Alert.alert('Invalid Username', usernameError);
      return;
    }

    setSaving(true);

    try {
      // Upload new profile picture if changed
      if (newImageUri) {
        const { error: imageError } = await uploadProfilePicture(user.id, newImageUri);
        if (imageError) throw imageError;
      }

      // Update username if changed
      if (username.trim() !== profile?.username) {
        const { error: usernameError } = await updateUsername(user.id, username);
        if (usernameError) throw usernameError;
      }

      // Refresh profile to get updated data
      await refreshProfile();

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

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
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || saving || !!usernameError}
          style={[
            styles.saveButton,
            (!hasChanges || !!usernameError) && styles.saveButtonDisabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={[
              styles.saveButtonText,
              (!hasChanges || !!usernameError) && styles.saveButtonTextDisabled,
            ]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Profile Picture */}
          <View style={styles.imageSection}>
            <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
              <Image
                source={{
                  uri: profileImage ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`
                }}
                style={styles.profileImage}
              />
              <View style={styles.cameraOverlay}>
                <Camera color="#fff" size={24} />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Tap to change photo</Text>
          </View>

          {/* Username Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.atSymbol}>@</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="username"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
              {checkingUsername && (
                <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
              )}
            </View>
            {usernameError ? (
              <Text style={styles.errorText}>{usernameError}</Text>
            ) : (
              <Text style={styles.helperText}>
                Letters, numbers, and underscores only
              </Text>
            )}
          </View>

          {/* Email (read-only) */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <TextInput
                style={[styles.input, styles.inputTextDisabled]}
                value={profile?.email || ''}
                editable={false}
              />
            </View>
            <Text style={styles.helperText}>
              Email cannot be changed
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  saveButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  atSymbol: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    marginRight: 4,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 16,
  },
  inputTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
  helperText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
