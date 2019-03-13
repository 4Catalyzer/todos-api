# `todos-api`

A fake, in memory, backend for a todo list server

## Usage

```js
import api from '@4c/todos-api';

await api.getTodos();
```

## Interfaces

### `Todo`

```ts
interface Todo {
  id: UuidString;
  title: string;
  completed: boolean;
  labels: Label[];
  dueDate: ISODateString | null;
  completedAt: ISODateString | null;
}
```

### `TodoInput`

A 'partial' `Todo` for patching, updating, or creating a `Todo`

```ts
interface TodoInput {
  id?: UuidString;
  title: string;
  completed?: boolean = false;
  labels?: Label[];
  dueDate?: ISODateString | null;
  completedAt?: ISODateString | null;
}
```

### `Label`

```ts
export interface Label {
  id: UuidString;
  title: string;
  color: string | null;
}
```

### `LabelInput`

A 'partial' `Label` for patching, updating, or creating a `Label`

```ts
interface LabelInput {
  title: string;
  color?: string;
}
```

## API Documentation

All methods return a `Promise` and resolve after some simulated latency of a few hundred milliseconds.

### `api.getTodo(todoId: UuidString): Promise<Todo | null>`

Returns a single `Todo` object or `null`;

```js
const myTodo = await api.getTodo('25ba9d67-3741-4513-895e-06f33ef6a509');
```

### `api.getTodos(options?: { filter: Filter<Todo> }): Promise<Todo[]>`

Returns an array of `Todo`s optionally filtered by the provided filter (see the filtering docs section);

```js
const allTodos = await api.getTodos();

const completedTodos = await api.getTodos({
  filter: { completed: { $eq: true } },
});
```

### `api.saveTodo(todoInput: TodoInput): Promise<Todo>`

Updates **or** creates a new todo, depending on whether the input as an `id`. Updates
are like `PATCH`s, meaning the input is merged into the existing todo.

```js
const newTodo = await api.saveTodo({ title: 'My todo' });

const updatedTodo = await api.saveTodo({
  ...newTodo,
  completed: true,
});
```

### `api.getLabel(labelId: UuidString): Promise<Label | null>`

Returns a single `Label` object or `null`;

```js
const myLabel = await api.getLabel('25ba9d67-3741-4513-895e-06f33ef6a509');
```

### `api.getLabels(options?: { filter: Filter<Label> } ): Promise<Label[]>`

Returns an array of `Label`s optionally filtered by the provided filter (see: below);

```js
const allLabels = await api.getLabels();

const redLabels = await api.getLabels({
  filter: { color: { $eq: '#ff0000' } },
});
```

### `api.saveLabel(labelInput: LabelInput): Promise<label>`

Updates **or** creates a new label, depending on whether the input as an `id`. Updates
are like `PATCH`s, meaning the input is merged into the existing label.

```js
const newlabel = await api.savelabel({ title: 'My label' });

const updatedlabel = await api.savelabel({
  ...newlabel,
  color: '#ff0000',
});
```

## Filtering

Basic filtering is implemented for API methods that return arrays. The filter
object allows filterings on any of the top-level object properties via a small
set of operators. Below is a contrived example of a filter object:

```js
const filter = {
  name: { $eq: 'John' },
  age: { $gte: 24, $lt: 30 },
};
```

If we applied that filter to the following list:

```js
const people = [
  { name: 'John', age: 18 },
  { name: 'Jane', age: 32 },
  { name: 'John', age: 28 },
  { name: 'John', age: 45 },
];
```

The result would be: `[{ name: 'John', age: 28 }]`

Multiple clauses for a field (eg `age: { $gte: 24, $lte: 30 },`) are currently not supported

### Filter Operators

- `$eq`: returns for properties that are strictly equal (`===`) to the value. **This is case sensitive**
- `$neq`: returns for properties that are strictly **NOT** equal (`!==`) to the value. **This is case sensitive**
- `$lt`: "less than", returns if the value is `<` e.g. `4 < 5`
- `$lte`: "less than or equal to", returns if the value is `<=` e.g. `5 <= 5`
- `$gt`: "greater than", returns if the value is `>` e.g. `5 > 6`
- `$gte`: "greater than or equal to", returns if the value is `>=` e.g. `5 >= 5`
