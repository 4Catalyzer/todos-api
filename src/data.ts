// @ts-ignore
import dates from 'date-arithmetic';

import { uuid } from './Utils';

const now = new Date();
const startOfWeek = dates.startOf(now, 'week');
const startOfLastWeek = dates.startOf(dates.add(now, -1, 'week'), 'week');

const labels = [
  {
    id: uuid(),
    title: 'Blocked',
    color: null,
  },
  {
    id: uuid(),
    title: 'Tech Debt',
    color: null,
  },
  {
    id: uuid(),
    title: 'Bug',
    color: null,
  },
  {
    id: uuid(),
    title: 'Feature',
    color: null,
  },
  {
    id: uuid(),
    title: 'Upstream',
    color: null,
  },
];

const todos = [
  {
    id: uuid(),
    title: 'Fix Flummox overheating',
    labels: [labels[2]],
    dueDate: null,
    completed: false,
  },
  {
    id: uuid(),
    title: 'Add Whatitz analytics',
    labels: [labels[0], labels[4]],
    dueDate: null,
    completed: false,
  },
  {
    id: uuid(),
    title: 'Wax Ventricals',
    labels: [],
    dueDate: null,
    completed: true,
    completedAt: dates.add(now, -1, 'day').toISOString(),
  },
  {
    id: uuid(),
    title: 'Prevent explosions',
    labels: [],
    dueDate: null,
    completed: true,
    completedAt: dates.add(startOfWeek, -3, 'day').toISOString(),
  },
  {
    id: uuid(),
    title: 'Bowline Gimbels',
    labels: [labels[0]],
    dueDate: null,
    completed: true,
    completedAt: dates.add(now, -10, 'day').toISOString(),
  },
  {
    id: uuid(),
    title: 'Recipricate Splines',
    labels: [],
    dueDate: null,
    completed: true,
    completedAt: dates.add(now, -8, 'day').toISOString(),
  },
  {
    id: uuid(),
    title: 'Get pistons detailed',
    labels: [],
    dueDate: null,
    completed: true,
    completedAt: dates.add(startOfWeek, -2, 'day').toISOString(),
  },
  {
    id: uuid(),
    title: 'Harness Core',
    labels: [labels[2]],
    dueDate: null,
    completed: true,
    completedAt: dates.add(now, -15, 'day').toISOString(),
  },
  {
    id: uuid(),
    title: 'Calibrate torques',
    labels: [],
    dueDate: null,
    completed: true,
    completedAt: dates.add(now, -17, 'day').toISOString(),
  },
  {
    id: uuid(),
    title: 'Recalibrate Floozel',
    labels: [labels[1]],
    dueDate: null,
    completed: true,
    completedAt: dates.add(startOfLastWeek, -20, 'day').toISOString(),
  },
];

export { todos, labels };
