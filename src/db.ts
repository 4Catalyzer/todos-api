import * as data from './data';
import { Filter, buildFilter, fakeLatency, uuid } from './Utils';

type Uuid = string;
type ISODate = string;

export interface Todo {
  id: Uuid;
  title: string;
  completed: boolean;
  labels: Label[];
  dueDate: ISODate | null;
  completedAt: ISODate | null;
}

export interface TodoInput {
  title: string;
  completed: boolean;
  labels: Label[];
  dueDate: ISODate | null;
  completedAt?: ISODate | null;
}

export interface Label {
  id: Uuid;
  title: string;
  color: string | null;
}

export interface LabelInput {
  title: string;
  color?: string;
}

interface NormalizedTodo {
  id: Uuid;
  title: string;
  completed: boolean;
  labels: string[];
  dueDate: Date | null;
  completedAt: Date | null;
}

const normalizeTodo = (todo: Todo | TodoInput): NormalizedTodo => ({
  ...todo,
  id: 'id' in todo ? todo.id : uuid(),
  completed: todo.completed || false,
  dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
  // eslint-disable-next-line no-nested-ternary
  completedAt: todo.completedAt
    ? new Date(todo.completedAt)
    : todo.completed
    ? new Date()
    : null,
  labels: todo.labels ? todo.labels.map(l => l.id) : [],
});

const resolveTodo = (todo: NormalizedTodo): Todo => ({
  ...todo,
  dueDate: todo.dueDate && todo.dueDate.toISOString(),
  completedAt: todo.completedAt && todo.completedAt.toISOString(),
  // eslint-disable-next-line  @typescript-eslint/no-use-before-define, no-use-before-define
  labels: todo.labels ? todo.labels.map(l => LABELS.get(l)!) : [],
});

const normalizeLabel = (label: Label | LabelInput): Label => ({
  ...label,
  id: 'id' in label ? label.id : uuid(),
  color: label.color || null,
});

const TODOS = new Map<Uuid, NormalizedTodo>(
  data.todos.map(t => [t.id, normalizeTodo(t)] as [string, NormalizedTodo]),
);

const LABELS = new Map<Uuid, Label>(
  data.labels.map(l => [l.id, normalizeLabel(l)] as [string, Label]),
);

export default {
  async createTodo(input: TodoInput): Promise<Todo> {
    const todo = normalizeTodo(input);

    TODOS.set(todo.id, todo);

    await fakeLatency();

    return resolveTodo(todo);
  },

  async updateTodo(nextTodo: Todo): Promise<Todo> {
    TODOS.set(
      nextTodo.id,
      Object.assign(TODOS.get(nextTodo.id), normalizeTodo(nextTodo)),
    );

    await fakeLatency();
    return resolveTodo(TODOS.get(nextTodo.id)!);
  },

  async deleteTodo(todo: Todo): Promise<Uuid> {
    TODOS.delete(todo.id);

    await fakeLatency();
    return todo.id;
  },

  async getTodo(id: Uuid): Promise<null | Todo | Todo[]> {
    await fakeLatency();
    return TODOS.has(id) ? resolveTodo(TODOS.get(id)!) : null;
  },

  async getTodos(filter?: Filter<Todo>): Promise<null | Todo | Todo[]> {
    const filterer = filter && buildFilter(filter);
    await fakeLatency();

    const allTodos = Array.from(TODOS.values(), resolveTodo);

    if (!filterer) return allTodos;

    return allTodos.filter(filterer);
  },

  async createLabel(input: LabelInput): Promise<Label> {
    const label = normalizeLabel(input);
    LABELS.set(label.id, label);

    await fakeLatency();
    return label;
  },

  async updateLabel(nextLabel: Label): Promise<Label> {
    LABELS.set(
      nextLabel.id,
      Object.assign(LABELS.get(nextLabel.id), normalizeLabel(nextLabel)),
    );

    await fakeLatency();
    return { ...LABELS.get(nextLabel.id)! };
  },

  async deleteLabel(label: Label): Promise<Uuid> {
    TODOS.delete(label.id);

    await fakeLatency();
    return label.id;
  },

  async getLabel(id: string): Promise<Label | null> {
    await fakeLatency();
    return LABELS.has(id) ? { ...LABELS.get(id)! } : null;
  },

  async getLabels(filter?: Filter<Label>): Promise<Label[]> {
    const filterer = filter && buildFilter(filter);
    await fakeLatency();

    const allLabels = Array.from(LABELS.values(), l => ({ ...l }));

    if (!filterer) return allLabels;

    return allLabels.filter(filterer);
  },
};
