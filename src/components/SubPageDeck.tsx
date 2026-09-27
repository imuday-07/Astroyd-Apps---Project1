import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { STUDIO_FONT_FAMILY } from '../theme/boostlabTheme';
import { AnimatedPageContainer } from './AnimatedPageContainer';

export interface SubPageItem {
  key: string;
  title: string;
  badge?: string;
}

interface SubPageDeckProps {
  pages: SubPageItem[];
  activeKey: string;
  onSelectPage: (key: string) => void;
  isCompactMobile?: boolean;
  children: React.ReactNode;
}

export const SubPageDeck: React.FC<SubPageDeckProps> = ({
  pages,
  activeKey,
  onSelectPage,
  isCompactMobile = false,
  children,
}) => {
  const { width } = useWindowDimensions();
  const showSideGutters = !isCompactMobile && width >= 980;

  const [slideSign, setSlideSign] = useState<1 | -1>(1);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const activeIndex = Math.max(
    0,
    pages.findIndex((p) => p.key === activeKey)
  );

  // Wrap-around previous and next pages so both left & right side spaces always work
  const prevIndex = (activeIndex - 1 + pages.length) % pages.length;
  const nextIndex = (activeIndex + 1) % pages.length;
  const prevPage = pages[prevIndex];
  const nextPage = pages[nextIndex];

  const handleNavigate = (targetKey: string, directionSign: 1 | -1) => {
    if (targetKey === activeKey) return;
    setSlideSign(directionSign);
    onSelectPage(targetKey);
  };

  const handleDirectSelect = (targetKey: string, idx: number) => {
    if (targetKey === activeKey) return;
    setSlideSign(idx >= activeIndex ? 1 : -1);
    onSelectPage(targetKey);
  };

  // Keyboard Left / Right arrow navigation on Web (when not typing in an input)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tag = activeEl?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSlideSign(-1);
        onSelectPage(prevPage.key);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSlideSign(1);
        onSelectPage(nextPage.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prevPage.key, nextPage.key, onSelectPage]);

  return (
    <View style={styles.deckWrapper}>
      {/* Top Sub-Page Switcher Bar */}
      <View style={styles.topSwitcherRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.switcherScroll}
        >
          {pages.map((page, index) => {
            const isSelected = page.key === activeKey;
            return (
              <Pressable
                key={page.key}
                style={[
                  styles.pageTabPill,
                  isCompactMobile && styles.pageTabPillMobile,
                  isSelected && styles.pageTabPillActive,
                ]}
                onPress={() => handleDirectSelect(page.key, index)}
              >
                <View
                  style={[
                    styles.stepNumCircle,
                    isSelected && styles.stepNumCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumText,
                      isSelected && styles.stepNumTextActive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.pageTabLabel,
                    isSelected && styles.pageTabLabelActive,
                  ]}
                >
                  {page.title}
                </Text>
                {page.badge ? (
                  <View
                    style={[
                      styles.pageBadge,
                      isSelected && styles.pageBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pageBadgeText,
                        isSelected && styles.pageBadgeTextActive,
                      ]}
                    >
                      {page.badge}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Horizontal Stage: [Left Side Nav Space] [Center Page Stage] [Right Side Nav Space] */}
      <View style={styles.stageRow}>
        {/* LEFT EMPTY SPACE NAVIGATION (Desktop / Wide Viewports) */}
        {showSideGutters && (
          <Pressable
            style={({ pressed }) => [
              styles.sideSpaceZone,
              styles.sideSpaceZoneLeft,
              pressed && styles.sideSpaceZonePressed,
            ]}
            onPress={() => handleNavigate(prevPage.key, -1)}
          >
            <View style={styles.sidePaddleCard}>
              <View style={styles.sidePaddleTopRow}>
                <View style={styles.sideArrowCircle}>
                  <Text style={styles.sideArrowText}>‹</Text>
                </View>
                <Text style={styles.sideStepCounter}>
                  {prevIndex + 1} / {pages.length}
                </Text>
              </View>
              <Text style={styles.sidePaddleEyebrow}>PREVIOUS</Text>
              <Text style={styles.sidePaddleTitle} numberOfLines={2}>
                {prevPage.title}
              </Text>
              <Text style={styles.sidePaddleHint}>Click left space</Text>
            </View>
          </Pressable>
        )}

        {/* CENTER ACTIVE PAGE STAGE (with swipe support on touch devices) */}
        <View
          style={styles.centerStageCol}
          onTouchStart={(e) => {
            touchStartX.current = e.nativeEvent.pageX;
            touchStartY.current = e.nativeEvent.pageY;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null || touchStartY.current === null) {
              return;
            }
            const dx = e.nativeEvent.pageX - touchStartX.current;
            const dy = e.nativeEvent.pageY - touchStartY.current;
            touchStartX.current = null;
            touchStartY.current = null;

            // Trigger horizontal page transition if swipe is predominantly horizontal
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
              if (dx < 0) {
                handleNavigate(nextPage.key, 1);
              } else {
                handleNavigate(prevPage.key, -1);
              }
            }
          }}
        >
          {/* Compact Mobile Side-Edge Quick Paddles */}
          {!showSideGutters && (
            <View style={styles.mobileQuickNavStrip}>
              <Pressable
                style={styles.mobileSideBtn}
                onPress={() => handleNavigate(prevPage.key, -1)}
              >
                <View style={styles.mobileSideArrowCircle}>
                  <Text style={styles.mobileSideArrowText}>‹</Text>
                </View>
                <View style={styles.mobileSideTextCol}>
                  <Text style={styles.mobileSideEyebrow}>PREV</Text>
                  <Text style={styles.mobileSideTitle} numberOfLines={1}>
                    {prevPage.title}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.mobilePageIndicatorPill}>
                <Text style={styles.mobilePageIndicatorText}>
                  {activeIndex + 1} / {pages.length}
                </Text>
              </View>

              <Pressable
                style={[styles.mobileSideBtn, styles.mobileSideBtnRight]}
                onPress={() => handleNavigate(nextPage.key, 1)}
              >
                <View style={[styles.mobileSideTextCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.mobileSideEyebrow}>NEXT</Text>
                  <Text style={styles.mobileSideTitle} numberOfLines={1}>
                    {nextPage.title}
                  </Text>
                </View>
                <View
                  style={[
                    styles.mobileSideArrowCircle,
                    styles.mobileSideArrowCirclePrimary,
                  ]}
                >
                  <Text style={[styles.mobileSideArrowText, { color: '#FFFFFF' }]}>
                    ›
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          <AnimatedPageContainer
            pageKey={activeKey}
            direction="horizontal"
            slideSign={slideSign}
            style={styles.animatedStage}
          >
            {children}
          </AnimatedPageContainer>
        </View>

        {/* RIGHT EMPTY SPACE NAVIGATION (Desktop / Wide Viewports) */}
        {showSideGutters && (
          <Pressable
            style={({ pressed }) => [
              styles.sideSpaceZone,
              styles.sideSpaceZoneRight,
              pressed && styles.sideSpaceZonePressed,
            ]}
            onPress={() => handleNavigate(nextPage.key, 1)}
          >
            <View style={[styles.sidePaddleCard, styles.sidePaddleCardRight]}>
              <View style={styles.sidePaddleTopRow}>
                <Text style={styles.sideStepCounter}>
                  {nextIndex + 1} / {pages.length}
                </Text>
                <View style={[styles.sideArrowCircle, styles.sideArrowCircleNext]}>
                  <Text style={[styles.sideArrowText, styles.sideArrowTextNext]}>
                    ›
                  </Text>
                </View>
              </View>
              <Text style={[styles.sidePaddleEyebrow, styles.sidePaddleTextRight]}>
                UP NEXT
              </Text>
              <Text
                style={[styles.sidePaddleTitle, styles.sidePaddleTextRight]}
                numberOfLines={2}
              >
                {nextPage.title}
              </Text>
              <Text style={[styles.sidePaddleHint, styles.sidePaddleTextRight]}>
                Click right space
              </Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  deckWrapper: {
    gap: 18,
    width: '100%',
  },
  topSwitcherRow: {
    alignItems: 'center',
  },
  switcherScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAEAEF',
    padding: 4,
    borderRadius: 980,
    gap: 4,
  },
  pageTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 980,
  },
  pageTabPillMobile: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pageTabPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  stepNumCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumCircleActive: {
    backgroundColor: '#0071E3',
  },
  stepNumText: {
    color: '#6E6E73',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  stepNumTextActive: {
    color: '#FFFFFF',
  },
  pageTabLabel: {
    color: '#6E6E73',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  pageTabLabelActive: {
    color: '#1D1D1F',
    fontWeight: '700',
  },
  pageBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 980,
  },
  pageBadgeActive: {
    backgroundColor: '#E8F2FF',
  },
  pageBadgeText: {
    color: '#6E6E73',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  pageBadgeTextActive: {
    color: '#0071E3',
  },

  /* 3-Column Stage Row: Left Side Space + Center Stage + Right Side Space */
  stageRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 18,
    width: '100%',
  },
  centerStageCol: {
    flex: 1,
    maxWidth: 980,
    minWidth: 0,
    gap: 12,
  },
  animatedStage: {
    width: '100%',
  },

  /* Left & Right Side Empty-Space Navigation Zones */
  sideSpaceZone: {
    width: 176,
    minHeight: 360,
    justifyContent: 'center',
    borderRadius: 28,
    paddingVertical: 16,
  },
  sideSpaceZoneLeft: {
    alignItems: 'stretch',
  },
  sideSpaceZoneRight: {
    alignItems: 'stretch',
  },
  sideSpaceZonePressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  sidePaddleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
  },
  sidePaddleCardRight: {
    alignItems: 'flex-end',
  },
  sidePaddleTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sideArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideArrowCircleNext: {
    backgroundColor: '#0071E3',
  },
  sideArrowText: {
    color: '#1D1D1F',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  sideArrowTextNext: {
    color: '#FFFFFF',
  },
  sideStepCounter: {
    color: '#86868B',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  sidePaddleEyebrow: {
    color: '#0071E3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  sidePaddleTitle: {
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 20,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  sidePaddleHint: {
    color: '#86868B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  sidePaddleTextRight: {
    textAlign: 'right',
  },

  /* Mobile Side-Edge Quick Bar (plus swipe support) */
  mobileQuickNavStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mobileSideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  mobileSideBtnRight: {
    justifyContent: 'flex-end',
  },
  mobileSideArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileSideArrowCirclePrimary: {
    backgroundColor: '#0071E3',
  },
  mobileSideArrowText: {
    color: '#1D1D1F',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  mobileSideTextCol: {
    flex: 1,
    minWidth: 0,
  },
  mobileSideEyebrow: {
    color: '#86868B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: STUDIO_FONT_FAMILY,
  },
  mobileSideTitle: {
    color: '#1D1D1F',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
  mobilePageIndicatorPill: {
    backgroundColor: '#EAEAEF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 980,
  },
  mobilePageIndicatorText: {
    color: '#6E6E73',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: STUDIO_FONT_FAMILY,
  },
});
