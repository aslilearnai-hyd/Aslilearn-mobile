import { StyleSheet, View } from 'react-native';
import SuperAdminVidyaChatPanel from './SuperAdminVidyaChatPanel';
import { useKeyboardDockLift } from '../../../src/hooks/useKeyboardDockLift';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';

export default function VidyaAIView() {
  const { keyboardOpen } = useKeyboardDockLift();

  return (
    <View
      style={[
        styles.root,
        {
          // Tab-bar reserve only when the keyboard is closed; otherwise it leaves
          // a large empty band between the composer and the keypad.
          paddingBottom: keyboardOpen ? 8 : SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 28,
        },
      ]}
    >
      <SuperAdminVidyaChatPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
});
