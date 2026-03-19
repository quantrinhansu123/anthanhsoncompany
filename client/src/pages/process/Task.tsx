import { TaskList } from './TaskList';

export function Task() {
  // Route /quy-trinh/task is now process-oriented:
  // one "quy trinh" (loai_cv) can contain multiple tasks.
  return <TaskList />;
}
