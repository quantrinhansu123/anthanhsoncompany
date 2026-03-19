import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api', routes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// Diagnostic interval to keep process alive
setInterval(() => {
  // console.log('Keep alive check...');
}, 60000);
