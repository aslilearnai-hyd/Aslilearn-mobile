import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

/**
 * Android adjustResize already shrinks the window. Only lift by leftover gap
 * so the composer sits just above the keypad (not under it, not far above).
 */
function leftoverKeyboardLift(keyboardH: number, baselineWindowH: number): number {
  const winNow = Dimensions.get('window').height;
  const alreadyShrunk = Math.max(0, baselineWindowH - winNow);
  return Math.max(0, Math.round(keyboardH - alreadyShrunk));
}

export function useKeyboardDockLift() {
  const baselineWindowHRef = useRef(Dimensions.get('window').height);
  const [keyboardLift, setKeyboardLift] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const captureBaseline = useCallback(() => {
    baselineWindowHRef.current = Dimensions.get('window').height;
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: { endCoordinates?: { height?: number } }) => {
      const kb = Math.ceil(e?.endCoordinates?.height ?? 0);
      setKeyboardOpen(true);
      const applyLift = () => {
        const lift =
          Platform.OS === 'ios' ? kb : leftoverKeyboardLift(kb, baselineWindowHRef.current);
        setKeyboardLift(lift);
      };
      applyLift();
      setTimeout(applyLift, 32);
      setTimeout(applyLift, 100);
      setTimeout(applyLift, 220);
    };

    const onHide = () => {
      setKeyboardOpen(false);
      setKeyboardLift(0);
      captureBaseline();
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [captureBaseline]);

  return { keyboardLift, keyboardOpen, captureBaseline };
}
