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
import { ArrowLeft, Search, UserPlus, UserMinus, Clock, Check, X } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useData } from '../contexts/DataContext';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export default function Friends({ navigation }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'requests'

  const { 
    friendsData, 
    fetchFriendsData, 
    addFriend, 
    removeFriend, 
    acceptFriendRequest, 
    removePendingRequest 
    } = useData();

  const { friends, pendingRequests, loading} = friendsData;

  useEffect(() => {
    if (user) fetchFriendsData();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
        if (user) fetchFriendsData(); 
    }, [user])
  );

  const handleRemoveFriend = async (friendId) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('friendships')
                .delete()
                .or(
                  `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
                );

              if (error) throw error;

              //update cache
              removeFriend(friendId);

              Alert.alert('Success', 'Friend removed');
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend');
            }
          }
        }
      ]
    );
  };

  const handleAcceptRequest = async (senderId, friendData) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', senderId)
        .eq('friend_id', user.id);

      if (error) throw error;

      acceptFriendRequest(friendData, senderId);

      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (senderId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', senderId)
        .eq('friend_id', user.id);

      if (error) throw error;

      removePendingRequest(senderId);

      Alert.alert('Success', 'Request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  // Filter friends by search query
  const filteredFriends = friends.filter(f =>
    f.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && friends.length === 0) {
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
        <Text style={styles.headerTitle}>Friends</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('AddFriends')}
          style={styles.addButton}
        >
          <UserPlus color="rgba(255,255,255,0.7)" size={20} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Requests ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'friends' ? (
          <>
            {/* Search */}
            <View style={styles.searchContainer}>
              <Search 
                color="rgba(255,255,255,0.4)" 
                size={16} 
                style={styles.searchIcon}
              />
              <TextInput
                placeholder="Search friends..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
                autoCapitalize="none"
              />
            </View>

            {/* Friends List */}
            {filteredFriends.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <UserPlus color="rgba(255,255,255,0.3)" size={20} />
                </View>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No friends found' : 'No friends yet'}
                </Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('AddFriends')}
                >
                  <Text style={styles.emptyButtonText}>Add Friends</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredFriends.map((friend) => (
                <View key={friend.id} style={styles.userCard}>
                  <Image
                    source={{ 
                      uri: friend.profile_picture_url || 
                           `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`
                    }}
                    style={styles.userAvatar}
                  />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{friend.username}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveFriend(friend.id)}
                    style={styles.removeButton}
                  >
                    <UserMinus color="rgba(255,255,255,0.7)" size={16} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            {/* Pending Requests */}
            {pendingRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Clock color="rgba(255,255,255,0.3)" size={20} />
                </View>
                <Text style={styles.emptyText}>No pending requests</Text>
              </View>
            ) : (
              pendingRequests.map((request) => (
                <View key={request.senderId} style={styles.userCard}>
                  <Image
                    source={{ 
                      uri: request.profile_picture_url || 
                           `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.username}`
                    }}
                    style={styles.userAvatar}
                  />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{request.username}</Text>
                    <Text style={styles.userEmail}>{request.email}</Text>
                  </View>
                  <View style={styles.requestButtons}>
                    <TouchableOpacity
                      onPress={() => handleAcceptRequest(request.senderId, request)}
                      style={styles.acceptButton}
                    >
                      <Check color="#000" size={16} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRejectRequest(request.senderId)}
                      style={styles.rejectButton}
                    >
                      <X color="rgba(255,255,255,0.7)" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  tabText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
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
    marginBottom: 24,
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
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    marginBottom: 16,
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
});