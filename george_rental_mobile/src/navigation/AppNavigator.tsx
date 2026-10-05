import React, { useRef, useEffect } from 'react'
import { Text, View, Animated, Easing } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { Profile } from '../types'
import { MfaState } from '../hooks/useAuth'
import SignIn from '../screens/SignIn'
import TwoStep from '../screens/TwoStep'
import Home from '../screens/Home'
import PayRent from '../screens/PayRent'
import Receipts from '../screens/Receipts'
import Maintenance from '../screens/Maintenance'
import ProfileScreen from '../screens/Profile'

const C = {
  midnight: '#060914',
  crimson:  '#D11F2C',
  paper:    '#F9F7F3',
  line:     '#E5E0D5',
}

// ─── Animated cityscape header ───────────────────────────────────────────────
const SKYLINE = [
  { phase: 0.00, h: 30, w: 14, color: 'rgba(209,31,44,0.55)'   },
  { phase: 0.11, h: 22, w: 11, color: 'rgba(246,241,228,0.20)' },
  { phase: 0.22, h: 42, w: 10, color: 'rgba(246,241,228,0.14)' },
  { phase: 0.33, h: 20, w: 16, color: 'rgba(209,31,44,0.38)'   },
  { phase: 0.44, h: 48, w: 9,  color: 'rgba(246,241,228,0.10)' },
  { phase: 0.55, h: 26, w: 13, color: 'rgba(209,31,44,0.30)'   },
  { phase: 0.66, h: 36, w: 11, color: 'rgba(246,241,228,0.17)' },
  { phase: 0.77, h: 18, w: 15, color: 'rgba(209,31,44,0.22)'   },
  { phase: 0.88, h: 32, w: 12, color: 'rgba(246,241,228,0.13)' },
]

function AnimatedHeaderTitle() {
  const t = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 9000,
        useNativeDriver: false,
        easing: Easing.linear,
      })
    ).start()
    return () => t.stopAnimation()
  }, [])

  return (
    <View style={{ width: 260, height: 52, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {SKYLINE.map((b, i) => {
        const shifted    = Animated.modulo(Animated.add(t, new Animated.Value(b.phase)), 1)
        const translateX = shifted.interpolate({ inputRange: [0, 1], outputRange: [270, -75] })
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              bottom: 5,
              width: b.w,
              height: b.h,
              backgroundColor: b.color,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
              transform: [{ translateX }],
            }}
          />
        )
      })}
      <Text style={{ color: '#F6F1E4', fontWeight: '800', fontSize: 18, zIndex: 10, letterSpacing: 0.3 }}>
        GeorgeRental
      </Text>
    </View>
  )
}

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

interface TabIconProps { emoji: string; focused: boolean }
function TabIcon({ emoji, focused }: TabIconProps) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
}

function TenantTabs({ profile, mfa, onSignOut }: { profile: Profile; mfa: MfaState | null; onSignOut: () => void }) {
  const insets = useSafeAreaInsets()
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle:     { backgroundColor: C.midnight, height: 68 },
        headerTintColor: '#F6F1E4',
        headerTitleStyle: { fontWeight: '700', fontSize: 16 },
        tabBarStyle:     {
          backgroundColor: '#fff',
          borderTopColor: C.line,
          borderTopWidth: 1,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   C.crimson,
        tabBarInactiveTintColor: '#9E9893',
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          title: 'Home',
          headerTitle: () => <AnimatedHeaderTitle />,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      >
        {() => <Home profile={profile} />}
      </Tab.Screen>

      <Tab.Screen
        name="PayRent"
        options={{
          title: 'Pay Rent',
          headerTitle: () => <AnimatedHeaderTitle />,
          tabBarIcon: ({ focused }) => <TabIcon emoji="💳" focused={focused} />,
        }}
      >
        {() => <PayRent profile={profile} />}
      </Tab.Screen>

      <Tab.Screen
        name="Receipts"
        options={{
          title: 'Receipts',
          headerTitle: () => <AnimatedHeaderTitle />,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧾" focused={focused} />,
        }}
      >
        {() => <Receipts profile={profile} />}
      </Tab.Screen>

      <Tab.Screen
        name="Maintenance"
        options={{
          title: 'Maintenance',
          headerTitle: () => <AnimatedHeaderTitle />,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔧" focused={focused} />,
        }}
      >
        {() => <Maintenance profile={profile} />}
      </Tab.Screen>

      <Tab.Screen
        name="ProfileTab"
        options={{
          title: 'Profile',
          headerTitle: () => <AnimatedHeaderTitle />,
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      >
        {() => <ProfileScreen profile={profile} mfa={mfa} onSignOut={onSignOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

interface Props {
  profile: Profile | null
  mfa: MfaState | null
  onSignIn: (email: string, password: string) => Promise<void>
  onSignOut: () => void
}

export default function AppNavigator({ profile, mfa, onSignIn, onSignOut }: Props) {
  // Account has an authenticator but this session has not passed the code yet
  const needsCode = !!profile && !!mfa && mfa.enrolled && !mfa.verified

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!profile ? (
          <Stack.Screen name="SignIn">
            {() => <SignIn onSignIn={onSignIn} />}
          </Stack.Screen>
        ) : needsCode ? (
          <Stack.Screen name="TwoStep">
            {() => <TwoStep mode="challenge" onDone={() => {}} onCancel={onSignOut} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main">
            {() => <TenantTabs profile={profile} mfa={mfa} onSignOut={onSignOut} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
