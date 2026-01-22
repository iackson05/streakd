import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Feed from './screens/Feed';
import Profile from './screens/Profile';
import Settings from './screens/Settings';
import AddFriends from './screens/AddFriends';
import GoalFeed from './screens/GoalFeed';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import CreatePost from './screens/CreatePost';
import Friends from './screens/Friends';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="Feed" component={Feed} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="AddFriends" component={AddFriends} />
            <Stack.Screen name="GoalFeed" component={GoalFeed} />
            <Stack.Screen name="Friends" component={Friends} />
            <Stack.Screen name="CreatePost" component={CreatePost} options={{ headerShown: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </DataProvider>
    </AuthProvider>
  );
}