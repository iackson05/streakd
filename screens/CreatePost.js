import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, FlipHorizontal } from 'lucide-react-native';
import { supabase } from '../services/supabase';

export default function CreatePostScreen({ navigation, route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [photo, setPhoto] = useState(null);
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showGoalSelector, setShowGoalSelector] = useState(true);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef(null);

  // Load user's goals
  useEffect(() => {
    const loadGoals = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading goals:', error);
        Alert.alert('Error', 'Could not load your goals');
        return;
      }

      if (!data || data.length === 0) {
        Alert.alert(
          'No Goals',
          'You need to create a goal before posting',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      setGoals(data);
      
      // If coming from goal page, pre-select that goal
      const preSelectedGoalId = route.params?.goalId;
      if (preSelectedGoalId) {
        const goal = data.find(g => g.id === preSelectedGoalId);
        setSelectedGoal(goal);
        setShowGoalSelector(false);
      }
    };

    loadGoals();
  }, []);

  // Request camera permission if not granted
  useEffect(() => {
    if (permission && !permission.granted && !showGoalSelector) {
      requestPermission();
    }
  }, [showGoalSelector]);

  const handleGoalSelect = (goal) => {
    setSelectedGoal(goal);
    setShowGoalSelector(false);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      setPhoto(photo);
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
  };

  const handlePost = async () => {
    if (!photo || !selectedGoal) return;
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Upload image to storage
      const fileName = user.id + '/' + Date.now() + '.jpg';
      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        name: fileName,
        type: 'image/jpeg',
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, formData, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      // Create post in database
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          goal_id: selectedGoal.id,
          image_url: publicUrl,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Success!', 'Post created', [
        { text: 'OK', onPress: () => navigation.navigate('Feed') }
      ]);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  // Goal Selector Screen
  if (showGoalSelector) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowGoalSelector(false)}>
            <X color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Goal</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.goalList}>
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
        </View>
      </SafeAreaView>
    );
  }

  // Camera Permission
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>We need camera permission</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Photo Review Screen
  if (photo) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity onPress={retakePhoto}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.cameraGoalText}>{selectedGoal?.title}</Text>
            <TouchableOpacity onPress={() => setShowGoalSelector(true)}>
              <Text style={styles.changeText}>Change Goal</Text>
            </TouchableOpacity>
          </View>

          {/* Image Preview */}
          <View style={styles.previewWrapper}>
            <Image 
              source={{ uri: photo.uri }} 
              style={styles.previewImage}
              resizeMode="cover"
            />
          </View>

          {/* Review Actions */}
          <View style={styles.reviewActions}>
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={retakePhoto}
              disabled={uploading}
            >
              <Text style={styles.reviewButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reviewButton, styles.postButton]}
              onPress={handlePost}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={[styles.reviewButtonText, styles.postButtonText]}>
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Camera Screen
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <X color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.cameraGoalText}>{selectedGoal?.title}</Text>
          <TouchableOpacity onPress={() => setShowGoalSelector(true)}>
            <Text style={styles.changeText}>Change Goal</Text>
          </TouchableOpacity>
        </View>

        {/* Camera Preview */}
        <View style={styles.cameraWrapper}>
          <CameraView
            style={styles.camera}
            facing={facing}
            ref={cameraRef}
          />
        </View>

        {/* Camera Controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCameraFacing}
          >
            <FlipHorizontal color="#fff" size={32} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicture}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
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
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  goalList: {
    padding: 16,
    gap: 12,
  },
  goalItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
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
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#000',
  },
  cameraGoalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  changeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  cameraWrapper: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  previewWrapper: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 40,
    backgroundColor: '#000',
  },
  flipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 12,
    backgroundColor: '#000',
  },
  reviewButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  postButton: {
    backgroundColor: '#fff',
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  postButtonText: {
    color: '#000',
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 40,
  },
  permissionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});