/* eslint-disable no-bitwise, no-nested-ternary */

const LATENCY = 200;

export type FilterOperator<T> =
  | { $eq?: T }
  | { $neq: T }
  | { $lte: T }
  | { $lt: T }
  | { $gte: T }
  | { $gt: T };

export type Filter<T> = { [P in keyof T]?: T[P] | FilterOperator<T[P]> };

export function uuid(): string {
  let i, random;
  let id = '';

  for (i = 0; i < 32; i++) {
    random = (Math.random() * 16) | 0;
    if (i === 8 || i === 12 || i === 16 || i === 20) id += '-';
    id += (i === 12 ? 4 : i === 16 ? (random & 3) | 8 : random).toString(16);
  }

  return id;
}

export const buildFilter = <T>(filter: Filter<T>) => {
  const entries = Object.entries(filter).filter(e => e[1] != null);

  return (item: T) =>
    entries.reduce((include, [key, value]) => {
      if (!include) return false;

      const itemValue = (item as any)[key];

      if (value == null || typeof value !== 'object') {
        return itemValue === value;
      }

      if ('$eq' in value) return itemValue === value.$eq;
      if ('$neq' in value) return itemValue !== value.$neq;
      if ('$lt' in value) return itemValue < value.$lt;
      if ('$lte' in value) return itemValue <= value.$lte;
      if ('$gt' in value) return itemValue > value.$gt;
      if ('$gte' in value) return itemValue >= value.$gte;
      return include;
    }, true);
};

export const fakeLatency = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, LATENCY));
