import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Users, Plus, X } from 'lucide-react-native';
import PostCard from '../components/feed/PostCard';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

export default function Feed({ navigation }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGoalSelector, setShowGoalSelector] = useState(false);
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigation.replace('Login');
    }
  }, [authLoading, user, navigation]);

  useEffect(() => {
    if (user) {
      loadPosts();
    }
  }, [user]);

  const loadPosts = async () => {
    try {
      // Get user's friends (accepted only)
      const { data: friendships, error: friendError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (friendError) throw friendError;

      // Build list of friend IDs
      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      // Include current user in the list
      const userIds = [user.id, ...friendIds];

      console.log('Loading posts from users:', userIds);

      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Get posts from friends + self, respecting privacy
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users!posts_user_id_fkey (
            id,
            username,
            profile_picture_url
          ),
          goals!posts_goal_id_fkey (
            id,
            title,
            privacy
          )
        `)
        .in('user_id', userIds)
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false })
        

      if (error) throw error;

      // Filter out private posts from other users
      const filteredPosts = data?.filter(post => {
        // Always show own posts
        if (post.user_id === user.id) return true;
        
        // Only show friends' posts if goal is not private
        return post.goals?.privacy !== 'private';
      }) || [];

      console.log('✅ Loaded posts:', filteredPosts.length);
      setPosts(filteredPosts);
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
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        Alert.alert(
          'No Goals',
          'You need to create a goal before posting',
          [{ text: 'OK' }]
        );
        return;
      }

      setGoals(data);
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

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoButton}>
          <View style={styles.logoDot} />
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
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              Add friends or create your first post!
            </Text>
          </View>
        ) : (
          /* Posts */
          posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={{
                id: post.id,
                username: post.users?.username || 'Unknown',
                profile_picture_url: post.users?.profile_picture_url,
                goal: post.goals?.title || 'Goal',
                image: post.image_url,
                timestamp: formatTimestamp(post.created_at),
                reaction_fire: post.reaction_fire,
                reaction_fist: post.reaction_fist,
                reaction_party: post.reaction_party,
                reaction_heart: post.reaction_heart,
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
    paddingVertical: 48,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
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
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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