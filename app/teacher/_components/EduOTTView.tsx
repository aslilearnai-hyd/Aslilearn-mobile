import EduOTTViewBase from '../../dashboard/_components/EduOTTView';

interface EduOTTViewProps {
  username?: string;
}

export default function EduOTTView({ username = 'Teacher' }: EduOTTViewProps) {
  return <EduOTTViewBase role="teacher" username={username} />;
}
