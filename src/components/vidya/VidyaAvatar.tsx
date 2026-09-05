import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';

const VIDYA_AVATAR = require('../../../assets/Vidya-ai.jpg');

type VidyaAvatarProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
  borderColor?: string;
  borderWidth?: number;
};

export default function VidyaAvatar({
  size = 48,
  style,
  bordered = true,
  borderColor = '#fdba74',
  borderWidth = 2,
}: VidyaAvatarProps) {
  const radius = size / 2;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: bordered ? borderWidth : 0,
          borderColor: bordered ? borderColor : 'transparent',
        },
        style,
      ]}
    >
      <Image
        source={VIDYA_AVATAR}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        transition={150}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
});
