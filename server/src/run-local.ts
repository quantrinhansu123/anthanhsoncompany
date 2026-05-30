import app from './app';

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Server is running at http://localhost:${port}`);
  if (host === '0.0.0.0') {
    console.log(`  (LAN: http://<IP-máy-này>:${port})`);
  }
});

setInterval(() => {}, 60000);
