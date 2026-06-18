import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFonts } from 'expo-font';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  SourceSerif4_400Regular,
  SourceSerif4_600SemiBold,
} from '@expo-google-fonts/source-serif-4';
import {
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_700Bold,
} from '@expo-google-fonts/hind-siliguri';
import { LanguageProvider } from './src/context/LanguageContext';
import { COLORS, FONTS } from './src/constants/theme';

import HomeScreen from './src/screens/HomeScreen';
import PoliceStopScreen from './src/screens/PoliceStopScreen';
import RecordScreen from './src/screens/RecordScreen';
import RightsListScreen from './src/screens/RightsListScreen';
import RightsLibraryScreen from './src/screens/RightsLibraryScreen';
import ComplaintScreen from './src/screens/ComplaintScreen';
import LegalAidScreen from './src/screens/LegalAidScreen';
import RTIScreen from './src/screens/RTIScreen';
import EvidenceVaultScreen from './src/screens/EvidenceVaultScreens';
import EvidenceDetailScreen from './src/screens/EvidenceDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: { fontFamily: FONTS.family.bold, fontSize: 16 },
  headerShadowVisible: false,
};

function TabIcon({ name, focused, color }) {
  const icons = {
    Home:      focused ? '⌂' : '⌂',
    Rights:    focused ? '⚖' : '⚖',
    Record:    focused ? '⏺' : '⏺',
    Complaint: focused ? '📄' : '📄',
  };
  // Using lucide-react-native is ideal; for now fall back to Ionicons
  const { Ionicons } = require('@expo/vector-icons');
  const ionicons = {
    Home:      focused ? 'home' : 'home-outline',
    Rights:    focused ? 'book' : 'book-outline',
    Record:    focused ? 'videocam' : 'videocam-outline',
    Complaint: focused ? 'document-text' : 'document-text-outline',
  };
  return <Ionicons name={ionicons[name]} size={22} color={color} />;
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...HEADER_OPTIONS,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarLabelStyle: { fontFamily: FONTS.family.medium, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 56,
        },
        tabBarIcon: ({ color, focused }) => (
          <TabIcon name={route.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen}      options={{ title: 'Home' }} />
      <Tab.Screen name="Rights"    component={RightsListScreen} options={{ title: 'Rights' }} />
      <Tab.Screen name="Record"    component={RecordScreen}    options={{ title: 'Record' }} />
      <Tab.Screen name="Complaint" component={ComplaintScreen} options={{ title: 'Complaint' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    SourceSerif4_400Regular,
    SourceSerif4_600SemiBold,
    HindSiliguri_400Regular,
    HindSiliguri_500Medium,
    HindSiliguri_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LanguageProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={HEADER_OPTIONS}>
          <Stack.Screen
            name="MainTabs"
            component={HomeTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="PoliceStop"    component={PoliceStopScreen}    options={{ title: 'Police stop' }} />
          <Stack.Screen name="RightsDetail"  component={RightsLibraryScreen} options={{ title: 'Article detail' }} />
          <Stack.Screen name="LegalAid"      component={LegalAidScreen}      options={{ title: 'Legal aid' }} />
          <Stack.Screen name="RTI"           component={RTIScreen}           options={{ title: 'RTI' }} />
          <Stack.Screen name="EvidenceVault" component={EvidenceVaultScreen} options={{ title: 'Evidence vault' }} />
          <Stack.Screen name="EvidenceDetail" component={EvidenceDetailScreen} options={{ title: 'Evidence detail' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}
