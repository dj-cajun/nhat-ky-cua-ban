import { useState } from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { HomePage } from '@/pages/home';
import { OnboardingPage } from '@/pages/onboarding';

function AppContent() {
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem('onboarding_complete') === 'true',
  );

  if (!onboarded) {
    return <OnboardingPage onComplete={() => setOnboarded(true)} />;
  }

  return <HomePage />;
}

export function App() {
  return (
    <JotaiProvider>
      <AppContent />
    </JotaiProvider>
  );
}
