import { FailableTracker, useOnKeyDown } from "../utils/utils";
import { DetailsSection, Window } from "packard-belle";
import { EllipseAnimation } from "../utils/EllipseAnimation";
interface TrackersListProps {
  sources: string[];
  trackers: Set<FailableTracker>;
  onClose: () => void;
}

export function TrackersList({
  sources,
  trackers,
  onClose,
}: TrackersListProps) {
  useOnKeyDown("Escape", onClose);
  const details = !sources.length ? (
    <div>
      Loading trackers
      <EllipseAnimation />
    </div>
  ) : (
    <>
      {[...trackers].map((tracker) => (
        <div style={{ padding: "2px" }} key={tracker.announceUrl}>
          🟢 {tracker.announceUrl}
        </div>
      ))}
      {sources.map((source) =>
        [...trackers].some(
          (tracker) => tracker.announceUrl === source
        ) ? null : (
          <div style={{ padding: "2px" }} key={source}>
            🔴 {source}
          </div>
        )
      )}
    </>
  );
  const statusIcon = sources.length ? (trackers.size ? "🟢" : "🔴") : "🟠";
  const trackerCount = sources.length
    ? `${trackers.size}/${sources.length}`
    : "";

  return (
    <div className="modal">
      <Window
        title={`Tracker Information`}
        resizable={false}
        className="window"
        onClose={onClose}
      >
        <DetailsSection title={`Trackers: ${statusIcon} ${trackerCount}`}>
          {details}
        </DetailsSection>
      </Window>
    </div>
  );
}
