import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { Users, Plus, X, Flame } from 'lucide-react-native';
import PostCard from '../components/feed/PostCard';
import { useAuth } from '../contexts/AuthContext';
import { getFeedPosts, getUserReactionsForPosts } from '../services/posts';
import { getUserActiveGoals } from '../services/goals';

export default function Feed({ navigation, route }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [userReactions, setUserReactions] = useState({});
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGoalSelector, setShowGoalSelector] = useState(false);
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(
    route?.params?.fromOnboarding === true
  );
  const welcomeOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (route?.params?.fromOnboarding) {
      const timer = setTimeout(() => {
        Animated.timing(welcomeOpacity, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }).start(() => setShowWelcomeOverlay(false));
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadPosts();
    }
  }, [user]);

  const loadPosts = async () => {
    try {
      const { posts: feedPosts, error } = await getFeedPosts(user.id);

      if (error) throw error;

      console.log('✅ Loaded posts:', feedPosts?.length || 0);

      // Batch fetch user reactions for all posts
      if (feedPosts && feedPosts.length > 0) {
        const postIds = feedPosts.map(p => p.id);
        const { reactions } = await getUserReactionsForPosts(user.id, postIds);
        setUserReactions(reactions);
      }

      setPosts(feedPosts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
      setRefreshing(false);
    }
  };

  const loadGoals = async () => {
    setLoadingGoals(true);
    try {
      const { goals: activeGoals, error } = await getUserActiveGoals(user.id);

      if (error) throw error;

      if (!activeGoals || activeGoals.length === 0) {
        Alert.alert(
          'No Goals',
          'You need to create a goal before posting',
          [{ text: 'OK' }]
        );
        return;
      }

      setGoals(activeGoals);
      setShowGoalSelector(true);
    } catch (error) {
      console.error('Error loading goals:', error);
      Alert.alert('Error', 'Failed to load your goals');
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleAddPost = () => {
    loadGoals();
  };

  const handleGoalSelect = (goal) => {
    setShowGoalSelector(false);
    navigation.navigate('CreatePost', { goalId: goal.id });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  if (authLoading) {
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
        <TouchableOpacity style={styles.logoButton}>
          <View style={styles.logoIconRing}>
            <Flame color="#FF6B35" size={14} fill="#FF6B35" />
          </View>
          <Text style={styles.logoText}>streakd</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={handleAddPost}
            style={styles.headerButton}
            disabled={loadingGoals}
          >
            {loadingGoals ? (
              <ActivityIndicator color="rgba(255,255,255,0.7)" size="small" />
            ) : (
              <Plus color="rgba(255,255,255,0.7)" size={20} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Friends')}
            style={styles.headerButton}
          >
            <Users color="rgba(255,255,255,0.7)" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
          >
            <Image
              source={{ 
                uri: profile?.profile_picture_url || 
                     `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'default'}`
              }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      >
        {/* Feed Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Your Feed</Text>
          <Text style={styles.subtitle}>
            See what your friends are working on
          </Text>
        </View>

        {/* Loading Posts */}
        {loadingPosts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconRing}>
              <Flame color="#FF6B35" size={32} fill="#FF6B35" />
            </View>
            <Text style={styles.emptyText}>Your feed is quiet</Text>
            <Text style={styles.emptySubtext}>
              Add friends and post your first streak update to get things going
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddFriends')}
            >
              <Users color="#FF6B35" size={16} />
              <Text style={styles.emptyButtonText}>Find friends</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Posts */
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                id: post.id,
                user_id: post.user_id,
                username: post.username || 'Unknown',
                profile_picture_url: post.profile_picture_url,
                goal: post.goal_title || 'Goal',
                streak_count: post.streak_count || 0,
                image: post.image_url,
                timestamp: formatTimestamp(post.created_at),
                reaction_fire: post.reaction_fire,
                reaction_fist: post.reaction_fist,
                reaction_party: post.reaction_party,
                reaction_heart: post.reaction_heart,
              }}
              initialUserReaction={userReactions[post.id] || null}
              onDelete={(postId) => {
                setPosts(prev => prev.filter(p => p.id !== postId));
              }}
            />
          ))
        )}

        {/* End of Feed */}
        {posts.length > 0 && (
          <View style={styles.endOfFeed}>
            <View style={styles.endIcon}>
              <View style={styles.endDot} />
            </View>
            <Text style={styles.endText}>You're all caught up</Text>
          </View>
        )}
      </ScrollView>

      {/* Onboarding welcome overlay — fades out after navigation from Onboarding */}
      {showWelcomeOverlay && (
        <Animated.View
          style={[styles.welcomeOverlay, { opacity: welcomeOpacity }]}
          pointerEvents="none"
        >
          <View style={styles.welcomeLogoRing}>
            <Flame color="#FF6B35" size={36} fill="#FF6B35" />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to streakd</Text>
          <Text style={styles.welcomeSubtitle}>Your journey starts now 🔥</Text>
        </Animated.View>
      )}

      {/* Goal Selector Modal */}
      <Modal
        visible={showGoalSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGoalSelector(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGoalSelector(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Goal</Text>
              <TouchableOpacity onPress={() => setShowGoalSelector(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            {/* Goals List */}
            <ScrollView style={styles.modalScroll}>
              {goals.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalItem}
                  onPress={() => handleGoalSelect(goal)}
                >
                  <View>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    {goal.description && (
                      <Text style={styles.goalDescription}>{goal.description}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
  const now = new Date();
  const posted = new Date(timestamp);
  const diffMs = now - posted;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 56,
    gap: 12,
  },
  emptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.4)',
    backgroundColor: 'rgba(255,107,53,0.1)',
  },
  emptyButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconRing: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 48,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  endOfFeed: {
    alignItems: 'center',
    paddingVertical: 48,
    marginTop: 32,
  },
  endIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  endDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  endText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
  welcomeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  welcomeLogoRing: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: '85%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalScroll: {
    padding: 16,
  },
  goalItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  goalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  goalDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
});