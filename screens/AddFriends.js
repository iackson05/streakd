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
import { ArrowLeft, Search, UserPlus, Check, Clock, X } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

export default function AddFriends({ navigation }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendships, setFriendships] = useState(new Map()); // Map<userId, {status, sentByMe}>

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      await Promise.all([loadUsers(), loadFriendships()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
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
    }
  };

  const loadFriendships = async () => {
    try {
      // Get all friendships where current user is involved
      const { data, error } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;

      // Build map of friendships
      const friendshipMap = new Map();
      data?.forEach(friendship => {
        const otherUserId = friendship.user_id === user.id 
          ? friendship.friend_id 
          : friendship.user_id;
        
        const sentByMe = friendship.user_id === user.id;
        
        friendshipMap.set(otherUserId, {
          status: friendship.status,
          sentByMe,
        });
      });

      setFriendships(friendshipMap);
    } catch (error) {
      console.error('Error loading friendships:', error);
    }
  };

  const handleSendRequest = async (friendId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update local state
      setFriendships(prev => new Map(prev).set(friendId, {
        status: 'pending',
        sentByMe: true,
      }));

      Alert.alert('Success', 'Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (friendId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', friendId)
        .eq('friend_id', user.id);

      if (error) throw error;

      // Update local state
      setFriendships(prev => new Map(prev).set(friendId, {
        status: 'accepted',
        sentByMe: false,
      }));

      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      const friendship = friendships.get(friendId);
      
      // Delete the friendship (works for both pending and accepted)
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
        );

      if (error) throw error;

      // Update local state
      setFriendships(prev => {
        const newMap = new Map(prev);
        newMap.delete(friendId);
        return newMap;
      });

      Alert.alert('Success', friendship?.status === 'accepted' ? 'Friend removed' : 'Request cancelled');
    } catch (error) {
      console.error('Error removing friend:', error);
      Alert.alert('Error', 'Failed to remove friend');
    }
  };

  const getFriendshipButton = (userId) => {
    const friendship = friendships.get(userId);

    if (!friendship) {
      // Not friends - show add button
      return (
        <TouchableOpacity
          onPress={() => handleSendRequest(userId)}
          style={styles.addButton}
        >
          <UserPlus color="rgba(255,255,255,0.7)" size={16} />
        </TouchableOpacity>
      );
    }

    if (friendship.status === 'accepted') {
      // Already friends - show check with option to remove
      return (
        <TouchableOpacity
          onPress={() => handleRemoveFriend(userId)}
          style={styles.friendButton}
        >
          <Check color="#000" size={16} />
        </TouchableOpacity>
      );
    }

    if (friendship.status === 'pending' && friendship.sentByMe) {
      // Pending request sent by me - show pending icon
      return (
        <TouchableOpacity
          onPress={() => handleRemoveFriend(userId)}
          style={styles.pendingButton}
        >
          <Clock color="rgba(255,255,255,0.7)" size={16} />
        </TouchableOpacity>
      );
    }

    if (friendship.status === 'pending' && !friendship.sentByMe) {
      // Pending request sent to me - show accept/reject
      return (
        <View style={styles.requestButtons}>
          <TouchableOpacity
            onPress={() => handleAcceptRequest(userId)}
            style={styles.acceptButton}
          >
            <Check color="#000" size={16} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleRemoveFriend(userId)}
            style={styles.rejectButton}
          >
            <X color="rgba(255,255,255,0.7)" size={16} />
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  // Filter users by search query
  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count friends (accepted only)
  const friendCount = Array.from(friendships.values()).filter(
    f => f.status === 'accepted'
  ).length;

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
            placeholder="Search by username..."
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
          filteredUsers.map((u) => (
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
                <Text style={styles.userEmail}>{u.email}</Text>
              </View>
              {getFriendshipButton(u.id)}
            </View>
          ))
        )}

        {/* Friend Count */}
        {friendCount > 0 && (
          <View style={styles.friendCount}>
            <Text style={styles.friendCountText}>
              {friendCount} {friendCount === 1 ? 'friend' : 'friends'}
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
  userEmail: {
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
  friendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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