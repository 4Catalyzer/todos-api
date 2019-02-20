/* eslint-disable no-bitwise, no-nested-ternary */

const LATENCY = 200;
export type FilterOperator<T> = {
  $eq?: T;
  $neq?: T;
  $lte?: T;
  $lt?: T;
  $gte?: T;
  $gt?: T;
};

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

const isDate = (d: any): d is Date => !!(d && d.getTime);

const isDateString = (d: any): d is string =>
  typeof d === 'string' && !isNaN(Date.parse(d));

const isOperator = (v: any): v is FilterOperator<any> =>
  v && typeof v === 'object';

export const buildFilter = <T>(filter: Filter<T>) => {
  const entries = Object.entries(filter).filter(e => e[1] != null);

  return (item: T) =>
    entries.reduce((include, [key, value]) => {
      if (!include) return false;

      let itemValue = (item as any)[key];
      const operators = isOperator(value)
        ? Object.entries(value)
        : ['$eq', value];

      return operators.every(([operator, opValue]) => {
        if (isDate(opValue) || isDateString(itemValue)) {
          itemValue = itemValue && new Date(itemValue);
        }

        if (operator !== '$eq' && operator !== '$neq') {
          if (itemValue == null) return false;
        }

        switch (operator) {
          case '$eq':
            return itemValue === opValue;
          case '$neq':
            return itemValue !== opValue;
          case '$lt':
            return itemValue < opValue;
          case '$lte':
            return itemValue <= opValue;
          case '$gt':
            return itemValue > opValue;
          case '$gte':
            return itemValue >= opValue;
          default:
            return include;
        }
      });
    }, true);
};

export const fakeLatency = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, LATENCY));
