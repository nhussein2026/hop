import { taskService } from '../services/task.service.js';

const task = taskService.create({
  title: 'Build Hop Task persistence',
  description: 'Verify Task → Repository → SQLite works correctly.',
  priority: 'high',
  estimatedMinutes: 45,
});

console.log('\nCreated task:');
console.log(task);

console.log('\nAll tasks:');
console.log(taskService.getAll());

console.log('\nFind by ID:');
console.log(taskService.getById(task.id));