import EduOTTViewBase from '../../dashboard/_components/EduOTTView';

interface EduOTTViewProps {
  username?: string;
}

export default function EduOTTView({ username = 'Admin' }: EduOTTViewProps) {
  return <EduOTTViewBase role="admin" username={username} />;
}
