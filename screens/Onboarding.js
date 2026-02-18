import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  Bell,
  Camera,
  Search,
  UserPlus,
  Check,
  Flame,
} from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import { createGoal } from '../services/goals';
import { searchUsers, sendFriendRequest, uploadProfilePicture } from '../services/users';

const BRAND = '#FF6B35';
const BRAND_GLOW = 'rgba(255,107,53,0.15)';
const BRAND_BORDER = 'rgba(255,107,53,0.4)';

function getStreakText(days) {
  if (days === 1) return 'Every day';
  if (days === 7) return 'Once a week';
  return `Every ${days} days`;
}

export default function Onboarding({ navigation }) {
  const { user, profile, completeOnboarding, refreshProfile } = useAuth();

  const [step, setStep] = useState(0); // 0=welcome, 1=goal, 2=friends, 3=photo, 4=notifications
  const [loading, setLoading] = useState(false);

  // Goal step
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [streakInterval, setStreakInterval] = useState(1);
  const [goalPrivacy, setGoalPrivacy] = useState('friends');

  // Friends step
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [addedFriends, setAddedFriends] = useState(new Set());
  const [searching, setSearching] = useState(false);

  // Photo step
  const [photoUri, setPhotoUri] = useState(null);

  // Welcome splash
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeOpacity = useRef(new Animated.Value(0)).current;

  const finishOnboarding = () => {
    setShowWelcome(true);
    // Fade the overlay IN, then navigate while it's still fully opaque.
    // Feed will receive { fromOnboarding: true } and fade its own overlay out,
    // creating a seamless black → Feed fade with no glimpse of the step behind.
    Animated.timing(welcomeOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        completeOnboarding();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Feed', params: { fromOnboarding: true } }],
        });
      }, 1300);
    });
  };

  // Header skip → advance one step; last step skip → finish
  const handleHeaderSkip = () => {
    if (step < 4) {
      setStep(s => s + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  // ── Goal step ─────────────────────────────────────────────────────────────
  const handleCreateGoal = async () => {
    if (!goalTitle.trim()) {
      Alert.alert('Goal needed', 'Please enter a title for your goal');
      return;
    }
    setLoading(true);
    try {
      const { error } = await createGoal(user.id, {
        title: goalTitle.trim(),
        description: goalDescription.trim() || undefined,
        privacy: goalPrivacy,
        streakInterval,
      });
      if (error) throw error;
      setStep(2);
    } catch {
      Alert.alert('Error', 'Failed to create goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Friends step ──────────────────────────────────────────────────────────
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { users } = await searchUsers(query, user.id);
      setSearchResults(users || []);
    } catch {
      // silently fail search
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      await sendFriendRequest(user.id, friendId);
      setAddedFriends(prev => new Set([...prev, friendId]));
    } catch {
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  // ── Photo step ────────────────────────────────────────────────────────────
  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoUri) return;
    setLoading(true);
    try {
      await uploadProfilePicture(user.id, photoUri);
      await refreshProfile();
    } catch {
      // Non-blocking — user can update photo later in settings
    } finally {
      setLoading(false);
      setStep(4);
    }
  };

  // ── Notifications step ────────────────────────────────────────────────────
  const handleEnableNotifications = async () => {
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      // Proceed regardless
    }
    finishOnboarding();
  };

  // ── Step renderers ────────────────────────────────────────────────────────

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeIconRing}>
        <Text style={styles.welcomeEmoji}>🔥</Text>
      </View>
      <Text style={styles.welcomeTitle}>Welcome to streakd</Text>
      <Text style={styles.welcomeSubtitle}>
        Build habits that stick.{'\n'}Stay accountable. Celebrate your wins.
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(1)}>
        <Text style={styles.primaryButtonText}>Get started</Text>
        <ChevronRight color="#fff" size={18} />
      </TouchableOpacity>
      <TouchableOpacity onPress={finishOnboarding}>
        <Text style={styles.skipText}>Skip setup</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGoalStep = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollStepContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepEmoji}>🎯</Text>
        <Text style={styles.stepTitle}>Set your first goal</Text>
        <Text style={styles.stepSubtitle}>What habit do you want to build?</Text>

        {/* Title */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Goal title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Run 3x a week, Read daily…"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={goalTitle}
            onChangeText={setGoalTitle}
            maxLength={60}
            autoFocus
          />
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Description <Text style={styles.fieldOptional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What are you working towards?"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={goalDescription}
            onChangeText={setGoalDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Post frequency slider */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Post frequency</Text>
          <Text style={styles.sliderValue}>{getStreakText(streakInterval)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={7}
            step={1}
            value={streakInterval}
            onValueChange={setStreakInterval}
            minimumTrackTintColor={BRAND}
            maximumTrackTintColor="rgba(255,255,255,0.15)"
            thumbTintColor={BRAND}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>Every day</Text>
            <Text style={styles.sliderLabel}>Once a week</Text>
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Visibility</Text>
          <View style={styles.privacyRow}>
            {[
              { value: 'friends', label: 'Friends', desc: 'Friends can see this' },
              { value: 'private', label: 'Private', desc: 'Just you' },
            ].map(({ value, label, desc }) => (
              <TouchableOpacity
                key={value}
                style={[styles.privacyChip, goalPrivacy === value && styles.privacyChipActive]}
                onPress={() => setGoalPrivacy(value)}
              >
                <Text style={[styles.privacyChipText, goalPrivacy === value && styles.privacyChipTextActive]}>
                  {label}
                </Text>
                <Text style={[styles.privacyChipDesc, goalPrivacy === value && styles.privacyChipDescActive]}>
                  {desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (!goalTitle.trim() || loading) && styles.buttonDisabled]}
          onPress={handleCreateGoal}
          disabled={!goalTitle.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Create goal</Text>
              <ChevronRight color="#fff" size={18} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderFriendsStep = () => {
    const hasFriends = addedFriends.size > 0;
    return (
      <View style={[styles.stepContainer, { flex: 1 }]}>
        <Text style={styles.stepEmoji}>👥</Text>
        <Text style={styles.stepTitle}>Find your people</Text>
        <Text style={styles.stepSubtitle}>Accountability is better together</Text>

        <View style={styles.searchRow}>
          <Search color="rgba(255,255,255,0.4)" size={16} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username…"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator color={BRAND} size="small" />}
        </View>

        <ScrollView
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {searchResults.map(u => (
            <View key={u.id} style={styles.userRow}>
              <Image
                source={{
                  uri: u.profile_picture_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`,
                }}
                style={styles.userAvatar}
              />
              <Text style={styles.userUsername}>@{u.username}</Text>
              <TouchableOpacity
                style={[styles.addButton, addedFriends.has(u.id) && styles.addButtonAdded]}
                onPress={() => handleAddFriend(u.id)}
                disabled={addedFriends.has(u.id)}
              >
                {addedFriends.has(u.id) ? (
                  <Check color={BRAND} size={14} />
                ) : (
                  <UserPlus color="#fff" size={14} />
                )}
              </TouchableOpacity>
            </View>
          ))}
          {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
            <Text style={styles.noResults}>No users found</Text>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.primaryButton, !hasFriends && styles.buttonInactive]}
          onPress={() => setStep(3)}
          activeOpacity={hasFriends ? 0.8 : 1}
        >
          <Text style={[styles.primaryButtonText, !hasFriends && styles.primaryButtonTextInactive]}>
            {hasFriends ? `Continue — ${addedFriends.size} added` : 'Add a friend to continue'}
          </Text>
          {hasFriends && <ChevronRight color="#fff" size={18} />}
        </TouchableOpacity>
      </View>
    );
  };

  const renderPhotoStep = () => {
    const hasPhoto = !!photoUri;
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepEmoji}>📸</Text>
        <Text style={styles.stepTitle}>Add your photo</Text>
        <Text style={styles.stepSubtitle}>Put a face to your streaks</Text>

        <TouchableOpacity style={styles.avatarPicker} onPress={handlePickPhoto}>
          {hasPhoto ? (
            <Image source={{ uri: photoUri }} style={styles.avatarPreview} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Camera color="rgba(255,255,255,0.4)" size={36} />
              <Text style={styles.avatarPlaceholderText}>Tap to choose photo</Text>
            </View>
          )}
          <View style={[styles.avatarEditBadge, hasPhoto && styles.avatarEditBadgeActive]}>
            <Camera color="#fff" size={12} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, (!hasPhoto || loading) && styles.buttonInactive]}
          onPress={hasPhoto ? handleUploadPhoto : undefined}
          activeOpacity={hasPhoto ? 0.8 : 1}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={[styles.primaryButtonText, !hasPhoto && styles.primaryButtonTextInactive]}>
                {hasPhoto ? 'Set photo & continue' : 'Choose a photo to continue'}
              </Text>
              {hasPhoto && <ChevronRight color="#fff" size={18} />}
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderNotificationsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.notifIconRing}>
        <Bell color={BRAND} size={36} />
      </View>
      <Text style={styles.stepTitle}>Stay on track</Text>
      <Text style={styles.stepSubtitle}>
        Get reminders when it's time to post{'\n'}and see when friends react to your progress
      </Text>

      <View style={styles.notifBenefitList}>
        {[
          'Streak reminders so you never miss a day',
          'Friend request alerts',
          'Reactions on your posts',
        ].map(item => (
          <View key={item} style={styles.notifBenefitRow}>
            <View style={styles.notifBenefitDot} />
            <Text style={styles.notifBenefitText}>{item}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleEnableNotifications}>
        <Bell color="#fff" size={16} />
        <Text style={styles.primaryButtonText}>Enable notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={finishOnboarding}>
        <Text style={styles.skipText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );

  const stepRenderers = [
    renderWelcome,
    renderGoalStep,
    renderFriendsStep,
    renderPhotoStep,
    renderNotificationsStep,
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header: back + progress dots + skip */}
      {step > 0 && (
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ArrowLeft color="rgba(255,255,255,0.6)" size={20} />
          </TouchableOpacity>

          <View style={styles.progressDots}>
            {[1, 2, 3, 4].map(i => (
              <View
                key={i}
                style={[styles.progressDot, step >= i && styles.progressDotActive]}
              />
            ))}
          </View>

          {/* Skip advances one step (or finishes on last step) */}
          <TouchableOpacity onPress={handleHeaderSkip} style={styles.skipHeaderBtn}>
            <Text style={styles.skipHeaderText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        {stepRenderers[step]?.()}
      </View>

      {/* Welcome splash overlay — fades in/out when onboarding finishes */}
      {showWelcome && (
        <Animated.View style={[styles.welcomeOverlay, { opacity: welcomeOpacity }]}>
          <View style={styles.welcomeSplashIcon}>
            <Flame color={BRAND} size={48} fill={BRAND} />
          </View>
          <Text style={styles.welcomeSplashTitle}>Welcome to streakd</Text>
          <Text style={styles.welcomeSplashSub}>
            @{profile?.username || user?.username}, let's build some habits 🔥
          </Text>
        </Animated.View>
      )}
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
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressDotActive: {
    backgroundColor: BRAND,
    width: 24,
    borderRadius: 4,
  },
  skipHeaderBtn: {
    width: 40,
    alignItems: 'center',
  },
  skipHeaderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // ── Welcome step ──────────────────────────────────────────────────────────
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  welcomeIconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: BRAND_GLOW,
    borderWidth: 1,
    borderColor: BRAND_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  welcomeEmoji: {
    fontSize: 56,
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },

  // ── Numbered steps shared ─────────────────────────────────────────────────
  scrollStepContainer: {
    alignItems: 'center',
    gap: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  stepEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Goal form ─────────────────────────────────────────────────────────────
  fieldGroup: {
    width: '100%',
    gap: 8,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  fieldOptional: {
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '400',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 15,
    color: '#fff',
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sliderValue: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  sliderLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  privacyChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: 3,
  },
  privacyChipActive: {
    backgroundColor: BRAND_GLOW,
    borderColor: BRAND_BORDER,
  },
  privacyChipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
  privacyChipTextActive: {
    color: BRAND,
  },
  privacyChipDesc: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
  },
  privacyChipDescActive: {
    color: 'rgba(255,107,53,0.6)',
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 28,
    width: '100%',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  // Visually distinct from disabled — shows intent but not clickable
  buttonInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButtonTextInactive: {
    color: 'rgba(255,255,255,0.35)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 4,
  },

  // ── Friends step ──────────────────────────────────────────────────────────
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  resultsList: {
    width: '100%',
    maxHeight: 200,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  userUsername: {
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonAdded: {
    backgroundColor: BRAND_GLOW,
    borderWidth: 1,
    borderColor: BRAND_BORDER,
  },
  noResults: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // ── Photo step ────────────────────────────────────────────────────────────
  avatarPicker: {
    width: 140,
    height: 140,
    borderRadius: 70,
    position: 'relative',
    marginVertical: 8,
  },
  avatarPreview: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: BRAND,
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  avatarPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  avatarEditBadgeActive: {
    backgroundColor: BRAND,
  },

  // ── Notifications step ────────────────────────────────────────────────────
  notifIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: BRAND_GLOW,
    borderWidth: 1,
    borderColor: BRAND_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  notifBenefitList: {
    width: '100%',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 16,
    marginVertical: 4,
  },
  notifBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifBenefitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND,
    flexShrink: 0,
  },
  notifBenefitText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    flex: 1,
  },

  // ── Welcome splash overlay ─────────────────────────────────────────────────
  welcomeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 100,
  },
  welcomeSplashIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: BRAND_GLOW,
    borderWidth: 1,
    borderColor: BRAND_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  welcomeSplashTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  welcomeSplashSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    textAlign: 'center',
  },
});
