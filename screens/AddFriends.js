import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, Search, UserPlus, Check } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

export default function AddFriends({ navigation }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedUsers, setAddedUsers] = useState(new Set());
  const [friends, setFriends] = useState(new Set());

  useEffect(() => {
    if (user) {
      loadUsers();
      loadFriends();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      // Get all users except current user
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, profile_picture_url')
        .neq('id', user.id)
        .order('username', { ascending: true });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      // TODO: Implement friends table
      // For now, we'll store in a simple table structure:
      // CREATE TABLE friends (
      //   id uuid primary key default gen_random_uuid(),
      //   user_id uuid references users(id),
      //   friend_id uuid references users(id),
      //   created_at timestamptz default now(),
      //   unique(user_id, friend_id)
      // );

      const { data, error } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id);

      if (error && error.code !== '42P01') { // Ignore "table doesn't exist" error
        throw error;
      }

      if (data) {
        setFriends(new Set(data.map(f => f.friend_id)));
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      if (friends.has(friendId)) {
        // Remove friend
        const { error } = await supabase
          .from('friends')
          .delete()
          .eq('user_id', user.id)
          .eq('friend_id', friendId);

        if (error) throw error;

        setFriends(prev => {
          const newSet = new Set(prev);
          newSet.delete(friendId);
          return newSet;
        });
      } else {
        // Add friend
        const { error } = await supabase
          .from('friends')
          .insert({
            user_id: user.id,
            friend_id: friendId,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;

        setFriends(prev => new Set([...prev, friendId]));
      }
    } catch (error) {
      console.error('Error updating friend:', error);
      
      // If table doesn't exist, show helpful message
      if (error.code === '42P01') {
        Alert.alert(
          'Friends Feature Not Set Up',
          'You need to create the friends table in Supabase. Check the console for the SQL command.',
        );
        console.log(`
CREATE TABLE friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  friend_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

-- RLS Policies
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friends"
  ON friends FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add friends"
  ON friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove friends"
  ON friends FOR DELETE
  USING (auth.uid() = user_id);
        `);
      } else {
        Alert.alert('Error', 'Failed to update friend');
      }
    }
  };

  // Filter users by search query
  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Text style={styles.headerTitle}>Add Friends</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search */}
        <View style={styles.searchContainer}>
          <Search 
            color="rgba(255,255,255,0.4)" 
            size={16} 
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search by username or email..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>

        {/* Users List */}
        <Text style={styles.sectionTitle}>
          {searchQuery ? 'SEARCH RESULTS' : 'ALL USERS'}
        </Text>
        
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Search color="rgba(255,255,255,0.3)" size={20} />
            </View>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No users found' : 'No other users yet'}
            </Text>
          </View>
        ) : (
          filteredUsers.map((u) => {
            const isFriend = friends.has(u.id);
            
            return (
              <View key={u.id} style={styles.userCard}>
                <Image
                  source={{ 
                    uri: u.profile_picture_url || 
                         `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`
                  }}
                  style={styles.userAvatar}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.username}</Text>
                  <Text style={styles.userUsername}>{u.email}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleAddFriend(u.id)}
                  style={[
                    styles.addButton,
                    isFriend && styles.addButtonActive
                  ]}
                >
                  {isFriend ? (
                    <Check color="#000" size={16} />
                  ) : (
                    <UserPlus color="rgba(255,255,255,0.7)" size={16} />
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Friend Count */}
        {friends.size > 0 && (
          <View style={styles.friendCount}>
            <Text style={styles.friendCountText}>
              {friends.size} {friends.size === 1 ? 'friend' : 'friends'}
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
    paddingTop: 24,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  searchInput: {
    height: 48,
    paddingLeft: 44,
    paddingRight: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 14,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  userUsername: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonActive: {
    backgroundColor: '#fff',
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
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  friendCount: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    alignItems: 'center',
  },
  friendCountText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
});