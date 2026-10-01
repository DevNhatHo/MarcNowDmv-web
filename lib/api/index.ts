/**
 * The API boundary's public surface. Screens import from here so no component reaches
 * past the client into request construction or parsing.
 */
export { fetchAlerts, type AlertQuery } from "./alerts";
export { fetchDepartures, type DepartureQuery } from "./departures";
export { fetchRoutes, fetchStops, type CatalogQuery, type StopQuery } from "./catalogs";
export { defaultTimeoutMs, type RequestOptions } from "./client";
export {
  BackendError,
  errorCode,
  httpStatus,
  isAborted,
  isBackendError,
  isVersionConflict,
  type Failure,
} from "./errors";
export { fetchHealth, probeHealth } from "./health";
export { defaultLimit, maxLimit } from "./limits";
export {
  collectPages,
  defaultMaxPages,
  type Collected,
  type Continuation,
} from "./pagination";
export { backendPaths } from "./paths";
export {
  fetchTrainDetail,
  fetchTrains,
  type TrainDetailQuery,
  type TrainListQuery,
} from "./trains";
