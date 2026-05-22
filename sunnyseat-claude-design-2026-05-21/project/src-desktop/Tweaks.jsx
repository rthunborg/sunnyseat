// Tweaks panel for desktop.
function AppTweaks({
  showOnboarding, setShowOnboarding,
  showPlanner, setShowPlanner,
  hour, setHour,
}) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Time of day">
        <TweakSlider
          label="Hour"
          min={6} max={21} step={1}
          value={Math.round(hour)}
          onChange={setHour}
          unit=":00"
        />
      </TweakSection>

      <TweakSection label="Show overlay">
        <TweakButton label="Onboarding" onClick={() => setShowOnboarding(true)}/>
        <TweakButton label="Planner" onClick={() => setShowPlanner(true)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

window.AppTweaks = AppTweaks;
