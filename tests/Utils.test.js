import { buildFilter } from '../src/Utils';

describe('buildFilter', () => {
  it('should filter by property', () => {
    const filter = buildFilter({
      completed: { $eq: true },
    });

    expect([{ completed: false }, { completed: true }].filter(filter)).toEqual(
      [{ completed: true }],
    );
  });

  it('should return nothing when the type is wrong', () => {
    const filter = buildFilter({
      completed: { $eq: 'string' },
    });

    expect([{ completed: false }, { completed: true }].filter(filter)).toEqual(
      [],
    );
  });

  it('should work with dates', () => {
    const filter = buildFilter({
      completedAt: { $gt: new Date('2019-02-05T12:50:00.000Z') },
    });

    expect(
      [
        { completedAt: '2019-02-05T10:50:00.000Z' },
        { completedAt: '2019-02-07T12:50:00.000Z' },
      ].filter(filter),
    ).toEqual([{ completedAt: '2019-02-07T12:50:00.000Z' }]);
  });

  it('should not filter absent values for comparision operators', () => {
    const filter = buildFilter({
      completedAt: { $lt: new Date('2019-02-05T12:50:00.000Z') },
    });

    expect(
      [
        { completedAt: null },
        { completedAt: '2019-02-05T10:50:00.000Z' },
        { completedAt: '2019-02-07T12:50:00.000Z' },
      ].filter(filter),
    ).toEqual([{ completedAt: '2019-02-05T10:50:00.000Z' }]);
  });

  it('should filter by multiple properties', () => {
    const filter = buildFilter({
      completed: { $eq: true },
      number: { $lte: 4 },
    });

    expect(
      [
        { completed: false, number: 4 },
        { completed: true, number: 2 },
        { completed: true, number: 7 },
      ].filter(filter),
    ).toEqual([{ completed: true, number: 2 }]);
  });

  it('should handle multiple operators', () => {
    const filter = buildFilter({
      number: { $gt: 4, $lte: 8 },
    });

    expect(
      [
        { number: 4 },
        { number: 8 },
        { number: 7 },
        { number: 10 },
        { number: 1 },
        { number: 15 },
      ].filter(filter),
    ).toEqual([{ number: 8 }, { number: 7 }]);
  });

  //
  [
    ['$eq', 4, 4, 5],
    ['$neq', 4, 5, 4],
    ['$lt', 4, 3, 5],
    ['$lte', 4, 4, 5],
    ['$gt', 4, 7, 2],
    ['$gte', 4, 4, 2],
  ].forEach(([operator, filterValue, matchValue, notMatchValue]) => {
    it(`should work for operator: "${operator}"`, () => {
      const filter = buildFilter({
        foo: { [operator]: filterValue },
      });

      expect(
        [{ foo: notMatchValue }, { foo: matchValue }].filter(filter),
      ).toEqual([{ foo: matchValue }]);
    });
  });
});
