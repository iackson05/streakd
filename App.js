import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators  } from '@react-navigation/stack';
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { apiPut } from './services/api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, StyleSheet } from 'react-native';
import Feed from './screens/Feed';
import Profile from './screens/Profile';
import Settings from './screens/Settings';
import EditProfile from './screens/EditProfile';
import NotificationsSettings from './screens/NotificationsSettings';
import AddFriends from './screens/AddFriends';
import GoalFeed from './screens/GoalFeed';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import CreatePost from './screens/CreatePost';
import Friends from './screens/Friends';
import Onboarding from './screens/Onboarding';


const Stack = createStackNavigator();

// Configure how notifications are handled
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Inner component that has access to auth context
function AppContent() {
  const { user, loading, isNewUser } = useAuth();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (user) {
      registerForPushNotifications(user.id);
    }

    // Listen for notifications when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for when user taps notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      // Navigate based on notification type
      // if (data.type === 'friend_request') navigation.navigate('Friends')
      // etc.
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]);

  async function registerForPushNotifications(userId) {
    // Only works on physical devices
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return;
    }

    // Get push token
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push token:', token);

      // Save token to database
      await apiPut('/users/push-token', { push_token: token });

      console.log('Push token saved to database');
    } catch (error) {
      console.error('Error getting push token:', error);
    }

    // Android-specific setup
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }

  // Show loading screen while checking auth
  if (loading) {
    return null; // Or add a proper loading screen component
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        // key forces the navigator to remount when switching between
        // auth and authenticated stacks, so initialRouteName is respected
        key={user ? 'authenticated' : 'guest'}
        screenOptions={{ headerShown: false }}
        initialRouteName={user ? (isNewUser ? 'Onboarding' : 'Feed') : 'Login'}
      >
        {user ? (
          // Authenticated screens - only shown when user is logged in
          <>
            <Stack.Screen name="Onboarding" component={Onboarding} />
            <Stack.Screen name="Feed" component={Feed} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="EditProfile" component={EditProfile} />
            <Stack.Screen name="NotificationsSettings" component={NotificationsSettings} />
            <Stack.Screen name="AddFriends" component={AddFriends} />
            <Stack.Screen name="GoalFeed" component={GoalFeed} />
            <Stack.Screen name="Friends" component={Friends} />
            <Stack.Screen name="CreatePost" component={CreatePost} />
          </>
        ) : (
          // Auth screens - only shown when user is NOT logged in
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});