import { Ionicons } from '@expo/vector-icons';

type Props = {
  size?: number;
  color?: string;
};

export default function AiGenerateIcon({ size = 20, color = '#ffffff' }: Props) {
  return <Ionicons name="sparkles" size={size} color={color} />;
}
