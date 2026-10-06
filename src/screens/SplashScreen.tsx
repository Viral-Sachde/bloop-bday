import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Logo } from '../components/Logo';
import { colors, fillAbs, fonts } from '../theme';

/** Forest-green launch screen: the popper mark pops in, then the wordmark. */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const pop = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(word, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(550),
      Animated.timing(out, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [pop, ring, word, out, onDone]);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.6] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.5, 0] });
  const spin = pop.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] });

  return (
    <Animated.View style={[styles.root, { opacity: out }]} testID="splash">
      <StatusBar barStyle="light-content" />
      <View style={styles.center}>
        <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
        <Animated.View style={{ transform: [{ scale: pop }, { rotate: spin }] }}>
          <Logo size={132} />
        </Animated.View>
      </View>
      <Animated.Text
        style={[
          styles.word,
          { opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
        ]}>
        bloop
      </Animated.Text>
      <Animated.View style={{ opacity: word }}>
        <Text style={styles.tag}>never miss a midnight</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...fillAbs, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  center: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: colors.lime },
  word: { fontFamily: fonts.serif, fontSize: 66, letterSpacing: -1.5, color: colors.lime, marginTop: 6 },
  tag: { fontFamily: fonts.sansSemiBold, color: colors.butter, fontSize: 13, letterSpacing: 2.6, textTransform: 'uppercase', marginTop: 6 },
});
