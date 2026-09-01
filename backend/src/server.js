import express from 'express';
import cors from 'cors';

const app = express();
const puerto = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/estado', (req, res) => {
  res.json({ estado: 'ok' });
});

app.listen(puerto, () => {
  console.log(`Servidor escuchando en el puerto ${puerto}`);
});
