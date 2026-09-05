import React, { memo } from 'react';
import GlassCard from '../../../../src/components/student/GlassCard';
import DigitalLibraryBrowseSection from '../../../../src/components/student/DigitalLibraryBrowseSection';

interface DigitalLibraryModuleProps {
  onPressLibrary?: () => void;
  dark?: boolean;
}

function DigitalLibraryModuleComponent({ dark }: DigitalLibraryModuleProps) {
  return (
    <GlassCard variant="glass" padding={14}>
      <DigitalLibraryBrowseSection returnTo="learning" dark={dark} />
    </GlassCard>
  );
}

export default memo(DigitalLibraryModuleComponent);
