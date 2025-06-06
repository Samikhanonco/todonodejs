const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  throw new Error('MONGODB_URI environment variable is not set!');
}
mongoose.connect(mongoURI);
mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

// Schema and Models
const todoSchema = new mongoose.Schema({
  name: String,
  date: String
}, { timestamps: true });

const Todo = mongoose.model('Todo', todoSchema);
const CompletedTodo = mongoose.model('CompletedTodo', todoSchema); // reuse schema

// Date formatting function
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

// GET all todos
app.get('/todos', async (req, res) => {
  try {
    const todos = await Todo.find();
    const formatted = todos.map(todo => ({
      ...todo.toObject(),
      date: todo.date ? todo.date : formatDate(todo.createdAt) // always dd/mm/yy
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// ADD todo
app.post('/addtodo', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const newTodo = new Todo({ name, date: formatDate(new Date()) }); // set date
    await newTodo.save();
    res.json(newTodo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add todo' });
  }
});

// DELETE a todo and move to completed
app.delete('/deletetodo/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const todo = await Todo.findById(id);
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    const completed = new CompletedTodo({
      name: todo.name,
      date: formatDate(new Date())
    });
    await completed.save();

    await Todo.findByIdAndDelete(id);

    res.json({ message: 'Task completed and moved.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete and delete task' });
  }
});

// GET completed tasks
app.get('/completedtasks', async (req, res) => {
  try {
    const completed = await CompletedTodo.find();
    const formatted = completed.map(todo => ({
      ...todo.toObject(),
      date: todo.date ? todo.date : formatDate(todo.createdAt) // always dd/mm/yy
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch completed tasks' });
  }
});

// DELETE /completedtasks/:id
app.delete('/completedtasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const found = await CompletedTodo.findById(id);
    if (!found) {
      return res.status(404).json({ message: 'Task not found' });
    }
    await CompletedTodo.findByIdAndDelete(id);
    res.status(200).json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

app.get('/', (req, res) => {
  res.status(200).send('Landing page for Todo API');
});
app.get('/about', (req, res) => {
  res.status(200).send('About Page for Todo API');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
