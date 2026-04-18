/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as calendars from "../calendars.js";
import type * as homework from "../homework.js";
import type * as ical from "../ical.js";
import type * as lessons from "../lessons.js";
import type * as misc from "../misc.js";
import type * as notes from "../notes.js";
import type * as study from "../study.js";
import type * as tasks from "../tasks.js";
import type * as userSettings from "../userSettings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  calendars: typeof calendars;
  homework: typeof homework;
  ical: typeof ical;
  lessons: typeof lessons;
  misc: typeof misc;
  notes: typeof notes;
  study: typeof study;
  tasks: typeof tasks;
  userSettings: typeof userSettings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
