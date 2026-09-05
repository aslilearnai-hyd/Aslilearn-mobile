import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SubNavChips } from '../../../src/components/teacher';
import TeacherAssessmentsView from './AssessmentsView';
import TeacherVideosView from './VideosView';
import HomeworkCreatorView from './HomeworkCreatorView';
import QuizzesView from './QuizzesView';
import OmrResultsView from './OmrResultsView';

type ContentSubTab = 'assessments' | 'videos' | 'homework' | 'quizzes' | 'omr';

const SUB_TABS = [
  { id: 'assessments', label: 'Assessments', shortLabel: 'Assess' },
  { id: 'videos', label: 'Videos', shortLabel: 'Videos' },
  { id: 'homework', label: 'Homework', shortLabel: 'Homework' },
  { id: 'quizzes', label: 'Quizzes', shortLabel: 'Quizzes' },
  { id: 'omr', label: 'Offline Results', shortLabel: 'Offline' },
];

type Props = { initialSubTab?: ContentSubTab };

export default function ContentView({ initialSubTab }: Props) {
  const [subTab, setSubTab] = useState<ContentSubTab>(initialSubTab || 'assessments');

  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

  return (
    // Transparent so AppBackground's artwork shows through.
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <SubNavChips items={SUB_TABS} active={subTab} onChange={(id) => setSubTab(id as ContentSubTab)} />
      {subTab === 'assessments' && <TeacherAssessmentsView />}
      {subTab === 'videos' && <TeacherVideosView />}
      {subTab === 'homework' && <HomeworkCreatorView />}
      {subTab === 'quizzes' && <QuizzesView />}
      {subTab === 'omr' && <OmrResultsView />}
    </View>
  );
}
