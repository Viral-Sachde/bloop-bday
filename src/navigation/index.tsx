import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNavigationContainerRef, NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useStore } from '../store';
import { colors } from '../theme';
import { CircleScreen } from '../screens/CircleScreen';
import { EditorScreen } from '../screens/EditorScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ImportScreen } from '../screens/ImportScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PersonScreen } from '../screens/PersonScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TabBar } from './TabBar';
import { RootStackParamList, TabParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

function Tabs() {
  return (
    <Tab.Navigator tabBar={renderTabBar} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.cream } }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Circle" component={CircleScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.cream, card: colors.cream, primary: colors.forest, text: colors.ink, border: colors.line },
};

export function RootNavigator({ onReady }: { onReady?: () => void }) {
  const onboarded = useStore(s => s.settings.onboarded);
  return (
    <NavigationContainer ref={navigationRef} theme={theme} onReady={onReady}>
      <Stack.Navigator initialRouteName={onboarded ? 'Tabs' : 'Onboarding'} screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.cream } }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Tabs" component={Tabs} options={{ animation: 'fade' }} />
        <Stack.Screen name="Person" component={PersonScreen} />
        <Stack.Screen name="Editor" component={EditorScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Import" component={ImportScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
