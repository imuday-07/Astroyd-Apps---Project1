import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { STUDIO_FONT_FAMILY } from '../theme/boostlabTheme';

export interface SegmentedTabItem {
  key: string;
  label: string;
  stepNumber?: number;
  badge?: string;
}

interface AnimatedSegmentedTabsProps {
  items: SegmentedTabItem[];
  activeKey: string;
  onSelect: (key: string, index: number) => void;
  variant?: 'light' | 'dark' | 'subpage';
  compact?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

interface TabLayout {
  x: number;
  width: number;
}

const useIsomorphicLayoutEffect =
  Platform.OS === 'web' ? useLayoutEffect : useEffect;

export const AnimatedSegmentedTabs: React.FC<AnimatedSegmentedTabsProps> = ({
  items,
  activeKey,
  onSelect,
  variant = 'light',
  compact = false,
  containerStyle,
}) => {
  const layoutsRef = useRef<Record<string, TabLayout>>({});
  const [ready, setReady] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const pillX = useRef(new Animated.Value(0)).current;
  const pillWidth = useRef(new Animated.Value(0)).current;
  const isInitializedRef = useRef(false);
  const currentAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const movePillToKey = (key: string, immediate: boolean) => {
    const target = layoutsRef.current[key];
    if (!target) return;

    if (currentAnimRef.current) {
      currentAnimRef.current.stop();
      currentAnimRef.current = null;
    }

    if (immediate || !isInitializedRef.current) {
      pillX.setValue(target.x);
      pillWidth.setValue(target.width);
      isInitializedRef.current = true;
      if (!ready) setReady(true);
      return;
    }

    const anim = Animated.parallel([
      Animated.timing(pillX, {
        toValue: target.x,
        duration: 260,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: false,
      }),
      Animated.timing(pillWidth, {
        toValue: target.width,
        duration: 260,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: false,
      }),
    ]);

    currentAnimRef.current = anim;
    anim.start(() => {
      currentAnimRef.current = null;
    });
  };

  useIsomorphicLayoutEffect(() => {
    movePillToKey(activeKey, false);
  }, [activeKey]);

  const handleTabLayout = (key: string, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    const prev = layoutsRef.current[key];

    // Ignore sub-pixel layout noise so animations are never interrupted mid-flight
    if (
      prev &&
      Math.abs(prev.x - x) < 0.5 &&
      Math.abs(prev.width - width) < 0.5
    ) {
      return;
    }

    layoutsRef.current[key] = { x, width };

    if (key === activeKey && !isInitializedRef.current) {
      movePillToKey(activeKey, true);
    }
  };

  const isDark = variant === 'dark';
  const isSubpage = variant === 'subpage';

  return (
    <View
      style={[
        styles.trackContainer,
        isDark && styles.trackContainerDark,
        isSubpage && styles.trackContainerSubpage,
        compact && styles.trackContainerCompact,
        containerStyle,
      ]}
    >
      {/* Smooth Gliding Pill Indicator */}
      <Animated.View
        style={[
          styles.slidingPill,
          isDark && styles.slidingPillDark,
          isSubpage && styles.slidingPillSubpage,
          {
            pointerEvents: 'none',
            opacity: ready ? 1 : 0,
            width: pillWidth,
            transform: [{ translateX: pillX }],
          },
        ]}
      />

      {/* Tab Buttons */}
      {items.map((item, idx) => {
        const isActive = item.key === activeKey;
        const isHovered = hoveredKey === item.key;

        return (
          <Pressable
            key={item.key}
            onLayout={(e) => handleTabLayout(item.key, e)}
            onHoverIn={() => setHoveredKey(item.key)}
            onHoverOut={() =>
              setHoveredKey((prev) => (prev === item.key ? null : prev))
            }
            onPress={() => onSelect(item.key, idx)}
            style={styles.tabButton}
          >
            <View
              style={[
                styles.tabButtonInner,
                isSubpage && styles.tabButtonSubpage,
                compact && styles.tabButtonCompact,
              ]}
            >
              {item.stepNumber !== undefined && (
                <View
                  style={[
                    styles.stepBadge,
                    isActive && styles.stepBadgeActive,
                    !isActive && isHovered && styles.stepBadgeHovered,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepBadgeText,
                      isActive && styles.stepBadgeTextActive,
                    ]}
                  >
                    {item.stepNumber}
                  </Text>
                </View>
              )}

              {/* Fixed fontWeight ('600') prevents text width layout shifts on click */}
              <Text
                style={[
                  styles.tabLabel,
                  isDark && styles.tabLabelDark,
                  compact && styles.tabLabelCompact,
                  !isActive && isHovered && styles.tabLabelHovered,
                  !isActive && isHovered && isDark && styles.tabLabelHoveredDark,
                  isActive && styles.tabLabelActive,
                  isActive && isDark && styles.tabLabelActiveDark,
                ]}
              >
                {item.label}
              </Text>

              {item.badge ? (
                <View
                  style={[
                    styles.metaBadge,
                    isActive && styles.metaBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.metaBadgeText,
                      isActive && styles.metaBadgeTextActive,
                    ]}
                  >
                    {item.badge}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  trackContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFF4',
    padding: 4,
    borderRadius: 980,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  trackContainerDark: {
    backgroundColor: 'rgba(29, 29, 31, 0.94)',
    padding: 5,
    gap: 4,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  trackContainerSubpage: {
    backgroundColor: '#E8E8ED',
    padding: 4,
    gap: 4,
  },
  trackContainerCompact: {
    padding: 3,
  },

  /* Smooth Gliding Pill */
  slidingPill: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    borderRadius: 980,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  slidingPillDark: {
    top: 5,
    bottom: 5,
    backgroundColor: '#0071E3',
    shadowColor: '#0071E3',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  slidingPillSubpage: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  /* Tab Buttons */
  tabButton: {
    zIndex: 1,
    borderRadius: 980,
  },
  tabButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 980,
  },
  tabButtonSubpage: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  tabButtonCompact: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  /* Constant fontWeight: '600' avoids width shifts & layout thrashing */
  tabLabel: {
    color: '#6E6E73',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  tabLabelDark: {
    color: '#A1A1A6',
  },
  tabLabelCompact: {
    fontSize: 12,
  },
  tabLabelHovered: {
    color: '#1D1D1F',
  },
  tabLabelHoveredDark: {
    color: '#FFFFFF',
  },
  tabLabelActive: {
    color: '#1D1D1F',
  },
  tabLabelActiveDark: {
    color: '#FFFFFF',
  },

  /* Step Number Circle for Sub-Pages */
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeHovered: {
    backgroundColor: 'rgba(0, 113, 227, 0.14)',
  },
  stepBadgeActive: {
    backgroundColor: '#0071E3',
  },
  stepBadgeText: {
    color: '#6E6E73',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  stepBadgeTextActive: {
    color: '#FFFFFF',
  },

  /* Optional Badge */
  metaBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 980,
  },
  metaBadgeActive: {
    backgroundColor: '#E8F2FF',
  },
  metaBadgeText: {
    color: '#6E6E73',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  metaBadgeTextActive: {
    color: '#0071E3',
  },
});

