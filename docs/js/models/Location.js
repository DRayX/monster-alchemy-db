// @ts-check

/**
 * Domain model representing a discovered zone, landmark, or region from `DT_Locations`.
 */
export class Location {
  /**
   * @param {object} params
   * @param {string} params.id Canonical location identifier (row name in DT_Locations).
   * @param {string} [params.name] Localized display name.
   */
  constructor({ id, name }) {
    /** @type {string} Canonical location identifier. */
    this.id = id;
    /** @type {string} Localized display name. */
    this.name = name || id;
  }
}
