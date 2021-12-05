import { useCallback, useState } from "react";
import { FailableTracker } from "../utils/utils";
import { DetailsSection, Checkbox } from "packard-belle";
import { EllipseAnimation } from "../utils/EllipseAnimation";
interface TrackersListProps {
  sources: string[];
  trackers: Set<FailableTracker>;
}

const LIST_DETAILS_LOCALSTORAGE_KEY = "LIST_DETAILS_LOCALSTORAGE_KEY";
export function TrackersList({ sources, trackers }: TrackersListProps) {
  const [listOpen, setListOpen] = useState(
    Boolean(window.localStorage.getItem(LIST_DETAILS_LOCALSTORAGE_KEY))
  );
  const details = listOpen ? (
    !sources.length ? (
      <div>
        Loading trackers
        <EllipseAnimation />
      </div>
    ) : (
      <>
        {[...trackers].map((tracker) => (
          <div key={tracker.announceUrl}>🟢 {tracker.announceUrl}</div>
        ))}
        {sources.map((source) =>
          [...trackers].some(
            (tracker) => tracker.announceUrl === source
          ) ? null : (
            <div key={source}>🔴 {source}</div>
          )
        )}
      </>
    )
  ) : null;
  const statusIcon = sources.length ? (trackers.size ? "🟢" : "🔴") : "🟠";
  const trackerCount = sources.length
    ? `${trackers.size}/${sources.length}`
    : "";

  return (
    <DetailsSection title={`Trackers: ${statusIcon} ${trackerCount}`}>
      <Checkbox
        id="showTrackers"
        label="Show Details"
        checked={listOpen}
        onChange={useCallback(() => {
          setListOpen(!listOpen);
          window.localStorage.setItem(
            LIST_DETAILS_LOCALSTORAGE_KEY,
            !listOpen ? "true" : ""
          );
        }, [listOpen])}
        key={`checked:${listOpen}`}
      />
      {details}
    </DetailsSection>
  );
}
