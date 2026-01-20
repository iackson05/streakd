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
  RefreshControl,
} from 'react-native';
import { ArrowLeft, Plus } from 'lucide-react-native';
import PostCard from '../components/feed/PostCard';
import { supabase } from '../services/supabase';

export default function GoalFeed({ route, navigation }) {
  const goalId = route?.params?.goalId;
  const goalName = route?.params?.goalName;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (goalId) {
      loadPosts();
    }
  }, [goalId]);

  const loadPosts = async () => {
    try {
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
            title
          )
        `)
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Loaded goal posts:', data);
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading goal posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handleAddPost = () => {
    // Navigate to create post with this goal pre-selected
    navigation.navigate('CreatePost', { goalId });
  };

  const formatTimestamp = (timestamp) => {
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
        <Text style={styles.headerTitle}>{goalName || 'Goal Feed'}</Text>
        <TouchableOpacity 
          onPress={handleAddPost}
          style={styles.addButton}
        >
          <Plus color="rgba(255,255,255,0.7)" size={20} />
        </TouchableOpacity>
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
          <Text style={styles.title}>
            {goalName || 'Goal Posts'}
          </Text>
          <Text style={styles.subtitle}>
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </Text>
        </View>

        {/* Posts */}
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={{
                id: post.id,
                username: post.users?.username || 'Unknown',
                goal: post.goals?.title || 'Goal',
                image: post.image_url,
                timestamp: formatTimestamp(post.created_at),
                likes: 0, // TODO: Calculate from reactions
                comments: 0, // TODO: Add when you implement comments
              }} 
            />
          ))
        ) : (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <View style={styles.emptyDot} />
            </View>
            <Text style={styles.emptyText}>
              No posts yet for this goal
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={handleAddPost}
            >
              <Text style={styles.emptyButtonText}>Create First Post</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* End of Feed */}
        {posts.length > 0 && (
          <View style={styles.endOfFeed}>
            <View style={styles.endIcon}>
              <View style={styles.endDot} />
            </View>
            <Text style={styles.endText}>
              You're all caught up
            </Text>
          </View>
        )}
      </ScrollView>
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
    backgroundColor: 'rgba(0,0,0,0.8)',
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
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
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
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
});