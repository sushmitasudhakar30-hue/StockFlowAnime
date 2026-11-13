/** Atomic auto-increment numbers (SO-1007, PO-2006 …) backed by the "counters" collection. */
import Counter from '../models/Counter.js';

/**
 * @param key          counter name, e.g. 'salesOrder'
 * @param highestUsed  async fn → highest number already used (only called the first time the counter is created)
 */
export async function nextSequence(key, highestUsed) {
  let counter = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { new: true });
  if (counter) return counter.seq;

  const start = (await highestUsed()) + 1;
  try {
    counter = await Counter.create({ _id: key, seq: start });
    return counter.seq;
  } catch (err) {
    if (err.code !== 11000) throw err;
    // someone else created the counter at the same moment → just increment it
    counter = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { new: true });
    return counter.seq;
  }
}
