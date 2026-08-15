## miBOOK

Workspace web app for documents, databases and realtime collaboration.

## Development

```bash
npm install
npm run dev
npm run dev:socket
```

Set `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001` when socket server runs on separate local port.

## Production

```bash
npm run build
npm run start
npm run start:socket
```

App uses SQLite at `MIBOOK_DATA_DIR/mibook.db`. Set `MIBOOK_SECRET` before production use.
