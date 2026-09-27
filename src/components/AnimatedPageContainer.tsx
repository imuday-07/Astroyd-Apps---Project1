import React, { useEffect, useLayoutEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface AnimatedPageContainerProps {
  pageKey: string;
  direction?: 'horizontal' | 'vertical';
  slideSign?: 1 | -1;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const useIsomorphicLayoutEffect =
  Platform.OS === 'web' ? useLayoutEffect : useEffect;

/**
 * Glitch-free, synchronous pre-paint fade + directional glide container.
 * Resets initial values before browser paint to eliminate any 1-frame flash/shutter,
 * and avoids subpixel text scaling jitter on desktop browsers.
 */
export const AnimatedPageContainer: React.FC<AnimatedPageContainerProps> = ({
  pageKey,
  direction = 'horizontal',
  slideSign = 1,
  style,
  children,
}) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const prevKeyRef = useRef<string>(pageKey);
  const activeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const useNative = Platform.OS !== 'web';

  useIsomorphicLayoutEffect(() => {
    if (prevKeyRef.current === pageKey) {
      return;
    }
    prevKeyRef.current = pageKey;

    if (activeAnimRef.current) {
      activeAnimRef.current.stop();
      activeAnimRef.current = null;
    }

    const xStart = direction === 'horizontal' ? 18 * slideSign : 0;
    const yStart = direction === 'vertical' ? 12 * slideSign : 0;

    opacity.setValue(0);
    translateX.setValue(xStart);
    translateY.setValue(yStart);

    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 210,
        easing: Easing.out(Easing.quad),
        useNativeDriver: useNative,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: useNative,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: useNative,
      }),
    ]);

    activeAnimRef.current = anim;
    anim.start(() => {
      activeAnimRef.current = null;
    });
  }, [pageKey, direction, slideSign, opacity, translateX, translateY, useNative]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

