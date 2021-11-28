import { Tracker } from "p2pt";

export interface FailableTracker extends Tracker {
  failed: boolean;
}
