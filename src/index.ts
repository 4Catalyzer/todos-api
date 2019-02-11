import db, { Label, LabelInput, Todo, TodoInput } from './db';
import { Filter } from './Utils';

interface GetOptions<TResource> {
  filter?: Filter<TResource>;
}

export class Api {
  getTodo(id: string) {
    if (!id) throw TypeError('Todo id is required');
    return db.getTodo(id);
  }

  getTodos({ filter }: GetOptions<Todo> = {}) {
    return db.getTodos(filter);
  }

  saveTodo(todo: Todo | TodoInput) {
    return 'id' in todo ? db.updateTodo(todo) : db.createTodo(todo);
  }

  getLabel(id: string) {
    if (!id) throw TypeError('Label id is required');
    return db.getLabel(id);
  }

  getLabels({ filter }: GetOptions<Label> = {}) {
    return db.getLabels(filter);
  }

  saveLabel(label: Label | LabelInput) {
    return 'id' in label ? db.updateLabel(label) : db.createLabel(label);
  }
}

export default new Api();
