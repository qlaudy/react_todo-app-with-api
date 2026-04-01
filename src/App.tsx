/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import { createTodo, getTodos, removeTodoApi, updateTodoApi, USER_ID } from './api/todos';
import { Todo } from './types/Todo';

export const App: React.FC = () => {
  if (!USER_ID) {
    return <UserWarning />;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [todos, setTodos] = useState<Todo[]>([]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [filter, setFilter] = useState('all');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [query, setQuery] = useState('');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [updatingIds, setUpdatingIds] = useState<number[]>([]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [newTitle, setNewTitle] = useState('');

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const todoFieldRef = useRef<HTMLInputElement>(null);

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage(null);
    }, 3000);
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setIsLoading(true);

    getTodos()
      .then(setTodos)
      .catch(() => showError('Unable to load todos'));

    todoFieldRef.current?.focus();
  }, []);

  const visibleTodos = todos.filter(todo => {
    if (filter === 'active') {
      return !todo.completed;
    }

    if (filter === 'completed') {
      return todo.completed;
    }

    return true;
  });

  const activeTodosCount = todos.filter(todo => !todo.completed).length;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setErrorMessage('Title should not be empty');

      return;
    }

    setErrorMessage(null);
    setTempTodo({
      id: 0,
      title: trimmedQuery,
      completed: false,
      userId: USER_ID,
    });

    setIsLoading(true);

    createTodo({ title: trimmedQuery, userId: USER_ID, completed: false })
      .then((todoFromServer: Todo) => {
        setTodos(prev => [...prev, todoFromServer]);
        setQuery('');
      })
      .catch(() => {
        showError('Unable to add a todo');
      })
      .finally(() => {
        setIsLoading(false);
        setTempTodo(null);

        todoFieldRef.current?.focus();
      });
  };

  const deleteTodo = (todoId: number) => {
    setErrorMessage(null);
    setDeletingIds(prev => [...prev, todoId]);

    return removeTodoApi(todoId)
      .then(() => {
        setTodos(prev => prev.filter(t => t.id !== todoId));
      })
      .catch(() => {
        showError('Unable to delete a todo');
      })
      .finally(() => {
        setDeletingIds(prev => prev.filter(id => id !== todoId));
        todoFieldRef.current?.focus();
      });
  };

  const clearCompleted = () => {
    const completedTodos = todos.filter(todo => todo.completed);
    const promises = completedTodos.map(todo => deleteTodo(todo.id));

    Promise.all(promises).catch(() => {
      setErrorMessage('Unable to delete some todos');
    });
  };

  const toggleTodo = (todo: Todo) => {
    setUpdatingIds(prev => [...prev, todo.id]);

    updateTodoApi(todo.id, { completed: !todo.completed })
      .then(updatedTodo => {
        setTodos(prev => prev.map(t => (t.id === todo.id ? updatedTodo : t)));
      })
      .catch(() => {
        showError('Unable to update a todo');
      })
      .finally(() => {
        setUpdatingIds(prev => prev.filter(id => id !== todo.id));
      });
  };

  const toggleAll = () => {
    const areAllCompleted = todos.every(todo => todo.completed);
    const newStatus = !areAllCompleted;

    const todosToUpdate = todos.filter(todo => todo.completed !== newStatus);

    const promises = todosToUpdate.map(todo => {
      setUpdatingIds(prev => [...prev, todo.id]);

      return updateTodoApi(todo.id, { completed: newStatus })
        .then(updateTodo => {
          setTodos(prev => prev.map(t => (t.id === todo.id ? updateTodo : t)));
        })
        .catch(() => {
          showError('Unable to update a todo');
        })
        .finally(() => {
          setUpdatingIds(prev => prev.filter(id => id !== todo.id));
        });
    });

    Promise.all(promises);
  };

  const saveEditedTodo = () => {
    if (!editingTodo) {
      return;
    }

    const trimmedTitle = newTitle.trim();

    if (trimmedTitle === editingTodo.title) {
      setEditingTodo(null);

      return;
    }

    if (!trimmedTitle) {
      deleteTodo(editingTodo.id);
      setEditingTodo(null);

      return;
    }

    setUpdatingIds(prev => [...prev, editingTodo.id]);

    updateTodoApi(editingTodo.id, { title: trimmedTitle })
      .then(updatedTodo => {
        setTodos(prev =>
          prev.map(t => (t.id === editingTodo.id ? updatedTodo : t)),
        );
        setEditingTodo(null);
      })
      .catch(() => {
        showError('Unable to update a todo');
      })
      .finally(() => {
        setUpdatingIds(prev => prev.filter(id => id !== editingTodo.id));
      });
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          <button
            type="button"
            className={`todoapp__toggle-all ${todos.every(todo => todo.completed) ? 'active' : ''}`}
            data-cy="ToggleAllButton"
            onClick={toggleAll}
          />

          {/* Add a todo on form submit */}
          <form onSubmit={handleSubmit}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              autoFocus
              value={query}
              onChange={event => setQuery(event.target.value)}
              disabled={isLoading || !!tempTodo}
            />
          </form>
        </header>

        {(todos.length > 0 || tempTodo) && (
          <section className="todoapp__main" data-cy="TodoList">
            {/* This is a completed todo */}
            {visibleTodos.map(todo => (
              <div
                key={todo.id}
                data-cy="Todo"
                className={`todo ${todo.completed ? 'completed' : ''}`}
              >
                <label className="todo__status-label">
                  <input
                    data-cy="TodoStatus"
                    type="checkbox"
                    className="todo__status"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo)}
                  />
                </label>

                <span
                  data-cy="TodoTitle"
                  className="todo__title"
                  onDoubleClick={() => {
                    setEditingTodo(todo);
                    setNewTitle(todo.title);
                  }}
                >
                  {editingTodo?.id === todo.id ? (
                    <form
                      onSubmit={event => {
                        event.preventDefault();
                        saveEditedTodo();
                      }}
                    >
                      <input
                        data-cy="TodoTitleField"
                        type="text"
                        className="todo__title-field"
                        autoFocus
                        value={newTitle}
                        onBlur={saveEditedTodo}
                        onChange={event => setNewTitle(event.target.value)}
                        onKeyUp={event => {
                          if (event.key === 'Escape') {
                            setEditingTodo(null);
                            setNewTitle(editingTodo.title);
                          }
                        }}
                      />
                    </form>
                  ) : (
                    todo.title
                  )}
                </span>

                {/* Remove button appears only on hover */}
                <button
                  type="button"
                  className="todo__remove"
                  data-cy="TodoDelete"
                  onClick={() => deleteTodo(todo.id)}
                >
                  ×
                </button>

                {/* overlay will cover the todo while it is being deleted or updated */}
                <div
                  data-cy="TodoLoader"
                  className={`modal overlay ${deletingIds.includes(todo.id) || updatingIds.includes(todo.id) ? 'is-active' : ''}`}
                >
                  <div className="modal-background has-background-white-ter" />
                  <div className="loader" />
                </div>
              </div>
            ))}

            {tempTodo && (
              <div data-cy="Todo" className="todo">
                <label className="todo__status-label">
                  <input
                    data-cy="TodoStatus"
                    type="checkbox"
                    className="todo__status"
                    checked={false}
                    readOnly
                  />
                </label>

                <span data-cy="TodoTitle" className="todo__title">
                  {tempTodo.title}
                </span>

                {/* Remove button appears only on hover */}
                <button
                  type="button"
                  className="todo__remove"
                  data-cy="TodoDelete"
                  disabled
                >
                  ×
                </button>

                {/* overlay will cover the todo while it is being deleted or updated */}
                <div data-cy="TodoLoader" className="modal overlay is-active">
                  <div className="modal-background has-background-white-ter" />
                  <div className="loader" />
                </div>
              </div>
            )}
          </section>
        )}

        {/* Hide the footer if there are no todos */}

        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {activeTodosCount} items left
            </span>

            {/* Active link should have the 'selected' class */}
            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={`filter__link ${filter === 'all' ? 'selected' : ''}`}
                data-cy="FilterLinkAll"
                onClick={() => setFilter('all')}
              >
                All
              </a>

              <a
                href="#/active"
                className={`filter__link ${filter === 'active' ? 'selected' : ''}`}
                data-cy="FilterLinkActive"
                onClick={() => setFilter('active')}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={`filter__link ${filter === 'completed' ? 'selected' : ''}`}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilter('completed')}
              >
                Completed
              </a>
            </nav>

            {/* this button should be disabled if there are no completed todos */}
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!todos.some(todo => todo.completed)}
              onClick={clearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        data-cy="ErrorNotification"
        className={`notification is-danger is-light ${!errorMessage ? 'hidden' : ''}`}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage(null)}
        />
        {/* show only one message at a time */}
        {errorMessage}
      </div>
    </div>
  );
};
