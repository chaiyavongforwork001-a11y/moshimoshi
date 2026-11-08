/**
 * Server pieces that arrive with a later migration. Each starts off and is switched on by the
 * first load that finds it, so the app keeps working on a database that hasn't caught up yet.
 */
export const features = {
  /** prompt_sames (20261108000003_live_reactions.sql): "เหมือนกัน!" on profile stories reaches their owner */
  promptSames: false,
}
