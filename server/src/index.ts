import app from './app';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// Diagnostic interval to keep process alive (local dev only)
setInterval(() => {
  // console.log('Keep alive check...');
}, 60000);
