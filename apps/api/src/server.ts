import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 4321);

const server = createServer((_request, response) => {
  response.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8'
  });

  response.end(
    JSON.stringify({
      name: 'Hop API',
      status: 'ok'
    })
  );
});

server.listen(port, () => {
  console.log(`Hop API running on http://localhost:${port}`);
});