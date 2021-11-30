import { Tracker } from "p2pt";

export interface FailableTracker extends Tracker {
  failed: boolean;
}

export const TRADE_REQUEST_MESSAGE = "tradeRequest";
